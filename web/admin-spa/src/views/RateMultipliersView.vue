<template>
  <div class="rate-multipliers-container">
    <div class="card p-4 sm:p-6">
      <!-- 页面标题 -->
      <div class="mb-4 sm:mb-6">
        <h3 class="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100 sm:mb-2 sm:text-xl">
          <i class="fas fa-percentage mr-2 text-blue-500"></i>
          费率倍率配置
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 sm:text-base">
          配置不同服务类型的计费倍率，倍率1.0表示按原价计费，0.5表示50%计费
        </p>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="py-12 text-center">
        <div class="loading-spinner mx-auto mb-4"></div>
        <p class="text-gray-500 dark:text-gray-400">正在加载配置...</p>
      </div>

      <!-- 内容区域 -->
      <div v-else>
        <!-- 提示信息 -->
        <div
          class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/30"
        >
          <div class="flex items-start">
            <i class="fas fa-info-circle mr-3 mt-1 text-blue-500"></i>
            <div class="flex-1">
              <p class="text-sm text-blue-800 dark:text-blue-300">
                倍率范围：0.1x - 10.0x
                <span class="mx-2">|</span>
                例如：设置OpenAI倍率为0.5，则OpenAI账户的计费为原价的50%
              </p>
            </div>
          </div>
        </div>

        <!-- 桌面端表格视图 -->
        <div class="table-container hidden sm:block">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  服务平台
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  费率倍率
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  状态
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200/50 dark:divide-gray-600/50">
              <tr
                v-for="platform in platformList"
                :key="platform.key"
                class="table-row hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
              >
                <td class="whitespace-nowrap px-6 py-4">
                  <div class="flex items-center">
                    <div
                      :class="[
                        'mr-3 flex h-10 w-10 items-center justify-center rounded-lg',
                        platform.color
                      ]"
                    >
                      <i :class="[platform.icon, 'text-white']"></i>
                    </div>
                    <div>
                      <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {{ platform.name }}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        {{ platform.description }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <input
                      v-model.number="multipliers[platform.key]"
                      :class="[
                        'form-input w-32 text-center dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200',
                        !isValid(platform.key)
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : ''
                      ]"
                      max="10"
                      min="0.1"
                      placeholder="1.0"
                      step="0.1"
                      type="number"
                      @input="validateMultiplier(platform.key)"
                    />
                    <span class="text-sm text-gray-500 dark:text-gray-400">×</span>
                    <span
                      v-if="isModified(platform.key)"
                      class="text-xs font-medium text-amber-600 dark:text-amber-400"
                    >
                      <i class="fas fa-pencil-alt mr-1"></i>已修改
                    </span>
                  </div>
                  <p v-if="!isValid(platform.key)" class="mt-1 text-xs text-red-500">
                    倍率必须在0.1到10.0之间
                  </p>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span
                      v-if="multipliers[platform.key] < 1"
                      class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >
                      <i class="fas fa-arrow-down mr-1"></i>优惠计费
                    </span>
                    <span
                      v-else-if="multipliers[platform.key] === 1"
                      class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      <i class="fas fa-equals mr-1"></i>原价计费
                    </span>
                    <span
                      v-else
                      class="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    >
                      <i class="fas fa-arrow-up mr-1"></i>溢价计费
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 移动端卡片视图 -->
        <div class="space-y-4 sm:hidden">
          <div
            v-for="platform in platformList"
            :key="platform.key"
            class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="mb-3 flex items-center">
              <div :class="['mr-3 flex h-10 w-10 items-center justify-center rounded-lg', platform.color]">
                <i :class="[platform.icon, 'text-white']"></i>
              </div>
              <div class="flex-1">
                <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ platform.name }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ platform.description }}
                </div>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <input
                  v-model.number="multipliers[platform.key]"
                  :class="[
                    'form-input flex-1 text-center dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200',
                    !isValid(platform.key) ? 'border-red-500' : ''
                  ]"
                  max="10"
                  min="0.1"
                  step="0.1"
                  type="number"
                  @input="validateMultiplier(platform.key)"
                />
                <span class="text-sm text-gray-500 dark:text-gray-400">×</span>
              </div>
              <p v-if="!isValid(platform.key)" class="text-xs text-red-500">
                倍率必须在0.1到10.0之间
              </p>
              <div class="flex items-center justify-between">
                <span
                  v-if="isModified(platform.key)"
                  class="text-xs font-medium text-amber-600 dark:text-amber-400"
                >
                  <i class="fas fa-pencil-alt mr-1"></i>已修改
                </span>
                <span
                  v-if="multipliers[platform.key] < 1"
                  class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                >
                  优惠计费
                </span>
                <span
                  v-else-if="multipliers[platform.key] === 1"
                  class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  原价计费
                </span>
                <span
                  v-else
                  class="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                >
                  溢价计费
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              :disabled="!hasChanges || !allValid || saving"
              class="btn btn-primary flex-1 sm:flex-none"
              @click="saveMultipliers"
            >
              <i v-if="!saving" class="fas fa-save mr-2"></i>
              <div v-else class="loading-spinner-small mr-2"></div>
              {{ saving ? '保存中...' : '保存配置' }}
            </button>
            <button :disabled="saving" class="btn btn-secondary flex-1 sm:flex-none" @click="resetToDefaults">
              <i class="fas fa-undo mr-2"></i>
              重置默认
            </button>
          </div>
          <button
            v-if="hasChanges"
            :disabled="saving"
            class="btn btn-ghost flex-1 sm:flex-none"
            @click="cancelChanges"
          >
            <i class="fas fa-times mr-2"></i>
            取消更改
          </button>
        </div>

        <!-- 预览区域 -->
        <div v-if="hasChanges" class="mt-6">
          <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
            <h4 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <i class="fas fa-eye mr-2"></i>更改预览
            </h4>
            <div class="space-y-2">
              <div
                v-for="platform in changedPlatforms"
                :key="platform.key"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-gray-600 dark:text-gray-400">{{ platform.name }}：</span>
                <span class="font-mono font-medium text-gray-900 dark:text-gray-100">
                  {{ originalMultipliers[platform.key] }}x
                  <i class="fas fa-arrow-right mx-2 text-gray-400"></i>
                  <span
                    :class="
                      multipliers[platform.key] < originalMultipliers[platform.key]
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-orange-600 dark:text-orange-400'
                    "
                  >
                    {{ multipliers[platform.key] }}x
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import axios from 'axios'

