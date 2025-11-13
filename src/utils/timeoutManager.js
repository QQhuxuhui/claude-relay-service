/**
 * 超时管理器 - 根据账户提供商动态调整超时时间
 *
 * 用于主备账户切换策略，为不稳定的账户设置较短超时，快速失败切换
 */

const config = require('../../config/config')
const logger = require('./logger')

// 默认超时配置（秒）
const DEFAULT_TIMEOUT_BY_PROVIDER = {
  closeai: 30, // CloseAI：30秒
  api2d: 45, // API2D：45秒
  fastgpt: 40, // FastGPT：40秒
  default: 600 // 其他：10分钟（保持原有行为）
}

class TimeoutManager {
  constructor() {
    // 从配置加载超时设置
    this.timeoutConfig = this._loadTimeoutConfig()
    logger.info('⏱️ Timeout Manager initialized', { config: this.timeoutConfig })
  }

  _loadTimeoutConfig() {
    // 从环境变量或config加载
    const customConfig = config.timeout || {}
    const merged = { ...DEFAULT_TIMEOUT_BY_PROVIDER, ...customConfig }

    logger.debug('Timeout configuration loaded', merged)
    return merged
  }

  /**
   * 获取账户的超时时间（毫秒）
   * @param {Object} account 账户对象
   * @returns {number} 超时时间（毫秒）
   */
  getAccountTimeout(account) {
    if (!account) {
      const defaultTimeout = this.timeoutConfig.default * 1000
      logger.debug(`Using default timeout: ${defaultTimeout}ms`)
      return defaultTimeout
    }

    // 1. 优先使用账户自定义超时（如果配置了）
    if (account.timeout && account.timeout > 0) {
      logger.debug(`Using custom timeout for account ${account.accountId}: ${account.timeout}ms`)
      return account.timeout
    }

    // 2. 根据提供商获取超时
    const provider = account.provider || 'default'
    const timeoutSeconds = this.timeoutConfig[provider] || this.timeoutConfig.default
    const timeoutMs = timeoutSeconds * 1000

    logger.debug(
      `Timeout for account ${account.accountId || 'unknown'} (provider: ${provider}): ${timeoutMs}ms (${timeoutSeconds}s)`
    )

    return timeoutMs
  }

  /**
   * 获取智能超时时间（根据请求大小动态调整）
   * 策略：根据请求体大小分档设置超时时间，平衡响应速度和并发槽位占用
   *
   * @param {Object} account 账户对象
   * @param {Object|string} requestBody 请求体（对象或JSON字符串）
   * @returns {number} 超时时间（毫秒）
   */
  getSmartTimeout(account, requestBody) {
    // 计算请求体大小（字节）
    let bodySize = 0
    try {
      if (typeof requestBody === 'string') {
        bodySize = Buffer.byteLength(requestBody, 'utf8')
      } else if (requestBody) {
        bodySize = Buffer.byteLength(JSON.stringify(requestBody), 'utf8')
      }
    } catch (error) {
      logger.warn('Failed to calculate request body size, using default timeout', {
        error: error.message
      })
      return this.getAccountTimeout(account)
    }

    // 获取基础超时时间（秒）
    const provider = account?.provider || 'default'
    const baseTimeoutSeconds = this.timeoutConfig[provider] || this.timeoutConfig.default

    // 智能超时策略：根据请求大小分档
    let timeoutSeconds
    if (bodySize < 10000) {
      // <10KB: 小请求，使用较短超时（最多60秒）
      timeoutSeconds = Math.min(baseTimeoutSeconds, 60)
      logger.debug(
        `Smart timeout (small): ${timeoutSeconds}s for ${(bodySize / 1024).toFixed(2)}KB`
      )
    } else if (bodySize < 50000) {
      // 10-50KB: 中型请求，使用中等超时（最多90秒）
      timeoutSeconds = Math.min(baseTimeoutSeconds, 90)
      logger.debug(
        `Smart timeout (medium): ${timeoutSeconds}s for ${(bodySize / 1024).toFixed(2)}KB`
      )
    } else if (bodySize < 150000) {
      // 50-150KB: 较大请求，使用较长超时（最多180秒）
      timeoutSeconds = Math.min(baseTimeoutSeconds, 180)
      logger.debug(
        `Smart timeout (large): ${timeoutSeconds}s for ${(bodySize / 1024).toFixed(2)}KB`
      )
    } else {
      // >150KB: 超大请求，使用完整超时
      timeoutSeconds = baseTimeoutSeconds
      logger.debug(
        `Smart timeout (xlarge): ${timeoutSeconds}s for ${(bodySize / 1024).toFixed(2)}KB`
      )
    }

    // 账户自定义超时优先级最高
    if (account?.timeout && account.timeout > 0) {
      const customTimeoutSeconds = account.timeout / 1000
      logger.debug(
        `Using custom timeout override: ${customTimeoutSeconds}s (ignoring smart timeout: ${timeoutSeconds}s)`
      )
      return account.timeout
    }

    const timeoutMs = timeoutSeconds * 1000
    logger.info(
      `⏱️ Smart timeout: ${timeoutSeconds}s for ${(bodySize / 1024).toFixed(2)}KB, provider: ${provider}`
    )

    return timeoutMs
  }

  /**
   * 获取所有提供商的超时配置
   * @returns {Object} 超时配置
   */
  getAllTimeouts() {
    return { ...this.timeoutConfig }
  }

  /**
   * 更新特定提供商的超时时间
   * @param {string} provider 提供商名称
   * @param {number} timeoutSeconds 超时时间（秒）
   */
  updateProviderTimeout(provider, timeoutSeconds) {
    if (timeoutSeconds > 0 && timeoutSeconds <= 600) {
      this.timeoutConfig[provider] = timeoutSeconds
      logger.info(`Updated timeout for provider ${provider}: ${timeoutSeconds}s`)
    } else {
      logger.warn(`Invalid timeout value for provider ${provider}: ${timeoutSeconds}`)
    }
  }

  /**
   * 重载配置（从config重新加载）
   */
  reloadConfig() {
    this.timeoutConfig = this._loadTimeoutConfig()
    logger.info('⏱️ Timeout configuration reloaded', { config: this.timeoutConfig })
  }
}

// 导出单例
module.exports = new TimeoutManager()
