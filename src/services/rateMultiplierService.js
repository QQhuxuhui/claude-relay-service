const redis = require('../models/redis')
const logger = require('../utils/logger')

// 默认费率倍率配置
const DEFAULT_MULTIPLIERS = {
  claude: 1.0,
  'claude-console': 1.0,
  gemini: 1.0,
  openai: 0.5, // OpenAI按50%计费
  'openai-responses': 0.5, // OpenAI Responses按50%计费
  bedrock: 1.0,
  'azure-openai': 1.0,
  droid: 1.0,
  ccr: 1.0
}

// 支持的平台类型
const SUPPORTED_PLATFORMS = Object.keys(DEFAULT_MULTIPLIERS)

// 倍率范围限制
const MIN_MULTIPLIER = 0.1
const MAX_MULTIPLIER = 10.0

// 内存缓存（TTL 5分钟）
let multiplierCache = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5分钟

class RateMultiplierService {
  constructor() {
    this.MULTIPLIERS_KEY = 'rate_multipliers'
  }

  /**
   * 初始化费率倍率配置
   * 如果Redis中没有配置，则使用默认值初始化
   */
  async initialize() {
    try {
      const client = redis.getClientSafe()
      const exists = await client.exists(this.MULTIPLIERS_KEY)

      if (!exists) {
        logger.info('💰 Initializing rate multipliers with default values...')
        await this.updateMultipliers(DEFAULT_MULTIPLIERS)
        logger.success('✅ Rate multipliers initialized successfully')
      } else {
        logger.info('💰 Rate multipliers already initialized')
      }
    } catch (error) {
      logger.error('❌ Failed to initialize rate multipliers:', error)
      throw error
    }
  }

  /**
   * 验证倍率值
   * @param {number} value - 倍率值
   * @returns {boolean} 是否有效
   */
  validateMultiplier(value) {
    const num = parseFloat(value)
    if (isNaN(num)) {
      return false
    }
    if (num < MIN_MULTIPLIER || num > MAX_MULTIPLIER) {
      return false
    }
    return true
  }

  /**
   * 获取所有费率倍率配置
   * @returns {Object} 费率倍率配置对象
   */
  async getAllMultipliers() {
    try {
      // 检查缓存
      const now = Date.now()
      if (multiplierCache && now - cacheTimestamp < CACHE_TTL) {
        logger.debug('💰 Using cached rate multipliers')
        return multiplierCache
      }

      const client = redis.getClientSafe()
      const multipliers = await client.hgetall(this.MULTIPLIERS_KEY)

      if (!multipliers || Object.keys(multipliers).length === 0) {
        logger.warn('⚠️ No rate multipliers found, using defaults')
        return DEFAULT_MULTIPLIERS
      }

      // 转换为数字类型并填充缺失的平台
      const result = {}
      for (const platform of SUPPORTED_PLATFORMS) {
        result[platform] = parseFloat(multipliers[platform]) || DEFAULT_MULTIPLIERS[platform]
      }

      // 更新缓存
      multiplierCache = result
      cacheTimestamp = now

      return result
    } catch (error) {
      logger.error('❌ Failed to get rate multipliers:', error)
      return DEFAULT_MULTIPLIERS
    }
  }

  /**
   * 获取指定平台的费率倍率
   * @param {string} platform - 平台类型
   * @returns {number} 费率倍率
   */
  async getMultiplier(platform) {
    try {
      if (!platform) {
        logger.warn('⚠️ No platform specified, using default multiplier 1.0')
        return 1.0
      }

      // 标准化平台名称
      const normalizedPlatform = platform.toLowerCase()

      // 检查缓存
      const now = Date.now()
      if (multiplierCache && now - cacheTimestamp < CACHE_TTL) {
        const multiplier = multiplierCache[normalizedPlatform]
        if (multiplier !== undefined) {
          return multiplier
        }
      }

      const client = redis.getClientSafe()
      const value = await client.hget(this.MULTIPLIERS_KEY, normalizedPlatform)

      if (value === null || value === undefined) {
        // 使用默认值
        const defaultValue = DEFAULT_MULTIPLIERS[normalizedPlatform] || 1.0
        logger.debug(
          `💰 No multiplier found for platform ${normalizedPlatform}, using default: ${defaultValue}`
        )
        return defaultValue
      }

      const multiplier = parseFloat(value)
      return isNaN(multiplier) ? 1.0 : multiplier
    } catch (error) {
      logger.error('❌ Failed to get multiplier for platform:', platform, error)
      return 1.0 // 出错时返回默认值
    }
  }