const { showToast } = useToast()

// 状态
const loading = ref(true)
const saving = ref(false)
const multipliers = ref({})
const originalMultipliers = ref({})
const validationErrors = ref({})

// 平台配置
const platformList = [
  {
    key: 'claude',
    name: 'Claude Official',
    description: 'Anthropic官方账户',
    icon: 'fas fa-robot',
    color: 'bg-gradient-to-br from-purple-500 to-purple-600'
  },
  {
    key: 'claude-console',
    name: 'Claude Console',
    description: 'Claude Console账户',
    icon: 'fas fa-terminal',
    color: 'bg-gradient-to-br from-indigo-500 to-indigo-600'
  },
  {
    key: 'gemini',
    name: 'Gemini',
    description: 'Google Gemini账户',
    icon: 'fas fa-gem',
    color: 'bg-gradient-to-br from-blue-500 to-blue-600'
  },
  {
    key: 'openai',
    name: 'OpenAI',
    description: 'OpenAI兼容账户',
    icon: 'fas fa-brain',
    color: 'bg-gradient-to-br from-green-500 to-green-600'
  },
  {
    key: 'openai-responses',
    name: 'OpenAI Responses',
    description: 'OpenAI Codex账户',
    icon: 'fas fa-code',
    color: 'bg-gradient-to-br from-teal-500 to-teal-600'
  },
  {
    key: 'bedrock',
    name: 'AWS Bedrock',
    description: 'Amazon Bedrock账户',
    icon: 'fab fa-aws',
    color: 'bg-gradient-to-br from-orange-500 to-orange-600'
  },
  {
    key: 'azure-openai',
    name: 'Azure OpenAI',
    description: 'Microsoft Azure OpenAI',
    icon: 'fab fa-microsoft',
    color: 'bg-gradient-to-br from-cyan-500 to-cyan-600'
  },
  {
    key: 'droid',
    name: 'Droid (Factory.ai)',
    description: 'Factory.ai账户',
    icon: 'fas fa-android',
    color: 'bg-gradient-to-br from-lime-500 to-lime-600'
  },
  {
    key: 'ccr',
    name: 'CCR',
    description: 'CCR账户',
    icon: 'fas fa-server',
    color: 'bg-gradient-to-br from-pink-500 to-pink-600'
  }
]

