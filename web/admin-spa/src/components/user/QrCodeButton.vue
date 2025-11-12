<template>
  <div class="relative">
    <!-- Button with Text (Admin style) -->
    <button
      v-if="showText"
      class="admin-button-refined flex items-center gap-2 rounded-2xl px-4 py-2 transition-all duration-300 md:px-5 md:py-2.5"
      type="button"
      @click="handleClick"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <component :is="icon" class="h-4 w-4 md:h-5 md:w-5" />
      <span class="text-xs font-semibold tracking-wide md:text-sm">{{ label }}</span>
    </button>

    <!-- Icon Only Button -->
    <button
      v-else
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
        class="absolute left-1/2 top-full z-[9999] mt-2 -translate-x-1/2 transform"
      >
        <div
          class="rounded-lg border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
          style="min-width: 280px; width: max-content"
          @mouseenter="handlePopoverEnter"
          @mouseleave="handlePopoverLeave"
        >
          <!-- Arrow pointing up -->
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 transform">
            <div
              class="h-0 w-0 border-8 border-b-white border-l-transparent border-r-transparent border-t-transparent dark:border-b-gray-800"
            ></div>
          </div>
          <!-- QR Code Image -->
          <img
            :alt="`${label} QR Code`"
            class="rounded-md"
            :src="base64Data"
            style="width: 256px; height: 256px; object-fit: contain"
          />
          <!-- Label -->
          <p class="mt-2 text-center text-sm font-medium text-gray-900 dark:text-white">
            {{ label }}
          </p>
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
  },
  showText: {
    type: Boolean,
    default: false
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
/* Admin button style */
.admin-button-refined {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  text-decoration: none;
  box-shadow:
    0 4px 12px rgba(16, 185, 129, 0.25),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
  font-weight: 600;
  cursor: pointer;
}

/* 暗色模式下的按钮 */
:global(.dark) .admin-button-refined {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: white;
  box-shadow:
    0 4px 12px rgba(16, 185, 129, 0.3),
    inset 0 1px 1px rgba(255, 255, 255, 0.1);
}

.admin-button-refined::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.admin-button-refined:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow:
    0 8px 20px rgba(16, 185, 129, 0.35),
    inset 0 1px 1px rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.4);
}

.admin-button-refined:hover::before {
  opacity: 1;
}

/* 暗色模式下的悬停效果 */
:global(.dark) .admin-button-refined:hover {
  box-shadow:
    0 8px 20px rgba(16, 185, 129, 0.4),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
  border-color: rgba(16, 185, 129, 0.5);
}

.admin-button-refined:active {
  transform: translateY(-1px) scale(1);
}

/* 确保图标和文字在所有模式下都清晰可见 */
.admin-button-refined svg,
.admin-button-refined span {
  position: relative;
  z-index: 1;
}

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
