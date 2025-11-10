const logger = require('../utils/logger')
const config = require('../../config/config')

/**
 * 请求超时中间件
 * 为所有传入的请求设置超时限制，防止客户端在发送请求体时长时间挂起
 */
function requestTimeoutMiddleware(req, res, next) {
  // 跳过健康检查和metrics端点
  if (req.path === '/health' || req.path === '/metrics') {
    return next()
  }

  // 设置请求超时时间（默认10分钟，与服务器超时一致）
  const timeout = config.requestTimeout || 600000

  // 创建超时定时器
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn(`⏱️ Request timeout after ${timeout}ms`, {
        method: req.method,
        path: req.path,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent')
      })

      // 标记请求已超时
      req.timedOut = true

      // 返回408超时错误
      res.status(408).json({
        error: {
          type: 'request_timeout',
          message: `Request timeout after ${timeout / 1000} seconds`,
          code: 'request_timeout'
        }
      })
    }
  }, timeout)

  // 监听响应结束事件，清除超时定时器
  res.on('finish', () => {
    clearTimeout(timeoutId)
  })

  // 监听响应关闭事件（客户端断开）
  res.on('close', () => {
    clearTimeout(timeoutId)
  })

  // 检测客户端是否在请求过程中断开
  req.on('aborted', () => {
    clearTimeout(timeoutId)
    logger.warn('🔌 Client aborted request during transmission', {
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      contentLength: req.get('content-length'),
      bytesReceived: req.socket?.bytesRead
    })
  })

  // 继续处理请求
  next()
}

/**
 * 请求大小和速率监控中间件
 * 检测慢速客户端攻击和过大的请求体
 */
function requestMonitorMiddleware(req, res, next) {
  // 记录请求开始时间
  req.startTime = Date.now()

  // 记录请求体大小（如果有）
  const contentLength = parseInt(req.get('content-length') || '0', 10)
  if (contentLength > 0) {
    req.expectedBodySize = contentLength

    // 检测超大请求体（超过10MB）
    if (contentLength > 10 * 1024 * 1024) {
      logger.warn('⚠️ Large request body detected', {
        method: req.method,
        path: req.path,
        contentLength: `${(contentLength / 1024 / 1024).toFixed(2)}MB`,
        ip: req.ip
      })
    }
  }

  // 在响应结束时记录请求处理时间
  res.on('finish', () => {
    const duration = Date.now() - req.startTime
    if (duration > 30000) {
      // 超过30秒的请求记录警告
      logger.warn('⏱️ Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${(duration / 1000).toFixed(2)}s`,
        statusCode: res.statusCode
      })
    }
  })

  next()
}

module.exports = {
  requestTimeoutMiddleware,
  requestMonitorMiddleware
}
