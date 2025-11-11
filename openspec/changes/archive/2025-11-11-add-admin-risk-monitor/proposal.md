# Change: 添加管理员风险监控页面 (Admin Risk Monitor)

## Why

当前 `add-multi-relay-upstream-protection` 功能已实现账户级别的会话窗口限流和费用限制配置（40% 完成度），但**缺少可视化监控界面**，导致：

**现有问题**:
1. **配置黑盒**: 管理员配置限流参数后，无法看到实时使用情况
2. **风险盲区**: 无法评估账户当前的风险状态（高并发、高费用）
3. **被动响应**: 只能在账户被封后才发现问题，缺少主动预警
4. **运维困难**: 需要手动查询 Redis 或日志才能了解账户健康度

**业务需求**:
- 管理员需要直观看到所有 CCR 账户的风险状态
- 快速识别高风险账户并采取措施
- 监控实时使用量，避免触发限流
- 提供运维决策依据（是否需要添加账户、调整限流参数）

## What Changes

**功能变更**:

1. **新增风险监控页面** (ADDED)
   - 新建 `/admin-next/risk-monitor` 路由和页面组件
   - 显示所有 CCR 账户的风险概览
   - 按风险等级分组显示（低/中/高/极高）
   - 支持响应式布局和暗黑模式

2. **新增风险评分卡片** (ADDED)
   - 显示账户风险评分（0-100）
   - 风险等级标识（颜色编码）
   - 实时使用量进度条（窗口请求数、每日费用）
   - 风险因素简要说明

3. **新增后端 API** (ADDED)
   - `GET /admin/ccr-accounts/:id/risk-score` - 获取单账户风险评分
   - `GET /admin/dashboard/relay-risk` - 获取所有账户风险概览
   - 风险评分算法实现（并发利用率、窗口使用率、费用增长率）

4. **扩展账户列表** (MODIFIED)
   - 在账户列表页添加实时使用量显示（可选，简化版）
   - 添加"查看风险详情"快捷链接

**简化版特点**:
- ✅ **无需 ECharts**: 使用 CSS 进度条和卡片展示，降低复杂度
- ✅ **快速实现**: 复用现有组件和样式系统
- ✅ **核心功能**: 专注于风险评分和实时使用量展示
- 🔮 **可扩展**: 未来可升级为带图表的完整版

## Impact

### Affected Capabilities
- **管理员监控系统** (新增 specs/admin-monitoring/spec.md)
  - 新增风险监控页面能力
  - 新增风险评分计算能力
  - 新增实时使用量查询能力

### Affected Code Files

#### 前端新增文件
- `web/admin-spa/src/views/RiskMonitorView.vue` - 风险监控主页面
- `web/admin-spa/src/components/risk/RiskScoreCard.vue` - 风险评分卡片
- `web/admin-spa/src/components/risk/UsageProgressBar.vue` - 使用量进度条

#### 前端修改文件
- `web/admin-spa/src/router/index.js` - 添加路由
- `web/admin-spa/src/views/AccountsView.vue` - 添加风险详情链接（可选）

#### 后端新增文件
- `src/utils/riskScorer.js` - 风险评分算法
- `src/services/riskMonitorService.js` - 风险监控服务

#### 后端修改文件
- `src/routes/admin.js` - 添加风险监控 API 端点
- `src/services/ccrAccountService.js` - 扩展使用统计查询方法

### Data Requirements

**新增 API 响应格式**:

```javascript
// GET /admin/ccr-accounts/:id/risk-score
{
  "success": true,
  "data": {
    "accountId": "ccr_123",
    "accountName": "CloseAI Account 1",
    "riskScore": 75,              // 0-100
    "riskLevel": "high",          // low/medium/high/critical
    "factors": {
      "concurrencyUtilization": 0.95,    // 并发利用率
      "windowUsageRatio": 0.88,          // 窗口使用率
      "costTrendScore": 0.65             // 费用趋势评分
    },
    "currentUsage": {
      "requestsInWindow": 88,
      "maxRequestsPerWindow": 100,
      "costToday": 38.50,
      "maxCostPerDay": 50.00,
      "concurrentRequests": 3,
      "maxConcurrentTasks": 4
    },
    "recommendations": [
      "并发利用率过高，建议降低并发限制或增加账户",
      "窗口请求数接近上限，建议增加会话窗口时长"
    ]
  }
}

// GET /admin/dashboard/relay-risk
{
  "success": true,
  "data": {
    "summary": {
      "totalAccounts": 5,
      "lowRisk": 2,
      "mediumRisk": 1,
      "highRisk": 1,
      "criticalRisk": 1
    },
    "accounts": [
      {
        "id": "ccr_123",
        "name": "CloseAI Account 1",
        "provider": "closeai",
        "riskScore": 85,
        "riskLevel": "critical",
        "currentUsage": { ... }
      },
      // ... 更多账户
    ]
  }
}
```

### API Changes

#### 新增 API 端点

```javascript
// 获取单账户风险评分
GET /admin/ccr-accounts/:accountId/risk-score
Response: { success, data: { accountId, riskScore, riskLevel, factors, currentUsage, recommendations } }

// 获取所有账户风险概览
GET /admin/dashboard/relay-risk
Response: { success, data: { summary, accounts } }
Query Params:
  - provider?: string (过滤提供商)
  - riskLevel?: string (过滤风险等级)
  - sortBy?: string (排序字段: riskScore|costToday|requestsInWindow)
```

### Risk Assessment

**技术风险**:
- 🟢 **低**: 风险评分算法简单（加权平均），无复杂计算
- 🟢 **低**: 前端组件复用现有样式系统，开发快速
- 🟢 **低**: API 复用现有 Redis 查询方法，性能影响小

**业务风险**:
- 🟢 **低**: 纯展示功能，不改变现有业务逻辑
- 🟡 **中等**: 风险评分算法可能需要根据实际情况调优

**用户影响**:
- 🟢 **正面**: 提供可视化监控，大幅提升运维效率
- 🟢 **正面**: 简化版快速交付，满足核心需求
- 🟢 **正面**: 完全向后兼容，不影响现有功能

### Breaking Changes
- **无破坏性变更**，纯新增功能

### Performance Impact
- **查询开销**: 每次刷新页面需查询所有账户统计（<100ms，使用 Redis Pipeline）
- **计算开销**: 风险评分计算（<10ms per account）
- **总体影响**: 预期页面加载时间 <500ms（5个账户）

### Security Impact
- 🟢 **中性**: 所有 API 都需要管理员认证（authenticateAdmin 中间件）
- 🟢 **正面**: 不暴露敏感凭据，仅展示统计数据
- 🟢 **中性**: 无新的安全漏洞引入
