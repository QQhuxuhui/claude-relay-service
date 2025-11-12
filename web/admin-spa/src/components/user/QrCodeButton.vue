<template>
  <div class="relative">
    <!-- Button -->
    <button
      class="group rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      :title="label"
      type="button"
      @click="handleClick"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <component :is="icon" class="h-5 w-5" />
    </button>

    <!-- Popover (Desktop - hover) -->
    <Transition name="qr-fade">
      <div
        v-if="showPopover && !isMobile"
        class="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 transform"
      >
        <div
          class="rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          @mouseenter="handlePopoverEnter"
          @mouseleave="handlePopoverLeave"
        >
          <!-- QR Code Image -->
          <img :alt="`${label} QR Code`" class="h-48 w-48 rounded-md" :src="base64Data" />
          <!-- Label -->
          <p class="mt-2 text-center text-sm font-medium text-gray-900 dark:text-white">
            {{ label }}
          </p>
          <!-- Arrow -->
          <div class="absolute left-1/2 top-full -translate-x-1/2 transform">
            <div
              class="h-0 w-0 border-8 border-b-transparent border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800"
            ></div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal (Mobile - click) -->
    <Transition name="qr-modal">
      <div
        v-if="showModal && isMobile"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        @click.self="closeModal"
      >
        <div
          class="w-full max-w-sm transform rounded-lg bg-white p-6 shadow-xl transition-all dark:bg-gray-800"
        >
          <!-- Close button -->
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ label }}
            </h3>
            <button
              class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              type="button"
              @click="closeModal"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M6 18L18 6M6 6l12 12"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
            </button>
          </div>

          <!-- QR Code Image -->
          <div class="flex justify-center">
            <img :alt="`${label} QR Code`" class="h-64 w-64 rounded-lg" :src="base64Data" />
          </div>

          <!-- Description -->
          <p class="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Scan with your mobile device
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({
  type: {
    type: String,
    required: true
  },
  base64Data: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  icon: {
    type: Object,
    required: true
  }
})

const showPopover = ref(false)
const showModal = ref(false)
const isMobile = ref(false)
const hoverTimeout = ref(null)
const isOverPopover = ref(false)

// Detect mobile device
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
  }
})

const handleMouseEnter = () => {
  if (isMobile.value) return

  // Clear any existing timeout
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
  }

  // Show popover after a small delay
  hoverTimeout.value = setTimeout(() => {
    showPopover.value = true
  }, 100)
}

const handleMouseLeave = () => {
  if (isMobile.value) return

  // Clear timeout if mouse leaves before delay
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
  }

  // Hide popover after a delay to allow moving to popover
  hoverTimeout.value = setTimeout(() => {
    if (!isOverPopover.value) {
      showPopover.value = false
    }
  }, 200)
}

const handlePopoverEnter = () => {
  isOverPopover.value = true
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
  }
}

const handlePopoverLeave = () => {
  isOverPopover.value = false
  showPopover.value = false
}

const handleClick = () => {
  if (isMobile.value) {
    showModal.value = true
  } else {
    // On desktop, toggle popover on click as well
    showPopover.value = !showPopover.value
  }
}

const closeModal = () => {
  showModal.value = false
}
</script>

<style scoped>
/* Popover fade transition */
.qr-fade-enter-active,
.qr-fade-leave-active {
  transition: opacity 0.2s ease;
}

.qr-fade-enter-from,
.qr-fade-leave-to {
  opacity: 0;
}

/* Modal slide-up transition */
.qr-modal-enter-active,
.qr-modal-leave-active {
  transition: all 0.3s ease;
}

.qr-modal-enter-from,
.qr-modal-leave-to {
  opacity: 0;
}

.qr-modal-enter-from > div,
.qr-modal-leave-to > div {
  transform: translateY(20px);
}
</style>
