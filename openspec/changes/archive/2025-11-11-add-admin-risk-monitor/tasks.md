# Implementation Tasks - 管理员风险监控页面

## 1. 后端 - 风险评分算法

- [x] 1.1 创建风险评分工具类
  - [x] 1.1.1 创建 `src/utils/riskScorer.js`
  - [x] 1.1.2 实现 `calculateRiskScore(account, usage)` 方法
  - [x] 1.1.3 实现风险等级分类逻辑（0-30低, 31-60中, 61-80高, 81-100极高）
  - [x] 1.1.4 实现风险因素计算
    - 并发利用率：`currentConcurrency / maxConcurrentTasks`
    - 窗口使用率：`requestsInWindow / maxRequestsPerWindow`
    - 费用趋势评分：`costToday / maxCostPerDay`
  - [x] 1.1.5 实现加权评分算法（并发 40%、窗口 35%、费用 25%）

- [x] 1.2 生成风险建议
  - [x] 1.2.1 实现 `generateRecommendations(riskFactors)` 方法
  - [x] 1.2.2 定义建议规则（并发 >90% → 降低并发或增加账户）
  - [x] 1.2.3 定义建议规则（窗口使用 >85% → 增加窗口时长）
  - [x] 1.2.4 定义建议规则（费用 >80% → 检查费用异常）

## 2. 后端 - 风险监控服务

- [x] 2.1 创建风险监控服务
  - [x] 2.1.1 创建 `src/services/riskMonitorService.js`
  - [x] 2.1.2 实现 `getAccountRiskScore(accountId)` 方法
    - 查询账户配置（provider, sessionWindowHours, maxRequestsPerWindow, maxCostPerDay）
    - 查询实时使用量（并发数、窗口请求数、每日费用）
    - 调用 riskScorer 计算评分
    - 生成建议
  - [x] 2.1.3 实现 `getAllAccountsRiskOverview(filters)` 方法
    - 获取所有 CCR 账户列表
    - 并行查询每个账户的风险评分（使用 Promise.all）
    - 按风险等级分组统计
    - 支持过滤和排序

- [x] 2.2 优化查询性能
  - [x] 2.2.1 使用 Redis Pipeline 批量查询使用统计
  - [x] 2.2.2 添加 LRU 缓存（5分钟有效期）
  - [ ] 2.2.3 添加查询超时控制（10秒）

## 3. 后端 - API 端点

- [x] 3.1 添加风险监控路由
  - [x] 3.1.1 在 `src/routes/admin.js` 添加路由
    - `GET /admin/ccr-accounts/:accountId/risk-score`
    - `GET /admin/dashboard/relay-risk`
  - [x] 3.1.2 添加请求验证中间件
    - 验证 accountId 格式
    - 验证查询参数（provider, riskLevel, sortBy）
  - [x] 3.1.3 添加权限检查（authenticateAdmin）

- [x] 3.2 实现路由处理器
  - [x] 3.2.1 实现 `GET /admin/ccr-accounts/:accountId/risk-score` 处理器
    - 调用 riskMonitorService.getAccountRiskScore()
    - 错误处理（账户不存在、统计查询失败）
    - 返回标准响应格式
  - [x] 3.2.2 实现 `GET /admin/dashboard/relay-risk` 处理器
    - 解析查询参数（provider, riskLevel, sortBy）
    - 调用 riskMonitorService.getAllAccountsRiskOverview()
    - 应用过滤和排序逻辑
    - 返回分组统计和账户列表

- [x] 3.3 添加错误处理
  - [x] 3.3.1 账户不存在：返回 404
  - [x] 3.3.2 Redis 查询失败：返回 500 with 详细错误
  - [ ] 3.3.3 超时：返回 503

## 4. 前端 - 基础组件

