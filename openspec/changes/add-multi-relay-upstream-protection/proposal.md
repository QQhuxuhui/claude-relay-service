# Change: 多中继上游检测规避策略 (Multi-Relay Upstream Detection Avoidance)

## Why

当前系统使用国内中转服务(如 CloseAI, API2D 等)作为上游 API 提供商时,存在较高的检测和封禁风险:

**现有问题:**
1. **服务条款违规**: 大部分中转服务禁止二次分发,检测到分销行为可能直接封号
2. **并发异常检测**: 单账户4并发已进入中风险区间(检测概率 60-80%),远超个人用户正常并发(1-2)
3. **单点故障风险**: 使用单一上游账户时,账户被封将导致服务完全中断
4. **用量异常检测**: 持续高用量($50-100+/天)容易被标记为分销账户

**业务需求:**
- 用户接受单账户4并发和不限费用的风险等级
- 需要在可接受风险下保持服务可用性
- 需要实现账户级别的风险分散和故障隔离

## What Changes

**功能变更:**

1. **✨ 新增多中继账户管理能力** (ADDED)
   - 支持配置多个不同中转服务账户(CloseAI, API2D, API7, 等)
   - 每个账户独立的并发限制、费用限制配置
   - 账户状态监控和自动故障转移

2. **✨ 新增账户级会话窗口限流** (ADDED)
   - 配置会话窗口时长(如1小时)
   - 窗口内请求数限制(避免短时burst)
   - 窗口内费用限制(账户级日费用控制)
   - 实时使用量监控和提前预警

3. **✨ 新增智能调度策略** (ADDED)
   - 优先级加权负载均衡
   - 考虑账户健康度的动态调度
   - 粘性会话与风险分散的平衡
   - 账户故障自动降级和恢复

4. **✨ 新增风险监控和告警** (ADDED)
   - 账户并发监控和异常检测
   - 费用趋势分析和预警
   - 账户状态变化通知(Webhook)
   - 风险评分和建议(Dashboard)

**配置层级说明:**

### 🌐 全局默认配置 (环境变量)

仅用于设置**系统级默认值**,新账户创建时的初始值:

```bash
# 这些环境变量仅作为默认值,不会覆盖已配置的账户
RELAY_ACCOUNT_SESSION_WINDOW_HOURS=1           # 默认会话窗口(小时)
RELAY_ACCOUNT_MAX_REQUESTS_PER_WINDOW=0        # 默认窗口请求数(0=不限)
RELAY_ACCOUNT_MAX_COST_PER_DAY=0               # 默认日费用限制(0=不限)
RELAY_ACCOUNT_PRIORITY_STRATEGY=priority_lru   # 调度策略(保持现有)
```

### 📝 账户级配置 (Web UI / Admin API)

**所有限流参数都通过 Web UI 或 Admin API 配置**,存储在 Redis 中:

```javascript
// POST /admin/ccr-accounts (创建账户)
// PUT /admin/ccr-accounts/:accountId (更新账户)
{
  // === 现有字段 (保持不变) ===
  "name": "CloseAI Account 1",
  "description": "生产环境主账户",
  "apiUrl": "https://api.closeai.com/v1",
  "apiKey": "sk-xxx",
  "maxConcurrentTasks": 4,        // ✅ 已支持:并发限制
  "priority": 10,                  // ✅ 已支持:优先级(1-100)
  "supportedModels": [],           // ✅ 已支持:支持的模型
  "userAgent": "custom-ua",        // ✅ 已支持:自定义UA
  "rateLimitDuration": 60,         // ✅ 已支持:限流持续时间(分钟)
  "proxy": { ... },                // ✅ 已支持:代理配置
  "accountType": "shared",         // ✅ 已支持:账户类型
  "dailyQuota": 0,                 // ✅ 已支持:每日额度
  "quotaResetTime": "00:00",       // ✅ 已支持:额度重置时间

  // === 新增字段 (完全通过Web UI配置) ===
  "provider": "closeai",           // 🆕 上游提供商标识
  "sessionWindowHours": 1,         // 🆕 会话窗口时长(小时)
  "maxRequestsPerWindow": 100,     // 🆕 窗口内最大请求数(0=不限)
  "maxCostPerDay": 50.0            // 🆕 每日最大费用(0=不限)
}
```

### 🎯 配置优先级

```
账户级配置 (Redis) > 环境变量默认值 > 代码硬编码默认值
```

**关键原则:**
1. ✅ **所有限流参数都在 Web UI 可配置** - 管理员完全控制
2. ✅ **环境变量仅作为默认值** - 不会覆盖已配置的账户
3. ✅ **支持运行时动态修改** - 无需重启服务
4. ✅ **向后兼容** - 现有账户自动使用默认值(0=不限)

## Impact

