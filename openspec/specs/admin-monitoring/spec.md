# admin-monitoring Specification

## Purpose
TBD - created by archiving change add-admin-risk-monitor. Update Purpose after archive.
## Requirements
### Requirement: 风险评分计算

系统 SHALL 为每个 CCR 账户计算风险评分（0-100），基于以下因素：

- **并发利用率**（权重 40%）: `currentConcurrency / maxConcurrentTasks`
- **窗口使用率**（权重 35%）: `requestsInWindow / maxRequestsPerWindow`
- **费用趋势评分**（权重 25%）: `costToday / maxCostPerDay`

风险等级分类 SHALL 遵循以下规则：
- 0-30: 低风险（low）
- 31-60: 中风险（medium）
- 61-80: 高风险（high）
- 81-100: 极高风险（critical）

#### Scenario: 计算正常账户风险评分

- **GIVEN** CCR 账户配置: `maxConcurrentTasks=4, maxRequestsPerWindow=100, maxCostPerDay=50`
- **WHEN** 当前使用量: `concurrency=2, requestsInWindow=45, costToday=20`
- **THEN** 系统 SHALL 计算风险评分为 42（中风险）
  - 并发利用率: 50% × 0.4 = 20
  - 窗口使用率: 45% × 0.35 = 15.75
  - 费用趋势: 40% × 0.25 = 10
  - 总分: 45.75 ≈ 46

#### Scenario: 识别高风险账户

- **GIVEN** CCR 账户配置: `maxConcurrentTasks=4, maxRequestsPerWindow=100, maxCostPerDay=50`
- **WHEN** 当前使用量: `concurrency=3, requestsInWindow=88, costToday=42`
- **THEN** 系统 SHALL 计算风险评分为 81（极高风险）
  - 并发利用率: 75% × 0.4 = 30
  - 窗口使用率: 88% × 0.35 = 30.8
  - 费用趋势: 84% × 0.25 = 21
  - 总分: 81.8 ≈ 82

#### Scenario: 处理未配置限制的账户

- **GIVEN** CCR 账户配置: `maxRequestsPerWindow=0, maxCostPerDay=0`（不限制）
- **WHEN** 计算风险评分
- **THEN** 系统 SHALL 对未配置的限制项使用评分为 0
- **AND** 仅基于已配置的限制计算总分

### Requirement: 风险建议生成

系统 SHALL 基于风险因素自动生成改进建议，遵循以下规则：

- **并发利用率 > 90%**: 建议"降低并发限制或增加账户"
- **窗口使用率 > 85%**: 建议"增加会话窗口时长"
- **费用趋势 > 80%**: 建议"检查费用异常或增加每日限额"
- **多个高风险因素**: 建议"考虑添加新账户分散风险"

#### Scenario: 生成并发告警建议

- **GIVEN** 账户并发利用率为 95%
- **WHEN** 生成风险建议
- **THEN** 系统 SHALL 返回建议: "并发利用率过高，建议降低并发限制或增加账户"

#### Scenario: 生成窗口限流建议

- **GIVEN** 账户窗口使用率为 92%
- **WHEN** 生成风险建议
- **THEN** 系统 SHALL 返回建议: "窗口请求数接近上限，建议增加会话窗口时长"

#### Scenario: 生成多项建议

- **GIVEN** 账户并发利用率 95%、窗口使用率 90%
- **WHEN** 生成风险建议
- **THEN** 系统 SHALL 返回多条建议（数组）
- **AND** 每条建议对应一个高风险因素

### Requirement: 单账户风险查询 API

系统 SHALL 提供 `GET /admin/ccr-accounts/:accountId/risk-score` API 端点，要求：

- **认证**: MUST 使用 `authenticateAdmin` 中间件验证管理员身份
- **响应格式**: SHALL 返回 JSON 对象包含:
  - `accountId`: 账户 ID
  - `accountName`: 账户名称
  - `riskScore`: 风险评分（0-100）
  - `riskLevel`: 风险等级（low/medium/high/critical）
  - `factors`: 风险因素详情对象
  - `currentUsage`: 实时使用量对象
  - `recommendations`: 建议数组
- **错误处理**: SHALL 处理账户不存在（404）和查询失败（500）情况

#### Scenario: 查询已存在账户的风险评分

- **GIVEN** CCR 账户 `ccr_123` 存在且可用
- **WHEN** 管理员请求 `GET /admin/ccr-accounts/ccr_123/risk-score`
- **THEN** 系统 SHALL 返回 200 状态码
- **AND** 响应包含完整的风险评分数据
- **AND** `riskScore` 是 0-100 的数字
- **AND** `riskLevel` 是有效的风险等级字符串

#### Scenario: 查询不存在的账户

- **GIVEN** CCR 账户 `ccr_nonexist` 不存在
- **WHEN** 管理员请求 `GET /admin/ccr-accounts/ccr_nonexist/risk-score`
- **THEN** 系统 SHALL 返回 404 状态码
- **AND** 响应包含错误消息: "账户不存在"

