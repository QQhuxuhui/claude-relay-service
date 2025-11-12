<template>
  <div class="fixed inset-0 z-50 overflow-y-auto" @click.self="$emit('close')">
    <div
      class="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0"
    >
      <!-- Background overlay -->
      <div class="fixed inset-0 transition-opacity" @click="$emit('close')">
        <div class="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900"></div>
      </div>

      <!-- Modal panel -->
      <div
        class="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all dark:bg-gray-800 sm:my-8 sm:w-full sm:max-w-lg sm:align-middle"
      >
        <div class="bg-white px-4 pb-4 pt-5 dark:bg-gray-800 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="w-full">
              <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                {{ editMode ? 'Edit QR Code' : 'Add QR Code' }}
              </h3>
              <div class="mt-4 space-y-4">
                <!-- Type Selector -->
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    for="qr-type"
                  >
                    Type
                  </label>
                  <select
                    id="qr-type"
                    v-model="form.type"
                    class="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 sm:text-sm"
                    :disabled="editMode"
                  >
                    <option value="">Select Type</option>
                    <option value="customer_service">Customer Service</option>
                    <option value="xianyu_store">Xianyu Store</option>
                  </select>
                </div>

                <!-- Image Upload -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    QR Code Image
                  </label>
                  <div
                    class="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pb-6 pt-5 dark:border-gray-600"
                    @dragleave.prevent="dragOver = false"
                    @dragover.prevent="dragOver = true"
                    @drop.prevent="handleDrop"
                  >
                    <div class="space-y-1 text-center">
                      <!-- Preview Image -->
                      <div v-if="previewImage" class="mb-4">
                        <img
                          alt="QR Code Preview"
                          class="mx-auto h-48 w-48 rounded-lg border-2 border-gray-200 object-contain dark:border-gray-700"
                          :src="previewImage"
                        />
                        <button
                          class="mt-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          type="button"
                          @click="clearImage"
                        >
                          Remove Image
                        </button>
                      </div>

                      <!-- Upload Icon and Text -->
                      <div v-else>
                        <svg
                          class="mx-auto h-12 w-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                          />
                        </svg>
                        <div class="flex text-sm text-gray-600 dark:text-gray-400">
                          <label
                            class="relative cursor-pointer rounded-md font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500 dark:text-blue-400"
                            for="file-upload"
                          >
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              accept="image/png,image/jpeg,image/jpg"
                              class="sr-only"
                              name="file-upload"
                              type="file"
                              @change="handleFileSelect"
                            />
                          </label>
                          <p class="pl-1">or drag and drop</p>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          PNG, JPG, JPEG up to 500KB
                        </p>
                      </div>
                    </div>
                  </div>
                  <p v-if="fileError" class="mt-1 text-sm text-red-600 dark:text-red-400">
                    {{ fileError }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="bg-gray-50 px-4 py-3 dark:bg-gray-800 sm:flex sm:flex-row-reverse sm:px-6">
          <button
            class="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 sm:ml-3 sm:w-auto sm:text-sm"
            :disabled="uploading || !isValid"
            type="button"
            @click="handleSave"
          >
            <svg
              v-if="uploading"
              class="-ml-1 mr-2 h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                fill="currentColor"
              ></path>
            </svg>
            {{ uploading ? 'Saving...' : 'Save' }}
          </button>
          <button
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
            :disabled="uploading"
            type="button"
            @click="$emit('close')"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { showToast } from '@/utils/toast'
import qrCodeAPI from '@/services/qrCodeService'

const props = defineProps({
  editMode: {
    type: Boolean,
    default: false
  },
  qrCode: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const form = ref({
  type: '',
  file: null
})

const previewImage = ref(null)
const fileError = ref(null)
const uploading = ref(false)
const dragOver = ref(false)

const isValid = computed(() => {
  console.log('[QrCodeModal] Validation check:', {
    type: form.value.type,
    hasFile: !!form.value.file,
    hasPreview: !!previewImage.value,
    fileError: fileError.value,
    editMode: props.editMode
  })

  // Must have type selected
  if (!form.value.type) {
    console.log('[QrCodeModal] Validation failed: No type selected')
    return false
  }

  // In edit mode, we can use existing image (previewImage) or upload new one
  // In create mode, we must have a new file
  if (props.editMode) {
    // In edit mode, valid if we have either new file or existing preview
    if (!form.value.file && !previewImage.value) {
      console.log('[QrCodeModal] Validation failed: No file in edit mode')
      return false
    }
  } else {
    // In create mode, must have a new file
    if (!form.value.file) {
      console.log('[QrCodeModal] Validation failed: No file in create mode')
      return false
    }
  }

  // File must not have validation errors
  if (fileError.value) {
    console.log('[QrCodeModal] Validation failed: File error -', fileError.value)
    return false
  }

  console.log('[QrCodeModal] Validation passed!')
  return true
})

const validateFile = (file) => {
  fileError.value = null

  console.log('[QrCodeModal] Validating file:', {
    name: file?.name,
    type: file?.type,
    size: file?.size,
    sizeKB: file ? (file.size / 1024).toFixed(2) : 0
  })

  if (!file) {
    console.log('[QrCodeModal] No file provided')
    return false
  }

  // Check file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
  if (!validTypes.includes(file.type)) {
    fileError.value = 'Invalid file format. Only PNG, JPG, and JPEG are supported.'
    console.log('[QrCodeModal] Invalid file type:', file.type)
    return false
  }

  // Check file size (500KB)
  const maxSize = 500 * 1024
  if (file.size > maxSize) {
    const sizeKB = (file.size / 1024).toFixed(2)
    fileError.value = `File size exceeds 500KB. Your file is ${sizeKB}KB.`
    console.log('[QrCodeModal] File too large:', sizeKB, 'KB')
    return false
  }

  console.log('[QrCodeModal] File validation passed')
  return true
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  console.log('[QrCodeModal] File selected:', file?.name)

  if (!file) {
    console.log('[QrCodeModal] No file selected')
    return
  }

  if (validateFile(file)) {
    console.log('[QrCodeModal] File valid, setting form data')
    form.value.file = file
    const reader = new FileReader()
    reader.onload = (e) => {
      previewImage.value = e.target.result
      console.log('[QrCodeModal] Preview image loaded')
    }
    reader.readAsDataURL(file)
  } else {
    console.log('[QrCodeModal] File validation failed, clearing form')
    // Clear file input and form data when validation fails
    form.value.file = null
    previewImage.value = null
    // Reset the file input
    event.target.value = ''
  }
}

const handleDrop = (event) => {
  dragOver.value = false
  const file = event.dataTransfer.files[0]
  console.log('[QrCodeModal] File dropped:', file?.name)

  if (!file) {
    console.log('[QrCodeModal] No file dropped')
    return
  }

  if (validateFile(file)) {
    console.log('[QrCodeModal] Dropped file valid, setting form data')
    form.value.file = file
    const reader = new FileReader()
    reader.onload = (e) => {
      previewImage.value = e.target.result
      console.log('[QrCodeModal] Preview image loaded from drop')
    }
    reader.readAsDataURL(file)
  } else {
    console.log('[QrCodeModal] Dropped file validation failed')
    // Clear form data when validation fails
    form.value.file = null
    previewImage.value = null
  }
}

const clearImage = () => {
  form.value.file = null
  previewImage.value = null
  fileError.value = null
}

const handleSave = async () => {
  if (!isValid.value || uploading.value) return

  uploading.value = true

  try {
    if (props.editMode) {
      await qrCodeAPI.updateQrCode(form.value.type, form.value.file)
    } else {
      await qrCodeAPI.createQrCode(form.value.type, form.value.file)
    }
    emit('saved')
  } catch (error) {
    console.error('Failed to save QR code:', error)
    showToast(error.message || 'Failed to save QR code', 'error')
  } finally {
    uploading.value = false
  }
}

// Initialize form when editing
watch(
  () => props.qrCode,
  (newVal) => {
    console.log('[QrCodeModal] Watch triggered:', {
      hasQrCode: !!newVal,
      editMode: props.editMode,
      type: newVal?.type
    })

    if (newVal && props.editMode) {
      console.log('[QrCodeModal] Initializing edit mode with existing QR code')
      form.value.type = newVal.type
      previewImage.value = newVal.base64Data
      // Clear any previous errors
      fileError.value = null
      console.log(
        '[QrCodeModal] Edit mode initialized, validation should pass with existing preview'
      )
    } else if (!props.editMode) {
      console.log('[QrCodeModal] Create mode, resetting form')
      // Reset form for create mode
      form.value.type = ''
      form.value.file = null
      previewImage.value = null
      fileError.value = null
    }
  },
  { immediate: true }
)
</script>