// 计算属性
const hasChanges = computed(() => {
  return platformList.some((p) => multipliers.value[p.key] !== originalMultipliers.value[p.key])
})

const allValid = computed(() => {
  return platformList.every((p) => isValid(p.key))
})

const changedPlatforms = computed(() => {
  return platformList.filter((p) => multipliers.value[p.key] !== originalMultipliers.value[p.key])
})

// 方法
const loadMultipliers = async () => {
  try {
    loading.value = true
    const token = localStorage.getItem('admin_token')
    const response = await axios.get('/admin/rate-multipliers', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      multipliers.value = { ...response.data.multipliers }
      originalMultipliers.value = { ...response.data.multipliers }
      showToast('配置加载成功', 'success')
    }
  } catch (error) {
    console.error('Failed to load multipliers:', error)
    showToast(error.response?.data?.message || '加载配置失败', 'error')
  } finally {
    loading.value = false
  }
}

const validateMultiplier = (key) => {
  const value = multipliers.value[key]
  if (value === null || value === undefined || value === '') {
    validationErrors.value[key] = true
    return false
  }
  const num = parseFloat(value)
  const valid = !isNaN(num) && num >= 0.1 && num <= 10.0
  validationErrors.value[key] = !valid
  return valid
}

const isValid = (key) => {
  return !validationErrors.value[key]
}

const isModified = (key) => {
  return multipliers.value[key] !== originalMultipliers.value[key]
}

const saveMultipliers = async () => {
  if (!allValid.value) {
    showToast('请修正无效的倍率值', 'error')
    return
  }

  try {
    saving.value = true
    const token = localStorage.getItem('admin_token')

    // 只发送修改过的倍率
    const updates = {}
    changedPlatforms.value.forEach((p) => {
      updates[p.key] = multipliers.value[p.key]
    })

    const response = await axios.put('/admin/rate-multipliers', updates, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      originalMultipliers.value = { ...response.data.multipliers }
      multipliers.value = { ...response.data.multipliers }
      showToast('配置保存成功', 'success')
    }
  } catch (error) {
    console.error('Failed to save multipliers:', error)
    showToast(error.response?.data?.message || '保存配置失败', 'error')
  } finally {
    saving.value = false
  }
}

const resetToDefaults = async () => {
  if (
    !confirm(
      '确定要重置为默认配置吗？\n\n默认配置：\n- OpenAI / OpenAI Responses: 0.5x\n- 其他平台: 1.0x'
    )
  ) {
    return
  }

  try {
    saving.value = true
    const token = localStorage.getItem('admin_token')
    const response = await axios.post(
      '/admin/rate-multipliers/reset',
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    if (response.data.success) {
      originalMultipliers.value = { ...response.data.multipliers }
      multipliers.value = { ...response.data.multipliers }
      showToast('已重置为默认配置', 'success')
    }
  } catch (error) {
    console.error('Failed to reset multipliers:', error)
    showToast(error.response?.data?.message || '重置配置失败', 'error')
  } finally {
    saving.value = false
  }
}

const cancelChanges = () => {
  multipliers.value = { ...originalMultipliers.value }
  validationErrors.value = {}
  showToast('已取消更改', 'info')
}

// 生命周期
onMounted(() => {
  loadMultipliers()
})
</script>

<style scoped>
.rate-multipliers-container {
  @apply mx-auto max-w-6xl;
}

.table-row {
  @apply transition-colors duration-150;
}

.loading-spinner-small {
  @apply inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent;
}

/* 数字输入框优化 */
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  @apply opacity-100;
}

input[type='number'] {
  -moz-appearance: textfield;
}
</style>