#### Scenario: Redis 查询失败

- **GIVEN** Redis 连接异常
- **WHEN** 管理员请求风险评分
- **THEN** 系统 SHALL 返回 500 状态码
- **AND** 响应包含详细错误信息用于调试

### Requirement: 风险概览查询 API

系统 SHALL 提供 `GET /admin/dashboard/relay-risk` API 端点，要求：

- **认证**: MUST 使用 `authenticateAdmin` 中间件
- **查询参数**: SHALL 支持可选参数:
  - `provider`: 按提供商过滤（如 closeai, api2d）
  - `riskLevel`: 按风险等级过滤（如 high, critical）
  - `sortBy`: 排序字段（riskScore, costToday, requestsInWindow）
- **响应格式**: SHALL 返回 JSON 对象包含:
  - `summary`: 统计摘要对象（totalAccounts, lowRisk, mediumRisk, highRisk, criticalRisk）
  - `accounts`: 账户数组，每项包含风险评分和使用量
- **性能**: SHALL 在 1 秒内返回 20 个账户的数据

#### Scenario: 获取所有账户风险概览

- **GIVEN** 系统有 5 个 CCR 账户
- **WHEN** 管理员请求 `GET /admin/dashboard/relay-risk`
- **THEN** 系统 SHALL 返回 200 状态码
- **AND** `summary` 对象包含正确的分组统计
- **AND** `accounts` 数组包含 5 个账户的风险数据
- **AND** 默认按风险评分降序排列

#### Scenario: 按提供商过滤

- **GIVEN** 系统有 3 个 closeai 账户和 2 个 api2d 账户
- **WHEN** 管理员请求 `GET /admin/dashboard/relay-risk?provider=closeai`
- **THEN** 系统 SHALL 仅返回 3 个 closeai 账户
- **AND** 统计摘要仅计算这 3 个账户

#### Scenario: 按风险等级过滤

- **GIVEN** 系统有 2 个高风险账户和 3 个低风险账户
- **WHEN** 管理员请求 `GET /admin/dashboard/relay-risk?riskLevel=high`
- **THEN** 系统 SHALL 仅返回 2 个高风险账户
- **AND** `summary.highRisk` 值为 2

#### Scenario: 按费用排序

- **GIVEN** 系统有多个账户
- **WHEN** 管理员请求 `GET /admin/dashboard/relay-risk?sortBy=costToday`
- **THEN** 系统 SHALL 按 `costToday` 降序返回账户列表
- **AND** 第一个账户的费用最高

### Requirement: 风险监控页面

系统 SHALL 提供 Web 管理界面页面 `/admin-next/risk-monitor`，要求：

- **路由**: SHALL 注册为 `/risk-monitor` 路径
- **认证**: MUST 要求管理员登录
- **布局**: SHALL 包含以下区域:
  - 顶部工具栏（刷新按钮、筛选器）
  - 风险统计概览卡片
  - 账户风险卡片网格
- **响应式**: SHALL 支持移动端（1列）、平板（2列）、桌面（3列）布局
- **暗黑模式**: SHALL 支持明亮和暗黑主题切换

#### Scenario: 首次加载页面

- **GIVEN** 管理员已登录
- **WHEN** 访问 `/admin-next/risk-monitor` 页面
- **THEN** 系统 SHALL 显示加载状态（骨架屏）
- **AND** 调用 `GET /admin/dashboard/relay-risk` API
- **AND** 加载完成后显示统计概览和账户列表

#### Scenario: 显示风险统计概览

- **GIVEN** API 返回统计数据: `{ totalAccounts: 5, lowRisk: 2, mediumRisk: 1, highRisk: 1, criticalRisk: 1 }`
- **WHEN** 页面渲染统计概览
- **THEN** 系统 SHALL 显示 5 个统计卡片
- **AND** 每个卡片显示对应的数量和百分比
- **AND** 使用颜色区分风险等级（绿/黄/橙/红）

#### Scenario: 显示账户风险卡片

- **GIVEN** API 返回账户数据
- **WHEN** 页面渲染账户列表
- **THEN** 系统 SHALL 为每个账户显示风险评分卡片
- **AND** 卡片包含：账户名称、风险评分、风险等级、使用量进度条
- **AND** 使用响应式网格布局

#### Scenario: 筛选高风险账户

- **GIVEN** 页面已加载所有账户
- **WHEN** 用户选择风险等级筛选器 "high"
- **THEN** 系统 SHALL 仅显示高风险和极高风险账户
- **AND** 统计概览更新为筛选后的数据

#### Scenario: 手动刷新数据

- **GIVEN** 页面已加载
- **WHEN** 用户点击刷新按钮
- **THEN** 系统 SHALL 显示加载状态
- **AND** 重新调用 API 获取最新数据
- **AND** 更新显示内容

#### Scenario: 无 CCR 账户时的空状态

