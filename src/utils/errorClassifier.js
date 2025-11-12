/**
 * 错误分类器 - 判断错误是否可重试
 *
 * 用于主备账户自动切换策略，识别可重试的临时性错误
 */

const logger = require('./logger')

// 可重试的错误码
const RETRIABLE_ERROR_CODES = [
  // 网络层错误
  'ETIMEDOUT', // 连接超时
  'ECONNRESET', // 连接重置
  'ECONNREFUSED', // 连接被拒绝
  'ENOTFOUND', // DNS解析失败
  'ECONNABORTED', // 连接中止
  'ENETUNREACH', // 网络不可达
  'EHOSTUNREACH', // 主机不可达
  'EPIPE', // 管道破裂
  'EAI_AGAIN', // DNS临时失败

  // 应用层错误
  'CONSOLE_ACCOUNT_CONCURRENCY_FULL', // 并发满额（已有）
  'ACCOUNT_UNAVAILABLE', // 账户不可用
  'UPSTREAM_TIMEOUT', // 上游超时
  'UPSTREAM_ERROR' // 上游错误
]

// 可重试的HTTP状态码
const RETRIABLE_STATUS_CODES = [
  500, // 服务器内部错误
  502, // 网关错误
  503, // 服务不可用
  504, // 网关超时
  529 // 过载
]

// 可重试的错误消息模式
const RETRIABLE_MESSAGE_PATTERNS = [
  'timeout',
  'timed out',
  'socket hang up',
  'connection reset',
  'connection refused',
  'enotfound',
  'network error',
  'upstream error',
  'fetch failed',
  'aborted',
  'request aborted'
]

// 致命错误状态码（不可重试）
const FATAL_STATUS_CODES = [
  400, // 请求错误
  401, // 未授权
  403, // 禁止访问
  404 // 未找到
]

/**
 * 判断错误是否可重试
 * @param {Error} error 错误对象
 * @returns {boolean} 是否可重试
 */
function isRetriableError(error) {
  if (!error) {
    return false
  }

  // 1. 检查错误码
  if (error.code && RETRIABLE_ERROR_CODES.includes(error.code)) {
    logger.debug(`Error is retriable (code: ${error.code})`)
    return true
  }

  // 2. 检查HTTP状态码
  if (error.statusCode && RETRIABLE_STATUS_CODES.includes(error.statusCode)) {
    logger.debug(`Error is retriable (status: ${error.statusCode})`)
    return true
  }

  // 3. 检查错误消息
  if (error.message) {
    const message = error.message.toLowerCase()
    for (const pattern of RETRIABLE_MESSAGE_PATTERNS) {
      if (message.includes(pattern)) {
        logger.debug(`Error is retriable (message pattern: ${pattern})`)
        return true
      }
    }
  }

  logger.debug('Error is not retriable')
  return false
}

/**
 * 判断错误是否为致命错误（不可恢复）
 * @param {Error} error 错误对象
 * @returns {boolean} 是否为致命错误
 */
function isFatalError(error) {
  if (!error) {
    return false
  }

  // 检查致命状态码
  if (error.statusCode && FATAL_STATUS_CODES.includes(error.statusCode)) {
    logger.debug(`Error is fatal (status: ${error.statusCode})`)
    return true
  }

  return false
}

/**
 * 获取错误的建议重试次数
 * @param {Error} error 错误对象
 * @returns {number} 建议重试次数
 */
function getSuggestedRetryCount(error) {
  if (!error) {
    return 0
  }

  // 致命错误：不重试
  if (isFatalError(error)) {
    return 0
  }

  // 并发满额：1次（已有实现）
  if (error.code === 'CONSOLE_ACCOUNT_CONCURRENCY_FULL') {
    return 1
  }

  // 超时错误：1次（快速失败）
  if (error.code === 'ETIMEDOUT' || error.message?.toLowerCase().includes('timeout')) {
    return 1
  }

  // 5xx错误：1次
  if (error.statusCode >= 500) {
    return 1
  }

  // 其他可重试错误：1次
  if (isRetriableError(error)) {
    return 1
  }

  // 默认不重试
  return 0
}

/**
 * 获取错误的详细信息（用于日志）
 * @param {Error} error 错误对象
 * @returns {Object} 错误详细信息
 */
function getErrorDetails(error) {
  if (!error) {
    return {}
  }

  return {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    retriable: isRetriableError(error),
    fatal: isFatalError(error),
    suggestedRetries: getSuggestedRetryCount(error)
  }
}

module.exports = {
  isRetriableError,
  isFatalError,
  getSuggestedRetryCount,
  getErrorDetails,
  RETRIABLE_ERROR_CODES,
  RETRIABLE_STATUS_CODES,
  FATAL_STATUS_CODES
}
