import axios from 'axios'
import { APP_CONFIG } from '@/config/app'

const API_BASE = APP_CONFIG.apiPrefix

// Create axios instance with authentication
const apiClient = axios.create({
  baseURL: API_BASE
})

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('authToken')
      window.location.href = APP_CONFIG.basePath
    }
    return Promise.reject(error)
  }
)

/**
 * QR Code API Service
 * Handles all QR code related API calls
 */

/**
 * Fetch all QR codes (admin only)
 * @returns {Promise<Array>} Array of QR code objects
 */
export async function fetchAllQrCodes() {
  try {
    const response = await apiClient.get('/admin/qr-codes')
    return response.data.data || []
  } catch (error) {
    console.error('Failed to fetch QR codes:', error)
    throw new Error(error.response?.data?.message || 'Failed to fetch QR codes')
  }
}

/**
 * Fetch specific QR code by type (admin only)
 * @param {string} type - QR code type (customer_service or xianyu_store)
 * @returns {Promise<Object>} QR code object
 */
export async function fetchQrCode(type) {
  try {
    const response = await apiClient.get(`/admin/qr-codes/${type}`)
    return response.data.data
  } catch (error) {
    console.error(`Failed to fetch QR code ${type}:`, error)
    throw new Error(error.response?.data?.message || 'Failed to fetch QR code')
  }
}

/**
 * Create new QR code (admin only)
 * @param {string} type - QR code type
 * @param {File} imageFile - Image file to upload
 * @returns {Promise<Object>} Created QR code object
 */
export async function createQrCode(type, imageFile) {
  try {
    const formData = new FormData()
    formData.append('type', type)
    formData.append('image', imageFile)

    const response = await apiClient.post('/admin/qr-codes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return response.data.data
  } catch (error) {
    console.error('Failed to create QR code:', error)
    throw new Error(error.response?.data?.message || 'Failed to create QR code')
  }
}

/**
 * Update existing QR code (admin only)
 * @param {string} type - QR code type
 * @param {File} imageFile - New image file
 * @returns {Promise<Object>} Updated QR code object
 */
export async function updateQrCode(type, imageFile) {
  try {
    const formData = new FormData()
    formData.append('image', imageFile)

    const response = await apiClient.put(`/admin/qr-codes/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    return response.data.data
  } catch (error) {
    console.error(`Failed to update QR code ${type}:`, error)
    throw new Error(error.response?.data?.message || 'Failed to update QR code')
  }
}

/**
 * Delete QR code (admin only)
 * @param {string} type - QR code type
 * @returns {Promise<void>}
 */
export async function deleteQrCode(type) {
  try {
    await apiClient.delete(`/admin/qr-codes/${type}`)
  } catch (error) {
    console.error(`Failed to delete QR code ${type}:`, error)
    throw new Error(error.response?.data?.message || 'Failed to delete QR code')
  }
}

/**
 * Fetch public QR codes (user endpoint, requires authentication)
 * @returns {Promise<Array>} Array of QR code objects (only type and base64Data)
 */
export async function fetchPublicQrCodes() {
  try {
    const response = await apiClient.get('/api/qr-codes')
    return response.data.data || []
  } catch (error) {
    console.error('Failed to fetch public QR codes:', error)
    throw new Error(error.response?.data?.message || 'Failed to fetch QR codes')
  }
}

export default {
  fetchAllQrCodes,
  fetchQrCode,
  createQrCode,
  updateQrCode,
  deleteQrCode,
  fetchPublicQrCodes
}
