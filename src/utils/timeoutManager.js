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
