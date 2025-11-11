<template>
  <div
    class="risk-monitor-view min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 dark:from-gray-900 dark:to-gray-800"
  >
    <!-- 页面头部 -->
    <div class="mb-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">风险监控</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            实时监控 CCR 账户的风险状态和使用情况
          </p>
        </div>
        <button
          class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="loading"
          @click="refreshData"
        >
          <i class="fas fa-sync-alt" :class="{ 'animate-spin': loading }" />
          刷新数据
        </button>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="mb-6 rounded-xl bg-white/90 p-4 shadow-lg backdrop-blur-xl dark:bg-gray-800/95">
      <div class="flex flex-col gap-4 md:flex-row md:items-center">
        <!-- 提供商筛选 -->
        <div class="flex-1">
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <i class="fas fa-server mr-1" />
            提供商
          </label>
          <select
            v-model="filters.provider"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            @change="applyFilters"
          >
            <option value="">全部提供商</option>
            <option value="closeai">CloseAI</option>
            <option value="api2d">API2D</option>
            <option value="api7">API7</option>
            <option value="other">其他</option>
          </select>
        </div>

        <!-- 风险等级筛选 -->
        <div class="flex-1">
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <i class="fas fa-exclamation-triangle mr-1" />
            风险等级
          </label>
          <select
            v-model="filters.riskLevel"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            @change="applyFilters"
          >
            <option value="">全部等级</option>
            <option value="low">低风险</option>
            <option value="medium">中风险</option>
            <option value="high">高风险</option>
            <option value="critical">极高风险</option>
          </select>
        </div>

        <!-- 排序方式 -->
        <div class="flex-1">
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            <i class="fas fa-sort mr-1" />
            排序方式
          </label>
          <select
            v-model="filters.sortBy"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            @change="applyFilters"
          >
            <option value="riskScore">风险评分</option>
            <option value="costToday">每日费用</option>
            <option value="requestsInWindow">窗口请求数</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div
      v-if="error"
      class="mb-6 rounded-xl bg-red-50 p-4 text-red-800 shadow-md dark:bg-red-900/20 dark:text-red-400"
    >
      <div class="flex items-center gap-2">
        <i class="fas fa-exclamation-circle" />
        <span class="font-semibold">加载失败</span>
      </div>
      <p class="mt-1 text-sm">{{ error }}</p>
    </div>

    <!-- 风险统计卡片 -->
    <div
      v-if="!loading && summary"
      class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <!-- 总账户数 -->
      <div
        class="rounded-xl bg-white/90 p-5 shadow-lg backdrop-blur-xl transition-all hover:shadow-xl dark:bg-gray-800/95"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">总账户数</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              {{ summary.totalAccounts }}
            </p>
          </div>
          <div class="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
            <i class="fas fa-server text-2xl text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      <!-- 低风险 -->
      <div
        class="rounded-xl bg-white/90 p-5 shadow-lg backdrop-blur-xl transition-all hover:shadow-xl dark:bg-gray-800/95"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">低风险</p>
            <p class="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
              {{ summary.lowRisk }}
            </p>
          </div>
          <div class="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
            <i class="fas fa-check-circle text-2xl text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      <!-- 中风险 -->
      <div
        class="rounded-xl bg-white/90 p-5 shadow-lg backdrop-blur-xl transition-all hover:shadow-xl dark:bg-gray-800/95"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">中风险</p>
            <p class="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {{ summary.mediumRisk }}
            </p>
          </div>
          <div class="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/30">
            <i class="fas fa-info-circle text-2xl text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      </div>

      <!-- 高风险 -->
      <div
        class="rounded-xl bg-white/90 p-5 shadow-lg backdrop-blur-xl transition-all hover:shadow-xl dark:bg-gray-800/95"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">高风险</p>
            <p class="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">
              {{ summary.highRisk }}
            </p>
          </div>
          <div class="rounded-full bg-orange-100 p-3 dark:bg-orange-900/30">
            <i class="fas fa-exclamation-circle text-2xl text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      <!-- 极高风险 -->
      <div
        class="rounded-xl bg-white/90 p-5 shadow-lg backdrop-blur-xl transition-all hover:shadow-xl dark:bg-gray-800/95"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">极高风险</p>
            <p class="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
              {{ summary.criticalRisk }}
            </p>
          </div>
          <div class="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
            <i class="fas fa-exclamation-triangle text-2xl text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <i class="fas fa-spinner fa-spin text-5xl text-blue-600 dark:text-blue-400" />
      <p class="mt-4 text-gray-600 dark:text-gray-400">加载风险数据中...</p>
    </div>

    <!-- 账户卡片网格 -->
    <div
      v-else-if="!error && accounts.length > 0"
      class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
    >
      <RiskScoreCard
        v-for="account in accounts"
        :key="account.accountId"
        :account="account"
        @edit="handleEditAccount"
      />
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="!loading && !error && accounts.length === 0"
      class="flex flex-col items-center justify-center py-16"
    >
      <i class="fas fa-inbox text-6xl text-gray-400 dark:text-gray-600" />
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-400">暂无符合条件的账户数据</p>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-500">请调整筛选条件或创建新的 CCR 账户</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import RiskScoreCard from '../components/risk/RiskScoreCard.vue'
import { apiClient } from '@/config/api'

const router = useRouter()

// 状态管理
const loading = ref(false)
const error = ref(null)
const summary = ref(null)
const accounts = ref([])

// 筛选器
const filters = ref({
  provider: '',
  riskLevel: '',
  sortBy: 'riskScore'
})

// 获取风险数据
async function fetchRiskData() {
  loading.value = true
  error.value = null

  try {
    const params = {}
    if (filters.value.provider) params.provider = filters.value.provider
    if (filters.value.riskLevel) params.riskLevel = filters.value.riskLevel
    if (filters.value.sortBy) params.sortBy = filters.value.sortBy

    const response = await apiClient.get('/admin/dashboard/relay-risk', { params })

    // 安全的默认值处理 - 注意后端返回的是 { success, data: { summary, accounts } }
    const data = response?.data || {}
    summary.value = data.summary || {
      totalAccounts: 0,
      lowRisk: 0,
      mediumRisk: 0,
      highRisk: 0,
      criticalRisk: 0
    }
    accounts.value = data.accounts || []
  } catch (err) {
    console.error('Failed to fetch risk data:', err)
    error.value = err.message || '获取风险数据失败，请稍后重试'
    // 确保在错误情况下也有默认值
    summary.value = {
      totalAccounts: 0,
      lowRisk: 0,
      mediumRisk: 0,
      highRisk: 0,
      criticalRisk: 0
    }
    accounts.value = []
  } finally {
    loading.value = false
  }
}

// 应用筛选
function applyFilters() {
  fetchRiskData()
}

// 刷新数据
function refreshData() {
  fetchRiskData()
}

// 编辑账户
function handleEditAccount(account) {
  // 跳转到 CCR 账户管理页面并传递账户 ID
  router.push({
    name: 'CcrAccounts',
    query: { edit: account.accountId }
  })
}

// 组件挂载时获取数据
onMounted(() => {
  fetchRiskData()
})
</script>

<style scoped>
/* 自定义动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
