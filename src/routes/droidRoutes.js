const crypto = require('crypto')
const express = require('express')
const { authenticateApiKey } = require('../middleware/auth')
const droidRelayService = require('../services/droidRelayService')
const sessionHelper = require('../utils/sessionHelper')
const logger = require('../utils/logger')
const { sanitizeErrorMessage } = require('../utils/errorSanitizer')

const router = express.Router()

function hasDroidPermission(apiKeyData) {
  const permissions = apiKeyData?.permissions || 'all'
  return permissions === 'all' || permissions === 'droid'
}

/**
 * Droid API 转发路由
 *
 * 支持的 Factory.ai 端点:
 * - /droid/claude - Anthropic (Claude) Messages API
 * - /droid/openai - OpenAI Responses API
 */

// Claude (Anthropic) 端点 - /v1/messages
router.post('/claude/v1/messages', authenticateApiKey, async (req, res) => {
  try {
    const sessionHash = sessionHelper.generateSessionHash(req.body)

    if (!hasDroidPermission(req.apiKey)) {
      logger.security(
        `🚫 API Key ${req.apiKey?.id || 'unknown'} 缺少 Droid 权限，拒绝访问 ${req.originalUrl}`
      )
      return res.status(403).json({
        error: 'permission_denied',
        message: '此 API Key 未启用 Droid 权限'
      })
    }

    const result = await droidRelayService.relayRequest(
      req.body,
      req.apiKey,
      req,
      res,
      req.headers,
      { endpointType: 'anthropic', sessionHash }
    )

    // 如果是流式响应，已经在 relayService 中处理了
    if (result.streaming) {
      return
    }

    // 非流式响应
    res.status(result.statusCode).set(result.headers).send(result.body)
  } catch (error) {
    logger.error('Droid Claude relay error:', error)
    const sanitizedMessage = sanitizeErrorMessage(error.message || 'Internal server error')
    logger.warn(`🧹 [SANITIZED] Droid Claude relay error: ${sanitizedMessage.substring(0, 100)}`)
    res.status(500).json({
      error: 'internal_server_error',
      message: sanitizedMessage
    })
  }
})

// OpenAI 端点 - /v1/responses
router.post(['/openai/v1/responses', '/openai/responses'], authenticateApiKey, async (req, res) => {
  try {
    const sessionId =
      req.headers['session_id'] ||
      req.headers['x-session-id'] ||
      req.body?.session_id ||
      req.body?.conversation_id ||
      null

    const sessionHash = sessionId
      ? crypto.createHash('sha256').update(String(sessionId)).digest('hex')
      : null

    if (!hasDroidPermission(req.apiKey)) {
      logger.security(
        `🚫 API Key ${req.apiKey?.id || 'unknown'} 缺少 Droid 权限，拒绝访问 ${req.originalUrl}`
      )
      return res.status(403).json({
        error: 'permission_denied',
        message: '此 API Key 未启用 Droid 权限'
      })
    }

    const result = await droidRelayService.relayRequest(
      req.body,
      req.apiKey,
      req,
      res,
      req.headers,
      { endpointType: 'openai', sessionHash }
    )

    if (result.streaming) {
      return
    }

    res.status(result.statusCode).set(result.headers).send(result.body)
  } catch (error) {
    logger.error('Droid OpenAI relay error:', error)
    const sanitizedMessage = sanitizeErrorMessage(error.message || 'Internal server error')
    logger.warn(`🧹 [SANITIZED] Droid OpenAI relay error: ${sanitizedMessage.substring(0, 100)}`)
    res.status(500).json({
      error: 'internal_server_error',
      message: sanitizedMessage
    })
  }
})

// 模型列表端点（兼容性）
router.get('/*/v1/models', authenticateApiKey, async (req, res) => {
  try {
    // 返回可用的模型列表
    const models = [
      {
        id: 'claude-opus-4-1-20250805',
        object: 'model',
        created: Date.now(),
        owned_by: 'anthropic'
      },
      {
        id: 'claude-sonnet-4-5-20250929',
        object: 'model',
        created: Date.now(),
        owned_by: 'anthropic'
      },
      {
        id: 'gpt-5-2025-08-07',
        object: 'model',
        created: Date.now(),
        owned_by: 'openai'
      }
    ]

    res.json({
      object: 'list',
      data: models
    })
  } catch (error) {
    logger.error('Droid models list error:', error)
    const sanitizedMessage = sanitizeErrorMessage(error.message || 'Internal server error')
    logger.warn(`🧹 [SANITIZED] Droid models list error: ${sanitizedMessage.substring(0, 100)}`)
    res.status(500).json({
      error: 'internal_server_error',
      message: sanitizedMessage
    })
  }
})

module.exports = router
