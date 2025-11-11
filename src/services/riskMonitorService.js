/**
 * Risk Monitor Service
 * 风险监控服务 - 提供 CCR 账户的风险评估和监控功能
 */

const logger = require('../utils/logger')
const redis = require('../models/redis')
const ccrAccountService = require('./ccrAccountService')
const riskScorer = require('../utils/riskScorer')

// LRU 缓存配置
const LRU = require('lru-cache')
const riskCache = new LRU({
  max: 100, // 最多缓存 100 个账户的评分
  ttl: 5 * 60 * 1000 // 5 分钟有效期
})

/**
 * 获取账户当前使用量
 * @param {String} accountId - 账户 ID
 * @param {Object} account - 账户配置
 * @returns {Object} 使用量数据
 */
async function getAccountUsage(accountId, account) {
  try {
    const now = Date.now()
    const sessionWindowHours = parseFloat(account.sessionWindowHours) || 1
    const windowStartTime = now - sessionWindowHours * 60 * 60 * 1000

    // 获取会话窗口内的请求数
    const requestsInWindow = await redis.getAccountSessionWindowUsage(accountId, windowStartTime)

    // 获取今日费用
    const today = new Date().toISOString().split('T')[0]
    const dailyCost = await redis.getAccountDailyCost(accountId, today)

    // 获取当前并发数（从 Redis Sorted Set）
    const concurrencyKey = `concurrency:${accountId}`
    const concurrentRequests = await redis.zcount(concurrencyKey, now, '+inf')

    return {
      requestsInWindow: parseInt(requestsInWindow) || 0,
      costToday: parseFloat(dailyCost) || 0,
      concurrentRequests: parseInt(concurrentRequests) || 0
    }
  } catch (error) {
    logger.error(`Error getting account usage for ${accountId}:`, error)
    return {
      requestsInWindow: 0,
      costToday: 0,
      concurrentRequests: 0
    }
  }
}

/**
 * 获取单个账户的风险评分
 * @param {String} accountId - 账户 ID
 * @param {Object} options - 选项
 * @param {Boolean} options.useCache - 是否使用缓存（默认 true）
 * @returns {Object} 风险评分结果
 */
async function getAccountRiskScore(accountId, options = {}) {
  const { useCache = true } = options

  try {
    // 检查缓存
    if (useCache) {
      const cached = riskCache.get(accountId)
      if (cached) {
        logger.debug(`Risk score cache hit for account ${accountId}`)
        return cached
      }
    }

    // 获取账户配置
    const account = await ccrAccountService.getAccount(accountId)
    if (!account) {
      throw new Error('Account not found')
    }

    // 获取当前使用量
    const usage = await getAccountUsage(accountId, account)

    // 计算风险评分
    const riskAssessment = riskScorer.assessRisk(account, usage)

    // 构建结果
    const result = {
      accountId: account.id,
      accountName: account.name,
      provider: account.provider || '',
      priority: account.priority || 50,
      ...riskAssessment
    }

    // 缓存结果
    if (useCache) {
      riskCache.set(accountId, result)
    }

    return result
  } catch (error) {
    logger.error(`Error getting risk score for account ${accountId}:`, error)
    throw error
  }
}

/**
 * 获取所有 CCR 账户的风险概览
 * @param {Object} filters - 过滤条件
 * @param {String} filters.provider - 提供商过滤
 * @param {String} filters.riskLevel - 风险等级过滤 (low/medium/high/critical)
 * @param {String} filters.sortBy - 排序字段 (riskScore/costToday/requestsInWindow)
 * @returns {Object} 风险概览数据
 */
async function getAllAccountsRiskOverview(filters = {}) {
  const { provider, riskLevel, sortBy = 'riskScore' } = filters

  try {
    // 获取所有 CCR 账户
    const allAccounts = await ccrAccountService.getAllAccounts()

    if (!allAccounts || allAccounts.length === 0) {
      return {
        summary: {
          totalAccounts: 0,
          lowRisk: 0,
          mediumRisk: 0,
          highRisk: 0,
          criticalRisk: 0
        },
        accounts: []
      }
    }

    // 并行获取所有账户的风险评分
    const riskScorePromises = allAccounts.map((account) =>
      getAccountRiskScore(account.id).catch((error) => {
        logger.error(`Error getting risk score for ${account.id}:`, error)
        return null
      })
    )

    const riskScores = (await Promise.all(riskScorePromises)).filter((score) => score !== null)

    // 应用过滤器
    let filteredAccounts = riskScores

    if (provider) {
      filteredAccounts = filteredAccounts.filter(
        (acc) => acc.provider && acc.provider.toLowerCase() === provider.toLowerCase()
      )
    }

    if (riskLevel) {
      filteredAccounts = filteredAccounts.filter((acc) => acc.riskLevel === riskLevel.toLowerCase())
    }

    // 排序
    filteredAccounts.sort((a, b) => {
      if (sortBy === 'riskScore') {
        return b.riskScore - a.riskScore // 降序
      } else if (sortBy === 'costToday') {
        return b.currentUsage.costToday - a.currentUsage.costToday
      } else if (sortBy === 'requestsInWindow') {
        return b.currentUsage.requestsInWindow - a.currentUsage.requestsInWindow
      }
      return 0
    })

    // 统计摘要
    const summary = {
      totalAccounts: riskScores.length,
      lowRisk: riskScores.filter((acc) => acc.riskLevel === 'low').length,
      mediumRisk: riskScores.filter((acc) => acc.riskLevel === 'medium').length,
      highRisk: riskScores.filter((acc) => acc.riskLevel === 'high').length,
      criticalRisk: riskScores.filter((acc) => acc.riskLevel === 'critical').length
    }

    return {
      summary,
      accounts: filteredAccounts
    }
  } catch (error) {
    logger.error('Error getting all accounts risk overview:', error)
    throw error
  }
}

/**
 * 清除风险评分缓存
 * @param {String} accountId - 账户 ID（可选，不提供则清除所有）
 */
function clearRiskCache(accountId = null) {
  if (accountId) {
    riskCache.delete(accountId)
    logger.debug(`Cleared risk cache for account ${accountId}`)
  } else {
    riskCache.clear()
    logger.debug('Cleared all risk cache')
  }
}

module.exports = {
  getAccountRiskScore,
  getAllAccountsRiskOverview,
  clearRiskCache
}
