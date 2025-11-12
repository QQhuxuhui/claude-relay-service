const logger = require('./logger')

/**
 * Image Validator Utility
 * Validates image format, size, and converts to Base64
 */

const VALID_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg']
const VALID_EXTENSIONS = ['.png', '.jpg', '.jpeg']
const MAX_SIZE_KB = 500

/**
 * Validate image format (MIME type)
 * @param {Object} file - Multer file object
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateImageFormat(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  const mimeType = file.mimetype?.toLowerCase()
  const originalName = file.originalname?.toLowerCase()

  // Check MIME type
  if (!VALID_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: 'Invalid image format. Only PNG, JPG, and JPEG are supported.'
    }
  }

  // Check file extension
  const hasValidExtension = VALID_EXTENSIONS.some((ext) => originalName?.endsWith(ext))
  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Invalid file extension. Only .png, .jpg, and .jpeg are allowed.'
    }
  }

  return { valid: true, error: null }
}

/**
 * Validate image size
 * @param {Object} file - Multer file object
 * @param {number} maxSizeKB - Maximum size in kilobytes (default: 500KB)
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateImageSize(file, maxSizeKB = MAX_SIZE_KB) {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  const maxBytes = maxSizeKB * 1024
  const fileSizeKB = (file.size / 1024).toFixed(2)

  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Image size exceeds maximum allowed size of ${maxSizeKB}KB. Your file is ${fileSizeKB}KB.`
    }
  }

  return { valid: true, error: null }
}

/**
 * Convert image buffer to Base64 with data URI prefix
 * @param {Object} file - Multer file object
 * @returns {string} Base64-encoded image with data URI prefix (e.g., "data:image/png;base64,...")
 */
function convertToBase64(file) {
  if (!file || !file.buffer) {
    throw new Error('No file buffer provided')
  }

  const base64String = file.buffer.toString('base64')
  const mimeType = file.mimetype || 'image/png'
  const dataUri = `data:${mimeType};base64,${base64String}`

  logger.debug(
    `Converted image to Base64: ${file.originalname}, size: ${(file.size / 1024).toFixed(2)}KB`
  )

  return dataUri
}

/**
 * Validate image file (format and size combined)
 * @param {Object} file - Multer file object
 * @param {number} maxSizeKB - Maximum size in kilobytes (default: 500KB)
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateImage(file, maxSizeKB = MAX_SIZE_KB) {
  // Validate format
  const formatResult = validateImageFormat(file)
  if (!formatResult.valid) {
    return formatResult
  }

  // Validate size
  const sizeResult = validateImageSize(file, maxSizeKB)
  if (!sizeResult.valid) {
    return sizeResult
  }

  return { valid: true, error: null }
}

module.exports = {
  validateImageFormat,
  validateImageSize,
  convertToBase64,
  validateImage,
  VALID_MIME_TYPES,
  VALID_EXTENSIONS,
  MAX_SIZE_KB
}