### Affected Capabilities
- **账户管理系统** (新增 specs/account-management/spec.md)
  - 新增会话窗口限流能力
  - 新增账户级费用限制能力
  - 新增多提供商账户管理
  - **✅ 所有配置都在 Web UI 管理**

- **统一调度器** (修改现有代码)
  - 增强账户选择逻辑(加入会话窗口检查)
  - 增强负载均衡策略(加权轮询)
  - 增强故障转移机制

- **监控和告警** (新增功能)
  - 账户级实时监控
  - 风险评分和告警
  - Webhook事件扩展

### Affected Code Files
- `src/services/ccrAccountService.js` - 新增会话窗口和费用限流逻辑
  - `createAccount()` - 新增4个字段的默认值处理
  - `updateAccount()` - 新增4个字段的更新逻辑
  - `isAccountAvailable()` (新增) - 会话窗口和费用检查

- `src/services/unifiedClaudeScheduler.js` - 增强调度逻辑
  - `_isAccountAvailable()` - 集成新的限流检查
  - `_getAllAvailableAccounts()` - CCR 账户过滤增强

- `src/routes/admin.js` - 扩展账户配置 API
  - `POST /admin/ccr-accounts` - 接受新字段
  - `PUT /admin/ccr-accounts/:accountId` - 接受新字段
  - `GET /admin/ccr-accounts/:accountId/risk-score` (新增) - 风险评分 API

- `web/admin-spa/src/views/AccountsView.vue` - Web UI 扩展
  - 账户创建/编辑表单新增4个字段
  - 实时使用量进度条显示
  - 风险评分卡片显示

- `src/models/redis.js` - **无需修改** (已支持所需查询方法)
  - ✅ `getAccountSessionWindowUsage()` 已存在
  - ✅ `getAccountDailyCost()` 已存在

### Data Migration
- **无破坏性变更**: 新增字段有默认值,兼容现有数据
- 现有账户自动使用默认配置:
  ```javascript
  {
    provider: '',                  // 空字符串
    sessionWindowHours: 1,         // 1小时
    maxRequestsPerWindow: 0,       // 不限制
    maxCostPerDay: 0               // 不限制
  }
  ```
- **无需数据迁移脚本**: 字段通过代码默认值处理

### API Changes

#### 新增 API 端点

```javascript
// 获取账户风险评分
GET /admin/ccr-accounts/:accountId/risk-score
Response: {
  "success": true,
  "data": {
    "riskScore": 75,
    "riskLevel": "high",
    "factors": {
      "concurrencyRatio": 0.95,
      "windowUsageRatio": 0.88,
      "costGrowthRate": 0.5
    },
    "recommendations": [
      "降低并发限制",
      "增加会话窗口时长"
    ]
  }
}
```

#### 扩展现有 API

```javascript
// POST /admin/ccr-accounts (创建账户)
// PUT /admin/ccr-accounts/:accountId (更新账户)
// 新增请求体字段:
{
  "provider": "closeai",           // 可选
  "sessionWindowHours": 1,         // 可选,默认1
  "maxRequestsPerWindow": 100,     // 可选,默认0
  "maxCostPerDay": 50.0            // 可选,默认0
}

// 响应体新增字段(相同)
```

### Risk Assessment

**技术风险:**
- 🟢 **低**: 会话窗口统计复用现有 Redis 查询,性能影响<5ms
- 🟢 **低**: 账户配置存储在 Redis,已有完整的 CRUD 流程
- 🟢 **低**: Web UI 字段扩展简单,仅需添加表单项

**业务风险:**
- 🟡 **中等**: 单账户4并发仍有 60-80% 检测概率(用户已知并接受)
- 🟢 **低**: 多账户分散可降低单点故障风险
- 🟡 **中等**: 不限费用可能导致成本失控(需监控告警)

**用户影响:**
- 🟢 **正面**: 所有配置都在 Web UI 管理,无需修改环境变量
- 🟢 **正面**: 支持运行时动态调整,无需重启服务
- 🟢 **正面**: 向后兼容,现有账户无感知升级

### Breaking Changes
- **无破坏性变更**,完全向后兼容

### Performance Impact
- **查询开销**: 每次调度增加会话窗口查询(<5ms,使用 Redis Pipeline 优化)
- **存储开销**: 每账户新增 4 个配置字段(忽略不计)
- **计算开销**: 账户选择增加会话窗口检查逻辑(<1ms)
- **总体影响**: 预期 P99 延迟增加 <10ms

### Security Impact
- 🟢 **正面**: 账户隔离降低单点风险
- 🟢 **正面**: 费用限制防止恶意消耗
- 🟢 **中性**: 无新的安全漏洞引入
- 🟢 **正面**: 所有配置都需要管理员认证(authenticateAdmin 中间件)
