<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="sm:flex sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">QR Code Management</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage QR codes for customer service and Xianyu store
        </p>
      </div>
      <div class="mt-4 sm:ml-16 sm:mt-0">
        <button
          class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
          type="button"
          @click="openCreateModal"
        >
          <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 4v16m8-8H4"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          Add QR Code
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
      <p class="text-sm text-red-700 dark:text-red-300">{{ error }}</p>
    </div>

    <!-- QR Codes Grid -->
    <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <!-- QR Code Card -->
      <div
        v-for="qrCode in qrCodes"
        :key="qrCode.type"
        class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800"
      >
        <div class="p-6">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                {{ getTypeLabel(qrCode.type) }}
              </h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Type: {{ qrCode.type }}</p>
            </div>
            <div class="ml-4 flex space-x-2">
              <button
                class="rounded-md p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                title="Edit"
                type="button"
                @click="openEditModal(qrCode)"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>
              <button
                class="rounded-md p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                title="Delete"
                type="button"
                @click="confirmDelete(qrCode)"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- QR Code Preview -->
          <div class="mt-4 flex justify-center">
            <img
              :alt="`${getTypeLabel(qrCode.type)} QR Code`"
              class="h-48 w-48 rounded-lg border-2 border-gray-200 object-contain dark:border-gray-700"
              :src="qrCode.base64Data"
            />
          </div>

          <!-- Metadata -->
          <div class="mt-4 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500 dark:text-gray-400">Last Updated:</span>
              <span class="text-gray-900 dark:text-white">{{ formatDate(qrCode.updatedAt) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500 dark:text-gray-400">Updated By:</span>
              <span class="text-gray-900 dark:text-white">{{ qrCode.updatedBy }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="qrCodes.length === 0"
        class="col-span-2 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700"
      >
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 4v16m8-8H4"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No QR codes</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by creating a new QR code.
        </p>
        <div class="mt-6">
          <button
            class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            type="button"
            @click="openCreateModal"
          >
            <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 4v16m8-8H4"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
            Add QR Code
          </button>
        </div>
      </div>
    </div>

    <!-- QR Code Modal -->
    <QrCodeModal
      v-if="showModal"
      :edit-mode="editMode"
      :qr-code="selectedQrCode"
      @close="closeModal"
      @saved="handleSaved"
    />

    <!-- Confirm Delete Dialog -->
    <ConfirmDialog
      v-if="showDeleteDialog"
      confirm-text="Delete"
      title="Delete QR Code"
      @cancel="showDeleteDialog = false"
      @confirm="handleDelete"
    >
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Are you sure you want to delete the
        <strong>{{ getTypeLabel(qrCodeToDelete?.type) }}</strong>
        QR code? This action cannot be undone.
      </p>
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast } from '@/utils/toast'
import qrCodeAPI from '@/services/qrCodeService'
import QrCodeModal from '@/components/admin/QrCodeModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const qrCodes = ref([])
const loading = ref(false)
const error = ref(null)
const showModal = ref(false)
const editMode = ref(false)
const selectedQrCode = ref(null)
const showDeleteDialog = ref(false)
const qrCodeToDelete = ref(null)

const getTypeLabel = (type) => {
  const labels = {
    customer_service: 'Customer Service',
    xianyu_store: 'Xianyu Store'
  }
  return labels[type] || type
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadQrCodes = async () => {
  loading.value = true
  error.value = null

  try {
    const data = await qrCodeAPI.fetchAllQrCodes()
    qrCodes.value = data
  } catch (err) {
    console.error('Failed to load QR codes:', err)
    error.value = err.message || 'Failed to load QR codes'
    showToast(error.value, 'error')
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editMode.value = false
  selectedQrCode.value = null
  showModal.value = true
}

const openEditModal = (qrCode) => {
  editMode.value = true
  selectedQrCode.value = qrCode
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedQrCode.value = null
}

const handleSaved = () => {
  closeModal()
  loadQrCodes()
  showToast(
    editMode.value ? 'QR code updated successfully' : 'QR code created successfully',
    'success'
  )
}

const confirmDelete = (qrCode) => {
  qrCodeToDelete.value = qrCode
  showDeleteDialog.value = true
}

const handleDelete = async () => {
  if (!qrCodeToDelete.value) return

  try {
    await qrCodeAPI.deleteQrCode(qrCodeToDelete.value.type)
    showToast('QR code deleted successfully', 'success')
    loadQrCodes()
  } catch (err) {
    console.error('Failed to delete QR code:', err)
    showToast(err.message || 'Failed to delete QR code', 'error')
  } finally {
    showDeleteDialog.value = false
    qrCodeToDelete.value = null
  }
}

onMounted(() => {
  loadQrCodes()
})
</script>
