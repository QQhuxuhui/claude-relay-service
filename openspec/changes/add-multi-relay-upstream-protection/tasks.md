# Implementation Tasks

## 1. 数据模型和存储层 (Data Model & Storage Layer)

- [ ] 1.1 扩展 CCR 账户数据结构
  - [ ] 1.1.1 在 `ccrAccountService.js` 添加新字段: `sessionWindowHours`, `maxRequestsPerWindow`, `maxCostPerDay`, `provider`
  - [ ] 1.1.2 添加字段验证逻辑和默认值处理
  - [ ] 1.1.3 更新 `createAccount` 和 `updateAccount` 方法支持新字段

- [ ] 1.2 扩展 Redis 统计查询能力
  - [ ] 1.2.1 验证现有 `redis.js` 的 `getAccountSessionWindowUsage()` 方法支持会话窗口查询
  - [ ] 1.2.2 新增 `getAccountDailyUsageSummary()` 方法用于日费用统计
  - [ ] 1.2.3 添加 Pipeline 批量查询优化(多账户并行查询)

- [ ] 1.3 创建数据迁移脚本
  - [ ] 1.3.1 实现 `scripts/migrate-relay-account-limits.js` 脚本
  - [ ] 1.3.2 添加干跑模式(`--dry-run`)和数据验证
  - [ ] 1.3.3 编写迁移文档(添加到 `scripts/README.md`)

## 2. 账户管理服务层 (Account Service Layer)

- [ ] 2.1 实现会话窗口限流逻辑
  - [ ] 2.1.1 在 `ccrAccountService.js` 添加 `isAccountSessionWindowExceeded(accountId)` 方法
  - [ ] 2.1.2 实现窗口内请求数检查(基于 `redis.getAccountSessionWindowUsage()`)
  - [ ] 2.1.3 添加窗口时间动态计算逻辑(基于账户配置的 `sessionWindowHours`)

- [ ] 2.2 实现账户级费用限流逻辑
  - [ ] 2.2.1 在 `ccrAccountService.js` 添加 `isAccountDailyCostExceeded(accountId)` 方法
  - [ ] 2.2.2 实现每日费用统计查询(复用 `redis.getAccountDailyCost()`)
  - [ ] 2.2.3 添加费用预警机制(80% 阈值告警)

- [ ] 2.3 扩展账户状态检查
  - [ ] 2.3.1 在 `unifiedClaudeScheduler.js` 的 `_isAccountAvailable()` 中集成会话窗口检查
  - [ ] 2.3.2 在 `_getAllAvailableAccounts()` CCR 部分集成费用限制检查
  - [ ] 2.3.3 添加详细的调试日志(账户排除原因)

## 3. 调度器增强 (Scheduler Enhancement)

- [ ] 3.1 增强账户选择逻辑
  - [ ] 3.1.1 在 `unifiedClaudeScheduler._selectCcrAccount()` 中添加会话窗口过滤
  - [ ] 3.1.2 在 `_getAvailableCcrAccounts()` 中添加费用限制过滤
  - [ ] 3.1.3 优化错误消息(区分不同失败原因: 并发满/窗口限流/费用超限)

- [ ] 3.2 实现加权负载均衡
  - [ ] 3.2.1 在 `_sortAccountsByPriority()` 中保持现有优先级排序
  - [ ] 3.2.2 添加配置选项 `RELAY_ACCOUNT_PRIORITY_STRATEGY` (默认: priority+lru)
  - [ ] 3.2.3 文档化调度策略(添加到 `CLAUDE.md`)

- [ ] 3.3 优化粘性会话策略
  - [ ] 3.3.1 验证粘性会话与多账户的兼容性
  - [ ] 3.3.2 添加会话失效时的智能降级(自动选择同提供商的其他账户)
  - [ ] 3.3.3 添加会话映射清理逻辑(账户不可用时)

## 4. 监控和告警 (Monitoring & Alerting)