- [x] 4.1 创建使用量进度条组件
  - [x] 4.1.1 创建 `web/admin-spa/src/components/risk/UsageProgressBar.vue`
  - [x] 4.1.2 接受 props: `current`, `max`, `label`, `color`, `showPercentage`
  - [x] 4.1.3 实现渐变进度条（根据使用率调整颜色）
    - 0-60%: 绿色
    - 61-80%: 黄色
    - 81-100%: 红色
  - [x] 4.1.4 显示数值和百分比（例如: "88 / 100 (88%)"）
  - [x] 4.1.5 支持响应式和暗黑模式

- [x] 4.2 创建风险评分卡片组件
  - [x] 4.2.1 创建 `web/admin-spa/src/components/risk/RiskScoreCard.vue`
  - [x] 4.2.2 接受 props: `account` (包含 riskScore, riskLevel, currentUsage)
  - [x] 4.2.3 显示账户基本信息（名称、提供商、优先级）
  - [x] 4.2.4 显示风险评分（大数字 + 圆形进度环）
  - [x] 4.2.5 显示风险等级徽章（颜色编码）
    - 低: 绿色
    - 中: 黄色
    - 高: 橙色
    - 极高: 红色
  - [x] 4.2.6 显示三个使用量进度条
    - 窗口请求数
    - 每日费用
    - 并发数
  - [x] 4.2.7 显示风险建议（折叠/展开）
  - [x] 4.2.8 添加"编辑账户"快捷链接
  - [x] 4.2.9 支持响应式布局（卡片网格）
  - [x] 4.2.10 支持暗黑模式

## 5. 前端 - 风险监控主页面

- [x] 5.1 创建风险监控页面
  - [x] 5.1.1 创建 `web/admin-spa/src/views/RiskMonitorView.vue`
  - [x] 5.1.2 页面布局设计
    - 顶部: 标题 + 刷新按钮 + 筛选器
    - 中部: 风险统计卡片（总数、低/中/高/极高分组）
    - 底部: 账户风险卡片网格

- [x] 5.2 实现页面功能
  - [x] 5.2.1 实现数据加载逻辑
    - 调用 `GET /admin/dashboard/relay-risk` API
    - 显示加载状态（骨架屏）
    - 错误处理和重试逻辑
  - [x] 5.2.2 实现风险统计概览
    - 显示总账户数
    - 按风险等级分组显示数量
    - 使用彩色卡片区分
  - [x] 5.2.3 实现账户卡片网格
    - 使用 `RiskScoreCard` 组件
    - 响应式网格布局（移动端1列，平板2列，桌面3列）
    - 默认按风险评分降序排列
  - [x] 5.2.4 实现筛选功能
    - 按提供商筛选（下拉框）
    - 按风险等级筛选（多选框）
  - [x] 5.2.5 实现排序功能
    - 按风险评分排序
    - 按窗口使用量排序
    - 按每日费用排序
  - [ ] 5.2.6 实现自动刷新（可选，默认关闭）
    - 添加刷新间隔选择器（30秒、1分钟、5分钟）
    - 显示上次刷新时间

- [x] 5.3 添加空状态处理
  - [x] 5.3.1 无 CCR 账户时显示提示
  - [x] 5.3.2 无符合筛选条件的账户时显示提示

## 6. 前端 - 路由集成

- [x] 6.1 添加路由配置
  - [x] 6.1.1 编辑 `web/admin-spa/src/router/index.js`
  - [x] 6.1.2 添加路由定义
    ```javascript
    {
      path: '/risk-monitor',
      name: 'RiskMonitor',
      component: () => import('@/views/RiskMonitorView.vue'),
      meta: { requiresAuth: true, title: '风险监控' }
    }
    ```
  - [x] 6.1.3 添加侧边栏导航项（如果有侧边栏）

- [ ] 6.2 添加快捷入口（可选）
  - [ ] 6.2.1 在 Dashboard 添加"风险监控"卡片
  - [ ] 6.2.2 在账户列表添加"查看风险详情"链接

## 7. 样式和主题

- [x] 7.1 确保响应式兼容
  - [x] 7.1.1 移动端测试（iPhone SE, iPhone 12）
  - [x] 7.1.2 平板测试（iPad, iPad Pro）
  - [x] 7.1.3 桌面测试（1080p, 1440p, 4K）

