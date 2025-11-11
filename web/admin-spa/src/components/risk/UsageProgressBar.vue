<template>
  <div class="usage-progress-bar">
    <!-- 标签和数值 -->
    <div class="mb-2 flex items-center justify-between text-sm">
      <span class="font-medium text-gray-700 dark:text-gray-300">{{ label }}</span>
      <span class="text-gray-600 dark:text-gray-400">
        <span v-if="max > 0" class="font-semibold" :class="usageColorClass">
          {{ formatValue(current) }} / {{ formatValue(max) }}
        </span>
        <span v-else class="text-gray-500 dark:text-gray-500">
          {{ formatValue(current) }} / 不限制
        </span>
        <span v-if="showPercentage && max > 0" class="ml-1 text-xs"> ({{ percentage }}%) </span>
      </span>
    </div>

    <!-- 进度条 -->
    <div
      v-if="max > 0"
      class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
    >
      <div
        class="h-full transition-all duration-300"
        :class="progressBarClass"
        :style="{ width: `${Math.min(100, percentage)}%` }"
      />
    </div>

    <!-- 无限制提示 -->
    <div
      v-else
      class="h-2 w-full overflow-hidden rounded-full bg-gray-300 dark:bg-gray-600"
      title="未设置限制"
    >
      <div class="h-full w-full bg-gray-400 dark:bg-gray-500" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  current: {
    type: Number,
    required: true,
    default: 0
  },
  max: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    default: ''
  },
  showPercentage: {
    type: Boolean,
    default: true
  }
})

// 计算百分比
const percentage = computed(() => {
  if (props.max <= 0) return 0
  return Math.round((props.current / props.max) * 100)
})

// 格式化数值
const formatValue = (value) => {
  if (props.unit === '$') {
    return `$${value.toFixed(2)}`
  }
  return value.toString() + (props.unit ? ` ${props.unit}` : '')
}

// 根据使用率确定颜色类
const usageColorClass = computed(() => {
  const ratio = percentage.value
  if (ratio >= 81) {
    return 'text-red-600 dark:text-red-400'
  } else if (ratio >= 61) {
    return 'text-orange-600 dark:text-orange-400'
  } else if (ratio >= 41) {
    return 'text-yellow-600 dark:text-yellow-400'
  } else {
    return 'text-green-600 dark:text-green-400'
  }
})

// 进度条渐变类
const progressBarClass = computed(() => {
  const ratio = percentage.value
  if (ratio >= 81) {
    return 'bg-gradient-to-r from-red-500 to-red-600'
  } else if (ratio >= 61) {
    return 'bg-gradient-to-r from-orange-500 to-red-500'
  } else if (ratio >= 41) {
    return 'bg-gradient-to-r from-yellow-500 to-orange-500'
  } else {
    return 'bg-gradient-to-r from-green-500 to-blue-500'
  }
})
</script>

<style scoped>
.usage-progress-bar {
  width: 100%;
}
</style>