- [ ] 4.1 实现账户监控指标
  - [ ] 4.1.1 创建 `src/utils/accountMonitor.js` 工具类
  - [ ] 4.1.2 实现实时并发监控(基于 Redis Sorted Set)
  - [ ] 4.1.3 实现会话窗口使用量监控
  - [ ] 4.1.4 实现每日费用趋势监控

- [ ] 4.2 实现风险评分系统
  - [ ] 4.2.1 定义风险评分算法(并发利用率 × 费用增长率 × 异常检测)
  - [ ] 4.2.2 实现风险等级分类(低/中/高/极高)
  - [ ] 4.2.3 添加风险趋势图表(前端 Dashboard)

- [ ] 4.3 扩展 Webhook 通知
  - [ ] 4.3.1 在 `webhookService.js` 添加新事件类型
    - `account.session_window_exceeded` - 会话窗口限流
    - `account.daily_cost_exceeded` - 每日费用超限
    - `account.high_risk_detected` - 高风险告警
  - [ ] 4.3.2 实现事件触发逻辑(在限流检查点)
  - [ ] 4.3.3 添加事件配置管理(Web UI)

## 5. API 和路由层 (API & Routes)

- [ ] 5.1 扩展 Admin API
  - [ ] 5.1.1 在 `src/routes/admin.js` 添加 CCR 账户配置路由
    - `PUT /admin/ccr-accounts/:id/limits` - 更新限流配置
    - `GET /admin/ccr-accounts/:id/usage-stats` - 获取使用统计
    - `GET /admin/ccr-accounts/:id/risk-score` - 获取风险评分
  - [ ] 5.1.2 添加请求验证中间件(validate limits 范围)
  - [ ] 5.1.3 添加权限检查(仅管理员可修改)

- [ ] 5.2 扩展监控 API
  - [ ] 5.2.1 添加 `/admin/dashboard/relay-risk` 路由(风险概览)
  - [ ] 5.2.2 添加 `/admin/accounts/health` 路由(账户健康度)
  - [ ] 5.2.3 优化响应格式(前端友好)

## 6. Web 管理界面 (Web UI)

- [ ] 6.1 扩展账户管理页面
  - [ ] 6.1.1 在 `web/admin-spa/src/views/Accounts.vue` 添加 CCR 账户配置表单
    - 会话窗口时长配置(小时)
    - 窗口内最大请求数配置
    - 每日最大费用配置
    - 上游提供商标识
  - [ ] 6.1.2 添加配置验证逻辑(前端校验)
  - [ ] 6.1.3 添加实时使用量显示(进度条组件)

- [ ] 6.2 新增风险监控页面
  - [ ] 6.2.1 创建 `web/admin-spa/src/views/RiskMonitor.vue`
  - [ ] 6.2.2 实现账户风险评分卡片(按风险等级分组)
  - [ ] 6.2.3 实现实时并发监控图表(ECharts)
  - [ ] 6.2.4 实现费用趋势图(ECharts)

- [ ] 6.3 优化响应式和暗黑模式兼容
  - [ ] 6.3.1 确保所有新组件支持响应式布局(mobile/tablet/desktop)
  - [ ] 6.3.2 确保所有新组件支持暗黑模式(`dark:` 前缀)
  - [ ] 6.3.3 运行 Prettier 格式化所有新增代码

## 7. 配置和文档 (Configuration & Documentation)

- [ ] 7.1 添加环境变量配置
  - [ ] 7.1.1 在 `config/config.js` 添加新配置项
    ```javascript
    relayAccountLimits: {
      sessionWindowHours: parseInt(process.env.RELAY_ACCOUNT_SESSION_WINDOW_HOURS) || 1,
      maxRequestsPerWindow: parseInt(process.env.RELAY_ACCOUNT_MAX_REQUESTS_PER_WINDOW) || 0,
      maxCostPerDay: parseFloat(process.env.RELAY_ACCOUNT_MAX_COST_PER_DAY) || 0,
      priorityStrategy: process.env.RELAY_ACCOUNT_PRIORITY_STRATEGY || 'priority_lru'
    }
    ```
  - [ ] 7.1.2 更新 `.env.example` 添加新环境变量
  - [ ] 7.1.3 添加配置验证逻辑(启动时检查)

