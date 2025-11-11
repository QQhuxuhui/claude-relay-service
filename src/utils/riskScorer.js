/**
 * Risk Scoring Utility for CCR Accounts
 * 风险评分工具 - 用于评估 CCR 账户的风险状态
 *
 * 评分算法:
 * - 并发利用率 (40%): currentConcurrency / maxConcurrentTasks
 * - 窗口使用率 (35%): requestsInWindow / maxRequestsPerWindow
 * - 费用趋势评分 (25%): costToday / maxCostPerDay
 *
 * 风险等级:
 * - 0-30: low (低风险)
 * - 31-60: medium (中风险)
 * - 61-80: high (高风险)
 * - 81-100: critical (极高风险)
 */

const logger = require('./logger')

// 风险因素权重
const WEIGHTS = {
  concurrency: 0.4, // 并发利用率权重
  window: 0.35, // 窗口使用率权重
  cost: 0.25 // 费用趋势权重
}

// 风险等级阈值
const RISK_LEVELS = {
  low: { min: 0, max: 30, label: 'low', color: 'green' },
  medium: { min: 31, max: 60, label: 'medium', color: 'yellow' },
  high: { min: 61, max: 80, label: 'high', color: 'orange' },
  critical: { min: 81, max: 100, label: 'critical', color: 'red' }
}

/**
 * 计算风险评分
 * @param {Object} account - 账户配置
 * @param {Object} usage - 当前使用量
 * @returns {Object} 风险评分结果
 */
function calculateRiskScore(account, usage) {
  try {
    // 提取账户配置
    const maxConcurrentTasks = account.maxConcurrentTasks || 0
    const maxRequestsPerWindow = parseInt(account.maxRequestsPerWindow) || 0
    const maxCostPerDay = parseFloat(account.maxCostPerDay) || 0

    // 提取使用量
    const currentConcurrency = usage.concurrentRequests || 0
    const requestsInWindow = usage.requestsInWindow || 0
    const costToday = usage.costToday || 0

    // 计算各项利用率 (0-1)
    const concurrencyUtilization =
      maxConcurrentTasks > 0 ? currentConcurrency / maxConcurrentTasks : 0
    const windowUsageRatio = maxRequestsPerWindow > 0 ? requestsInWindow / maxRequestsPerWindow : 0
    const costTrendScore = maxCostPerDay > 0 ? costToday / maxCostPerDay : 0

    // 计算加权评分 (0-100)
    let riskScore = 0
    let activeFactors = 0

    if (maxConcurrentTasks > 0) {
      riskScore += concurrencyUtilization * 100 * WEIGHTS.concurrency
      activeFactors += WEIGHTS.concurrency
    }

    if (maxRequestsPerWindow > 0) {
      riskScore += windowUsageRatio * 100 * WEIGHTS.window
      activeFactors += WEIGHTS.window
    }

    if (maxCostPerDay > 0) {
      riskScore += costTrendScore * 100 * WEIGHTS.cost
      activeFactors += WEIGHTS.cost
    }

    // 归一化评分（如果某些因素未配置）
    if (activeFactors > 0 && activeFactors < 1) {
      riskScore = riskScore / activeFactors
    }

    // 确保评分在 0-100 范围内
    riskScore = Math.min(100, Math.max(0, Math.round(riskScore)))

    // 确定风险等级
    const riskLevel = getRiskLevel(riskScore)

    // 返回评分结果
    return {
      riskScore,
      riskLevel: riskLevel.label,
      factors: {
        concurrencyUtilization: parseFloat(concurrencyUtilization.toFixed(2)),
        windowUsageRatio: parseFloat(windowUsageRatio.toFixed(2)),
        costTrendScore: parseFloat(costTrendScore.toFixed(2))
      },
      currentUsage: {
        requestsInWindow,
        maxRequestsPerWindow,
        costToday: parseFloat(costToday.toFixed(2)),
        maxCostPerDay,
        concurrentRequests: currentConcurrency,
        maxConcurrentTasks
      }
    }
  } catch (error) {
    logger.error('Error calculating risk score:', error)
    // 返回默认的安全评分
    return {
      riskScore: 0,
      riskLevel: 'low',
      factors: {
        concurrencyUtilization: 0,
        windowUsageRatio: 0,
        costTrendScore: 0
      },
      currentUsage: {
        requestsInWindow: 0,
        maxRequestsPerWindow: 0,
        costToday: 0,
        maxCostPerDay: 0,
        concurrentRequests: 0,
        maxConcurrentTasks: 0
      },
      error: error.message
    }
  }
}

/**
 * 根据评分确定风险等级
 * @param {Number} score - 风险评分 (0-100)
 * @returns {Object} 风险等级对象
 */
function getRiskLevel(score) {
  if (score <= RISK_LEVELS.low.max) {
    return RISK_LEVELS.low
  }
  if (score <= RISK_LEVELS.medium.max) {
    return RISK_LEVELS.medium
  }
  if (score <= RISK_LEVELS.high.max) {
    return RISK_LEVELS.high
  }
  return RISK_LEVELS.critical
}

/**
 * 生成风险建议
 * @param {Object} factors - 风险因素
 * @param {Object} _currentUsage - 当前使用量（预留参数）
 * @returns {Array} 建议数组
 */
function generateRecommendations(factors, _currentUsage) {
  const recommendations = []

  try {
    // 并发利用率告警 (>90%)
    if (factors.concurrencyUtilization > 0.9) {
      recommendations.push('并发利用率过高，建议降低并发限制或增加账户')
    } else if (factors.concurrencyUtilization > 0.75) {
      recommendations.push('并发利用率较高，注意监控并发情况')
    }

    // 窗口使用率告警 (>85%)
    if (factors.windowUsageRatio > 0.85) {
      recommendations.push('窗口请求数接近上限，建议增加会话窗口时长')
    } else if (factors.windowUsageRatio > 0.7) {
      recommendations.push('窗口使用率较高，可能需要调整限流参数')
    }

    // 费用趋势告警 (>80%)
    if (factors.costTrendScore > 0.8) {
      recommendations.push('每日费用接近上限，建议检查费用异常或增加限额')
    } else if (factors.costTrendScore > 0.65) {
      recommendations.push('费用使用量较高，注意成本控制')
    }

    // 多个高风险因素
    const highRiskCount = [
      factors.concurrencyUtilization > 0.9,
      factors.windowUsageRatio > 0.85,
      factors.costTrendScore > 0.8
    ].filter(Boolean).length

    if (highRiskCount >= 2) {
      recommendations.push('多项指标告警，强烈建议添加新账户分散风险')
    }

    // 如果没有告警，给出正面反馈
    if (recommendations.length === 0) {
      recommendations.push('账户运行状态良好，继续保持')
    }
  } catch (error) {
    logger.error('Error generating recommendations:', error)
    recommendations.push('建议检查账户配置是否正确')
  }

  return recommendations
}

/**
 * 完整的风险评估（评分 + 建议）
 * @param {Object} account - 账户配置
 * @param {Object} usage - 当前使用量
 * @returns {Object} 完整评估结果
 */
function assessRisk(account, usage) {
  const scoreResult = calculateRiskScore(account, usage)
  const recommendations = generateRecommendations(scoreResult.factors, scoreResult.currentUsage)

  return {
    ...scoreResult,
    recommendations
  }
}

module.exports = {
  calculateRiskScore,
  getRiskLevel,
  generateRecommendations,
  assessRisk,
  RISK_LEVELS,
  WEIGHTS
}
