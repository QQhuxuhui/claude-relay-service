const redis = require('../models/redis')
const logger = require('../utils/logger')

/**
 * QR Code Service
 * Manages QR code data storage and retrieval in Redis
 */

const VALID_QR_TYPES = ['customer_service', 'xianyu_store']

/**
 * Create a new QR code
 * @param {string} type - QR code type (customer_service or xianyu_store)
 * @param {string} base64Data - Base64-encoded image data with data URI prefix
 * @param {string} adminId - ID or username of the admin creating the QR code
 * @returns {Promise<Object>} Created QR code object
 */
async function createQrCode(type, base64Data, adminId) {
  try {
    if (!VALID_QR_TYPES.includes(type)) {
      throw new Error(`Invalid QR code type: ${type}`)
    }

    if (!base64Data || !base64Data.startsWith('data:image/')) {
      throw new Error('Invalid base64Data format. Must include data URI prefix.')
    }

    const qrCodeData = {
      type,
      base64Data,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId || 'unknown'
    }

    const redisKey = `qr_code:${type}`
    await redis.set(redisKey, JSON.stringify(qrCodeData))

    logger.info(`QR code created: ${type} by ${adminId}`)
    return qrCodeData
  } catch (error) {
    logger.error(`Failed to create QR code: ${error.message}`, { type, error: error.stack })
    throw error
  }
}

/**
 * Get a QR code by type
 * @param {string} type - QR code type
 * @returns {Promise<Object|null>} QR code object or null if not found
 */
async function getQrCode(type) {
  try {
    if (!VALID_QR_TYPES.includes(type)) {
      return null
    }

    const redisKey = `qr_code:${type}`
    const data = await redis.get(redisKey)

    if (!data) {
      return null
    }

    return JSON.parse(data)
  } catch (error) {
    logger.error(`Failed to get QR code: ${error.message}`, { type, error: error.stack })
    throw error
  }
}

/**
 * Update an existing QR code
 * @param {string} type - QR code type
 * @param {string} base64Data - New Base64-encoded image data
 * @param {string} adminId - ID or username of the admin updating the QR code
 * @returns {Promise<Object>} Updated QR code object
 */
async function updateQrCode(type, base64Data, adminId) {
  try {
    if (!VALID_QR_TYPES.includes(type)) {
      throw new Error(`Invalid QR code type: ${type}`)
    }

    // Check if QR code exists
    const existing = await getQrCode(type)
    if (!existing) {
      throw new Error(`QR code not found: ${type}`)
    }

    if (!base64Data || !base64Data.startsWith('data:image/')) {
      throw new Error('Invalid base64Data format. Must include data URI prefix.')
    }

    const qrCodeData = {
      type,
      base64Data,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId || 'unknown'
    }

    const redisKey = `qr_code:${type}`
    await redis.set(redisKey, JSON.stringify(qrCodeData))

    logger.info(`QR code updated: ${type} by ${adminId}`)
    return qrCodeData
  } catch (error) {
    logger.error(`Failed to update QR code: ${error.message}`, { type, error: error.stack })
    throw error
  }
}

/**
 * Delete a QR code
 * @param {string} type - QR code type
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteQrCode(type) {
  try {
    if (!VALID_QR_TYPES.includes(type)) {
      return false
    }

    const redisKey = `qr_code:${type}`
    const result = await redis.del(redisKey)

    if (result > 0) {
      logger.info(`QR code deleted: ${type}`)
      return true
    }

    return false
  } catch (error) {
    logger.error(`Failed to delete QR code: ${error.message}`, { type, error: error.stack })
    throw error
  }
}

/**
 * Get all QR codes
 * @returns {Promise<Array>} Array of QR code objects
 */
async function getAllQrCodes() {
  try {
    const qrCodes = []

    for (const type of VALID_QR_TYPES) {
      const qrCode = await getQrCode(type)
      if (qrCode) {
        qrCodes.push(qrCode)
      }
    }

    return qrCodes
  } catch (error) {
    logger.error(`Failed to get all QR codes: ${error.message}`, { error: error.stack })
    throw error
  }
}

/**
 * Get all QR codes (public version - only type and base64Data)
 * @returns {Promise<Array>} Array of QR code objects with limited fields
 */
async function getAllQrCodesPublic() {
  try {
    const qrCodes = await getAllQrCodes()

    // Return only type and base64Data fields (exclude metadata)
    return qrCodes.map((qr) => ({
      type: qr.type,
      base64Data: qr.base64Data
    }))
  } catch (error) {
    logger.error(`Failed to get public QR codes: ${error.message}`, { error: error.stack })
    throw error
  }
}

module.exports = {
  createQrCode,
  getQrCode,
  updateQrCode,
  deleteQrCode,
  getAllQrCodes,
  getAllQrCodesPublic,
  VALID_QR_TYPES
}
