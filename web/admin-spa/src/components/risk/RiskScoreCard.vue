<template>
  <div
    class="risk-score-card group relative overflow-hidden rounded-2xl bg-white/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl dark:bg-gray-800/95"
  >
    <!-- 风险等级装饰条 -->
    <div class="absolute left-0 top-0 h-full w-1" :class="riskLevelBorderClass" />

    <!-- 头部：账户信息 -->
    <div class="mb-4 flex items-start justify-between">
      <div class="flex-1">
        <h3
          class="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100"
          :title="account.accountName"
        >
          {{ account.accountName }}
        </h3>
        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span v-if="account.provider" class="flex items-center gap-1">
            <i class="fas fa-server text-xs" />
            {{ account.provider }}
          </span>
          <span class="flex items-center gap-1">
            <i class="fas fa-sort-amount-up text-xs" />
            优先级 {{ account.priority }}
          </span>
        </div>
      </div>

      <!-- 风险评分环 -->
      <div class="relative flex h-20 w-20 flex-shrink-0 items-center justify-center">
        <!-- 背景圆环 -->
        <svg class="h-full w-full -rotate-90 transform">
          <circle
            class="stroke-current text-gray-200 dark:text-gray-700"
            cx="40"
            cy="40"
            fill="none"
            r="34"
            stroke-width="6"
          />
          <circle
            class="transition-all duration-500"
            :class="riskLevelStrokeClass"
            cx="40"
            cy="40"
            fill="none"
            r="34"
            :stroke-dasharray="`${riskScoreCircumference} ${riskScoreCircumference}`"
            :stroke-dashoffset="riskScoreOffset"
            stroke-linecap="round"
            stroke-width="6"
          />
        </svg>
        <!-- 评分数字 -->
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-2xl font-bold" :class="riskLevelTextClass">
            {{ account.riskScore }}
          </span>
          <span class="text-[10px] text-gray-500 dark:text-gray-400">分</span>
        </div>
      </div>
    </div>

    <!-- 风险等级徽章 -->
    <div class="mb-4 flex items-center justify-between">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">风险等级</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
        :class="riskLevelBadgeClass"
      >
        <i class="text-xs" :class="riskLevelIcon" />
        {{ riskLevelText }}
      </span>
    </div>

    <!-- 使用量进度条 -->
    <div class="space-y-3">
      <!-- 窗口请求数 -->
      <UsageProgressBar
        :current="account.currentUsage.requestsInWindow"
        label="窗口请求数"
        :max="account.currentUsage.maxRequestsPerWindow"
        unit="次"
      />

      <!-- 每日费用 -->
      <UsageProgressBar
        :current="account.currentUsage.costToday"
        label="每日费用"
        :max="account.currentUsage.maxCostPerDay"
        unit="$"
      />

      <!-- 并发数 -->
      <UsageProgressBar
        :current="account.currentUsage.concurrentRequests"
        label="当前并发"
        :max="account.currentUsage.maxConcurrentTasks"
        unit="个"
      />
    </div>

    <!-- 风险建议 -->
    <div v-if="account.recommendations && account.recommendations.length > 0" class="mt-4">
      <button
        class="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        @click="showRecommendations = !showRecommendations"
      >
        <span class="flex items-center gap-2">
          <i class="fas fa-lightbulb text-yellow-500" />
          建议 ({{ account.recommendations.length }})
        </span>
        <i
          class="fas fa-chevron-down text-xs transition-transform duration-200"
          :class="{ 'rotate-180': showRecommendations }"
        />
      </button>

      <transition
        name="expand"
        @after-enter="afterEnter"
        @after-leave="afterLeave"
        @enter="enter"
        @leave="leave"
      >
        <div v-show="showRecommendations" class="overflow-hidden">
          <ul class="mt-2 space-y-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
            <li
              v-for="(recommendation, index) in account.recommendations"
              :key="index"
              class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <i
                class="fas fa-exclamation-triangle mt-0.5 text-xs text-yellow-600 dark:text-yellow-400"
              />
              <span>{{ recommendation }}</span>
            </li>
          </ul>
        </div>
      </transition>
    </div>

    <!-- 底部操作 -->
    <div class="mt-4 flex items-center justify-end gap-2">
      <button
        class="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
        @click="handleEditAccount"
      >
        <i class="fas fa-edit mr-1" />
        编辑账户
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import UsageProgressBar from './UsageProgressBar.vue'

const props = defineProps({
  account: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit'])

const showRecommendations = ref(false)

// 圆环周长
const riskScoreCircumference = computed(() => 2 * Math.PI * 34)

// 圆环偏移量（根据评分）
const riskScoreOffset = computed(() => {
  const progress = props.account.riskScore / 100
  return riskScoreCircumference.value * (1 - progress)
})

// 风险等级样式
const riskLevelData = computed(() => {
  const level = props.account.riskLevel
  const data = {
    low: {
      text: '低风险',
      icon: 'fas fa-check-circle',
      badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      strokeClass: 'stroke-current text-green-500',
      textClass: 'text-green-600 dark:text-green-400',
      borderClass: 'bg-green-500'
    },
    medium: {
      text: '中风险',
      icon: 'fas fa-info-circle',
      badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      strokeClass: 'stroke-current text-yellow-500',
      textClass: 'text-yellow-600 dark:text-yellow-400',
      borderClass: 'bg-yellow-500'
    },
    high: {
      text: '高风险',
      icon: 'fas fa-exclamation-circle',
      badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      strokeClass: 'stroke-current text-orange-500',
      textClass: 'text-orange-600 dark:text-orange-400',
      borderClass: 'bg-orange-500'
    },
    critical: {
      text: '极高风险',
      icon: 'fas fa-exclamation-triangle',
      badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      strokeClass: 'stroke-current text-red-500',
      textClass: 'text-red-600 dark:text-red-400',
      borderClass: 'bg-red-500'
    }
  }
  return data[level] || data.low
})

const riskLevelText = computed(() => riskLevelData.value.text)
const riskLevelIcon = computed(() => riskLevelData.value.icon)
const riskLevelBadgeClass = computed(() => riskLevelData.value.badgeClass)
const riskLevelStrokeClass = computed(() => riskLevelData.value.strokeClass)
const riskLevelTextClass = computed(() => riskLevelData.value.textClass)
const riskLevelBorderClass = computed(() => riskLevelData.value.borderClass)

// 展开/收起动画
const enter = (el) => {
  el.style.height = '0'
}

const afterEnter = (el) => {
  el.style.height = el.scrollHeight + 'px'
}

const leave = (el) => {
  el.style.height = el.scrollHeight + 'px'
  setTimeout(() => {
    el.style.height = '0'
  }, 0)
}

const afterLeave = (el) => {
  el.style.height = ''
}

// 编辑账户
const handleEditAccount = () => {
  emit('edit', props.account)
  // 或者直接导航到账户页面
  // router.push({ name: 'Accounts', query: { edit: props.account.accountId } })
}
</script>

<style scoped>
.risk-score-card {
  min-height: 280px;
}

.expand-enter-active,
.expand-leave-active {
  transition: height 0.3s ease;
  overflow: hidden;
}
</style>