- **GIVEN** 系统没有任何 CCR 账户
- **WHEN** 访问风险监控页面
- **THEN** 系统 SHALL 显示空状态提示
- **AND** 提供"添加 CCR 账户"的引导链接

### Requirement: 风险评分卡片组件

系统 SHALL 提供可复用的 `RiskScoreCard` Vue 组件，要求：

- **Props**: SHALL 接受 `account` 对象（包含 riskScore, riskLevel, currentUsage, recommendations）
- **显示内容**: SHALL 包含:
  - 账户名称和提供商标识
  - 风险评分大数字显示（带圆形进度环）
  - 风险等级徽章（颜色编码）
  - 三个使用量进度条（窗口请求、每日费用、并发）
  - 风险建议列表（可折叠）
- **交互**: SHALL 提供"编辑账户"快捷链接
- **样式**: SHALL 支持响应式和暗黑模式

#### Scenario: 显示中风险账户卡片

- **GIVEN** 账户风险评分为 45（中风险）
- **WHEN** 渲染 `RiskScoreCard` 组件
- **THEN** 系统 SHALL 显示黄色风险等级徽章
- **AND** 圆形进度环为 45% 黄色
- **AND** 三个进度条显示实际使用量

#### Scenario: 显示风险建议

- **GIVEN** 账户有 2 条风险建议
- **WHEN** 用户点击"查看建议"
- **THEN** 系统 SHALL 展开显示建议列表
- **AND** 每条建议前有警告图标
- **AND** 可点击折叠按钮隐藏建议

#### Scenario: 快速编辑账户

- **GIVEN** 卡片显示账户信息
- **WHEN** 用户点击"编辑账户"链接
- **THEN** 系统 SHALL 导航到账户编辑页面
- **AND** 预填充该账户的信息

### Requirement: 使用量进度条组件

系统 SHALL 提供可复用的 `UsageProgressBar` Vue 组件，要求：

- **Props**: SHALL 接受:
  - `current`: 当前值（数字）
  - `max`: 最大值（数字）
  - `label`: 标签文本
  - `unit`: 单位（如 "$", "次"）
  - `showPercentage`: 是否显示百分比
- **颜色逻辑**: SHALL 根据使用率自动调整颜色:
  - 0-60%: 绿色渐变
  - 61-80%: 黄色渐变
  - 81-100%: 红色渐变
- **显示格式**: SHALL 显示 "当前值 / 最大值 (百分比%)"
- **样式**: SHALL 支持响应式和暗黑模式

#### Scenario: 显示正常使用量

- **GIVEN** `current=45, max=100, label="窗口请求数", unit="次"`
- **WHEN** 渲染进度条
- **THEN** 系统 SHALL 显示绿色渐变进度条
- **AND** 显示文本 "45 / 100 (45%)"
- **AND** 进度条宽度为 45%

#### Scenario: 显示接近限制的使用量

- **GIVEN** `current=88, max=100, label="窗口请求数", unit="次"`
- **WHEN** 渲染进度条
- **THEN** 系统 SHALL 显示红色渐变进度条
- **AND** 显示文本 "88 / 100 (88%)"
- **AND** 进度条宽度为 88%

#### Scenario: 处理无限制情况

- **GIVEN** `current=150, max=0, label="窗口请求数", unit="次"`
- **WHEN** 渲染进度条
- **THEN** 系统 SHALL 显示 "150 / 不限制"
- **AND** 不显示百分比和进度条
- **OR** 显示灰色满格进度条表示"无限制"

### Requirement: 性能和缓存优化

系统 SHALL 优化风险监控查询性能，要求：

- **批量查询**: SHALL 使用 Redis Pipeline 并行查询多个账户的使用统计
- **查询超时**: SHALL 设置 10 秒超时，超时返回 503 状态码
- **LRU 缓存**: SHALL 缓存风险评分结果 5 分钟
- **并行计算**: SHALL 使用 `Promise.all` 并行计算多个账户的风险评分
- **性能目标**: SHALL 在 500ms 内返回 5 个账户的数据，1 秒内返回 20 个账户

#### Scenario: 批量查询性能测试

- **GIVEN** 系统有 5 个 CCR 账户
- **WHEN** 调用 `GET /admin/dashboard/relay-risk`
- **THEN** 系统 SHALL 使用单次 Redis Pipeline 查询所有账户统计
- **AND** 响应时间 < 500ms

#### Scenario: 缓存命中

- **GIVEN** 风险评分结果已缓存（未过期）
- **WHEN** 再次查询相同账户的风险评分
- **THEN** 系统 SHALL 从缓存返回结果
- **AND** 不查询 Redis
- **AND** 响应时间 < 10ms

#### Scenario: 查询超时处理

- **GIVEN** Redis 查询响应缓慢
- **WHEN** 查询时间超过 10 秒
- **THEN** 系统 SHALL 中断查询
- **AND** 返回 503 状态码
- **AND** 错误消息: "查询超时，请稍后重试"