  /**
   * 更新单个平台的费率倍率
   * @param {string} platform - 平台类型
   * @param {number} multiplier - 费率倍率
   * @returns {boolean} 是否成功
   */
  async updateMultiplier(platform, multiplier) {
    try {
      // 验证平台
      if (!SUPPORTED_PLATFORMS.includes(platform)) {
        throw new Error(`Unsupported platform: ${platform}`)
      }

      // 验证倍率
      if (!this.validateMultiplier(multiplier)) {
        throw new Error(
          `Invalid multiplier: ${multiplier} (must be between ${MIN_MULTIPLIER} and ${MAX_MULTIPLIER})`
        )
      }

      const client = redis.getClientSafe()
      await client.hset(this.MULTIPLIERS_KEY, platform, multiplier.toString())

      // 清除缓存
      multiplierCache = null
      cacheTimestamp = 0

      logger.success(`✅ Updated rate multiplier for ${platform}: ${multiplier}x`)
      return true
    } catch (error) {
      logger.error('❌ Failed to update rate multiplier:', error)
      throw error
    }
  }

  /**
   * 批量更新费率倍率
   * @param {Object} multipliers - 费率倍率对象
   * @returns {Array} 成功更新的平台列表
   */
  async updateMultipliers(multipliers) {
    try {
      const client = redis.getClientSafe()
      const updated = []
      const errors = []

      for (const [platform, multiplier] of Object.entries(multipliers)) {
        try {
          // 验证平台
          if (!SUPPORTED_PLATFORMS.includes(platform)) {
            errors.push({ platform, error: 'Unsupported platform' })
            continue
          }

          // 验证倍率
          if (!this.validateMultiplier(multiplier)) {
            errors.push({
              platform,
              error: `Invalid multiplier: ${multiplier}`
            })
            continue
          }

          await client.hset(this.MULTIPLIERS_KEY, platform, multiplier.toString())
          updated.push(platform)
        } catch (error) {
          errors.push({ platform, error: error.message })
        }
      }

      // 清除缓存
      multiplierCache = null
      cacheTimestamp = 0

      if (updated.length > 0) {
        logger.success(`✅ Updated rate multipliers for: ${updated.join(', ')}`)
      }

      if (errors.length > 0) {
        logger.warn('⚠️ Some multipliers failed to update:', errors)
      }

      return { updated, errors }
    } catch (error) {
      logger.error('❌ Failed to batch update rate multipliers:', error)
      throw error
    }
  }

  /**
   * 重置为默认值
   * @returns {boolean} 是否成功
   */
  async resetToDefaults() {
    try {
      logger.info('💰 Resetting rate multipliers to defaults...')
      await this.updateMultipliers(DEFAULT_MULTIPLIERS)

      // 清除缓存
      multiplierCache = null
      cacheTimestamp = 0

      logger.success('✅ Rate multipliers reset to defaults')
      return true
    } catch (error) {
      logger.error('❌ Failed to reset rate multipliers:', error)
      throw error
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    multiplierCache = null
    cacheTimestamp = 0
    logger.debug('💰 Rate multiplier cache cleared')
  }

  /**
   * 获取默认倍率配置
   * @returns {Object} 默认倍率配置
   */
  getDefaults() {
    return { ...DEFAULT_MULTIPLIERS }
  }

  /**
   * 获取支持的平台列表
   * @returns {Array} 平台列表
   */
  getSupportedPlatforms() {
    return [...SUPPORTED_PLATFORMS]
  }
}

module.exports = new RateMultiplierService()