- [ ] 7.2 更新项目文档
  - [ ] 7.2.1 更新 `CLAUDE.md` 添加多中继配置章节
  - [ ] 7.2.2 添加配置示例(最佳实践)
  - [ ] 7.2.3 添加故障排除指南(常见问题)

- [ ] 7.3 更新 CLI 工具
  - [ ] 7.3.1 在 `src/cli/` 添加账户限流配置命令
    - `npm run cli accounts:config <id> --session-window <hours>`
    - `npm run cli accounts:stats <id>` - 显示使用统计
  - [ ] 7.3.2 添加风险评估命令
    - `npm run cli accounts:risk` - 显示所有账户风险评分

## 8. 测试和验证 (Testing & Validation)

- [ ] 8.1 单元测试
  - [ ] 8.1.1 测试会话窗口限流逻辑(`ccrAccountService.test.js`)
  - [ ] 8.1.2 测试费用限制逻辑
  - [ ] 8.1.3 测试调度器账户选择(多账户场景)

- [ ] 8.2 集成测试
  - [ ] 8.2.1 测试多账户负载均衡
  - [ ] 8.2.2 测试账户故障转移
  - [ ] 8.2.3 测试会话窗口统计准确性

- [ ] 8.3 性能测试
  - [ ] 8.3.1 基准测试: 调度器性能(1000次选择)
  - [ ] 8.3.2 基准测试: 会话窗口查询性能(Pipeline 优化)
  - [ ] 8.3.3 压力测试: 高并发场景(100 QPS)

- [ ] 8.4 手动验证
  - [ ] 8.4.1 验证配置 UI 正确保存
  - [ ] 8.4.2 验证限流触发时的错误消息
  - [ ] 8.4.3 验证 Webhook 通知正确发送
  - [ ] 8.4.4 验证风险评分计算准确性

## 9. 部署和发布 (Deployment & Release)

- [ ] 9.1 代码审查
  - [ ] 9.1.1 运行 ESLint 检查
  - [ ] 9.1.2 运行 Prettier 格式化
  - [ ] 9.1.3 检查代码注释完整性

- [ ] 9.2 数据库迁移
  - [ ] 9.2.1 备份生产 Redis 数据
  - [ ] 9.2.2 运行迁移脚本(干跑模式)
  - [ ] 9.2.3 运行迁移脚本(生产模式)

- [ ] 9.3 灰度发布
  - [ ] 9.3.1 部署到测试环境验证
  - [ ] 9.3.2 配置少量测试账户使用新功能
  - [ ] 9.3.3 监控 7 天无问题后全量开放

- [ ] 9.4 文档发布
  - [ ] 9.4.1 更新 Changelog
  - [ ] 9.4.2 更新 README.md (新增功能说明)
  - [ ] 9.4.3 发布 Release Notes

## 10. 监控和优化 (Monitoring & Optimization)

- [ ] 10.1 生产监控
  - [ ] 10.1.1 配置 Prometheus 指标(如果启用)
  - [ ] 10.1.2 配置 Grafana 仪表板(风险监控)
  - [ ] 10.1.3 配置告警规则(费用/并发异常)

- [ ] 10.2 性能优化
  - [ ] 10.2.1 分析 P99 延迟(优化目标: <10ms 增量)
  - [ ] 10.2.2 优化 Redis 查询(Pipeline 批量优化)
  - [ ] 10.2.3 优化缓存命中率(账户配置 LRU 缓存)

- [ ] 10.3 持续改进
  - [ ] 10.3.1 收集用户反馈
  - [ ] 10.3.2 分析账户封禁情况(验证风险评分准确性)
  - [ ] 10.3.3 根据数据调整默认配置(如会话窗口时长)