- [x] 7.2 确保暗黑模式兼容
  - [x] 7.2.1 所有新组件添加 `dark:` 样式
  - [x] 7.2.2 验证颜色对比度（WCAG AA 标准）
  - [ ] 7.2.3 测试模式切换动画

- [x] 7.3 代码格式化
  - [x] 7.3.1 运行 Prettier 格式化所有新文件
  - [x] 7.3.2 运行 ESLint 检查

## 8. 测试和验证

- [ ] 8.1 后端单元测试
  - [ ] 8.1.1 测试风险评分算法（riskScorer.test.js）
    - 测试不同使用率的评分结果
    - 测试边界情况（0%, 100%, 超过限制）
  - [ ] 8.1.2 测试风险建议生成
  - [ ] 8.1.3 测试风险监控服务（riskMonitorService.test.js）
    - Mock Redis 查询
    - 测试并行查询性能

- [ ] 8.2 API 集成测试
  - [ ] 8.2.1 测试 `GET /admin/ccr-accounts/:id/risk-score`
    - 正常情况
    - 账户不存在
    - Redis 查询失败
  - [ ] 8.2.2 测试 `GET /admin/dashboard/relay-risk`
    - 无筛选
    - 按提供商筛选
    - 按风险等级筛选
    - 排序功能

- [ ] 8.3 前端手动测试
  - [ ] 8.3.1 测试页面加载和数据展示
  - [ ] 8.3.2 测试筛选和排序功能
  - [ ] 8.3.3 测试刷新功能
  - [ ] 8.3.4 测试错误处理（网络错误、API 错误）
  - [ ] 8.3.5 测试不同屏幕尺寸
  - [ ] 8.3.6 测试暗黑模式切换

- [ ] 8.4 性能测试
  - [ ] 8.4.1 测试 5 个账户的加载时间（<500ms）
  - [ ] 8.4.2 测试 20 个账户的加载时间（<1s）
  - [ ] 8.4.3 测试 Redis Pipeline 优化效果

## 9. 文档更新

- [ ] 9.1 更新项目文档
  - [ ] 9.1.1 更新 `CLAUDE.md` 添加风险监控功能说明
  - [ ] 9.1.2 添加风险评分算法文档
  - [ ] 9.1.3 添加 API 文档（风险监控端点）

- [ ] 9.2 更新 README
  - [ ] 9.2.1 在功能列表中添加"风险监控"
  - [ ] 9.2.2 添加风险监控截图（可选）

## 10. 部署和发布

- [ ] 10.1 代码审查
  - [ ] 10.1.1 运行 ESLint 检查
  - [ ] 10.1.2 运行 Prettier 格式化
  - [ ] 10.1.3 检查代码注释完整性

- [ ] 10.2 构建和测试
  - [ ] 10.2.1 构建前端：`npm run build:web`
  - [ ] 10.2.2 运行后端测试：`npm test`
  - [ ] 10.2.3 启动服务验证功能

- [ ] 10.3 部署
  - [ ] 10.3.1 部署到测试环境
  - [ ] 10.3.2 功能验收测试
  - [ ] 10.3.3 部署到生产环境

- [ ] 10.4 文档发布
  - [ ] 10.4.1 更新 Changelog
  - [ ] 10.4.2 发布 Release Notes
  - [ ] 10.4.3 通知用户新功能

## 预估工作量

- **后端开发**: 4-6 小时
  - 风险评分算法: 2 小时
  - 风险监控服务: 2 小时
  - API 端点: 1-2 小时

- **前端开发**: 6-8 小时
  - 基础组件: 3 小时
  - 主页面: 3 小时
  - 路由集成: 1 小时
  - 样式调优: 1-2 小时

- **测试**: 2-3 小时
  - 单元测试: 1 小时
  - 集成测试: 1 小时
  - 手动测试: 1 小时

- **文档和部署**: 1-2 小时

**总计**: 13-19 小时（约 2-3 个工作日）
