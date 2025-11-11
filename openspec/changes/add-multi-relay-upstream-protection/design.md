# Technical Design

## Context

当前系统作为二级中转服务,上游使用国内API中转商(如 CloseAI, API2D)。这些中转服务通常禁止二次分发,且会检测异常使用模式(高并发、高用量、多样化会话内容)。用户接受单账户4并发和不限费用的风险等级,需要在此约束下实现服务可用性最大化。

### Stakeholders
- **系统管理员**: 需要配置和管理多个中继账户,监控风险
- **最终用户**: 需要稳定的服务可用性,能够容忍短暂的账户切换
- **中转服务提供商**: 上游API提供商(CloseAI, API2D等),检测分销行为

### Current Architecture

```
客户端 (Claude Code)
    ↓ API Key (cr_*)
    ↓
Auth 中间件 (验证 API Key)
    ↓
统一调度器 (unifiedClaudeScheduler)
    ↓ 选择账户 (基于优先级、粘性会话、并发限制)
    ↓
CCR 转发服务 (ccrRelayService)
    ↓ 使用 CCR 账户凭据
    ↓
上游中转服务 (CloseAI/API2D/etc.)
    ↓
Anthropic 官方 API
```

### Current Constraints
- ✅ 已支持: 账户级并发限制 (`maxConcurrentTasks`)
- ✅ 已支持: 账户优先级排序 (`priority` + `lastUsedAt`)
- ✅ 已支持: 粘性会话机制 (session hash → account mapping)
- ✅ 已支持: 小时级使用统计 (Redis: `account_usage:hourly:*`)
- ✅ 已支持: 账户每日费用统计 (`redis.getAccountDailyCost()`)
- ❌ 缺失: 会话窗口内请求数限制
- ❌ 缺失: 会话窗口内费用限制
- ❌ 缺失: 账户级风险评分和告警
- ❌ 缺失: 多提供商账户管理

## Goals / Non-Goals

### Goals
1. **风险分散**: 支持配置多个中继服务账户,降低单点故障风险
2. **细粒度限流**: 实现会话窗口级别的请求数和费用限制
3. **智能调度**: 基于账户健康度、优先级、粘性会话的综合调度
4. **可观测性**: 提供账户级监控、风险评分、告警通知
5. **向后兼容**: 不破坏现有配置和数据,现有账户自动使用默认配置

### Non-Goals
- ❌ **不实现请求内容多样化**: 不会修改请求内容以模拟多样性(仍保持原始请求)
- ❌ **不实现时间分散策略**: 不会刻意延迟请求以模拟人工间隔(保持低延迟)
- ❌ **不实现代理轮换**: 账户级代理配置已存在,不再新增IP轮换机制
- ❌ **不实现自动账户注册**: 不自动注册中转服务账户(需人工配置)

## Decisions

### Decision 1: 会话窗口实现方式

**选项 A: 滑动窗口 (Sliding Window)**
- 优点: 精确的时间窗口控制,流量更平滑
- 缺点: 实现复杂度高,需要维护请求时间戳队列
- Redis 实现: Sorted Set 存储 `(timestamp, requestId)`,定期清理过期数据

**选项 B: 固定窗口 (Fixed Window)**
- 优点: 实现简单,已有小时级统计基础设施
- 缺点: 窗口边界突发(临近窗口结束时可能产生流量尖峰)
- Redis 实现: 复用现有 `account_usage:hourly:*` 数据

**✅ 选择: 选项 B (固定窗口)**

**理由:**
1. 现有基础设施已支持小时级统计(`account_usage:hourly:accountId:YYYY-MM-DD:HH`)
2. 实现简单,性能开销小(复用现有 Pipeline 查询)
3. 窗口边界突发影响有限(会话窗口通常为1小时,与统计粒度一致)
4. 可通过调整 `sessionWindowHours` 配置降低突发风险(如设置为2小时)

**实现细节:**
```javascript
// 会话窗口查询(复用现有方法)
const windowStart = new Date(Date.now() - sessionWindowHours * 3600 * 1000)
const windowEnd = new Date()
const usage = await redis.getAccountSessionWindowUsage(accountId, windowStart, windowEnd)

// 检查限制
if (maxRequestsPerWindow > 0 && usage.totalRequests >= maxRequestsPerWindow) {
  return false  // 会话窗口限流
}
```

### Decision 2: 调度策略

**选项 A: 严格优先级 (Strict Priority)**
- 始终选择优先级最高的可用账户
- 优点: 简单可预测
- 缺点: 高优先级账户可能过载,低优先级账户闲置

**选项 B: 加权轮询 (Weighted Round Robin)**
- 根据优先级分配权重,概率性选择
- 优点: 负载分散,所有账户均衡使用
- 缺点: 实现复杂,需要维护轮询状态

**选项 C: 优先级 + LRU (Current Approach)**
- 优先级相同时选择最久未使用的账户
- 优点: 继承现有逻辑,实现简单
- 缺点: 优先级差异大时仍会集中使用高优先级账户

**✅ 选择: 选项 C (优先级 + LRU)** - 保持现有逻辑不变

**理由:**
1. 现有代码已实现且稳定(`_sortAccountsByPriority()`)
2. 符合用户预期(优先级高的账户优先使用)
3. LRU 机制已提供一定的负载均衡能力
4. 可通过设置相同优先级实现轮询效果

**未来扩展:**
- 添加配置选项 `RELAY_ACCOUNT_PRIORITY_STRATEGY` 支持多种策略
- 保持向后兼容(默认: `priority_lru`)

### Decision 3: 费用限制粒度

**选项 A: 会话窗口级费用限制**
- 限制会话窗口内费用(如1小时内最多 $5)
- 优点: 细粒度控制,快速响应异常消费
- 缺点: 配置复杂,可能导致频繁限流

**选项 B: 每日费用限制**
- 限制每日总费用(如 $50/天)
- 优点: 简单直观,符合中转服务计费周期
- 缺点: 反应滞后,早上用完可能导致全天不可用

**✅ 选择: 选项 B (每日费用限制)**

**理由:**
1. 中转服务通常按日计费,日限制更符合业务逻辑
2. 用户接受"不限费用"风险,日限制可作为保底机制防止意外消耗
3. 实现简单,复用现有 `redis.getAccountDailyCost()` 方法
4. 可通过设置 `maxCostPerDay=0` 禁用限制(默认行为)

**监控补偿:**
- 实现实时费用监控,80% 阈值告警(提前预警)
- Dashboard 显示费用趋势,帮助用户及时调整配置

### Decision 4: 风险评分算法

**指标选择:**
- **并发利用率** (Concurrency Usage Ratio): `currentConcurrency / maxConcurrentTasks`
- **费用增长率** (Cost Growth Rate): `(todayCost - yesterdayCost) / yesterdayCost`
- **会话窗口使用率** (Window Usage Ratio): `windowRequests / maxRequestsPerWindow`

**评分公式:**
```javascript
riskScore = (
  concurrencyRatio * 0.4 +
  windowUsageRatio * 0.3 +
  costGrowthRate * 0.3
) * 100

// 风险等级
if (riskScore < 40) return 'low'         // 低风险
if (riskScore < 60) return 'medium'      // 中风险
if (riskScore < 80) return 'high'        // 高风险
return 'critical'                        // 极高风险
```

**理由:**
- 并发利用率最重要(权重0.4),直接反映检测风险
- 会话窗口使用率次之(权重0.3),反映短期突发
- 费用增长率辅助(权重0.3),反映长期趋势
- 简单加权和,易于理解和调试

## Risks / Trade-offs

### Risk 1: 检测风险仍然存在 (高)

**描述:** 单账户4并发仍有 60-80% 概率被检测为分销账户

**缓解措施:**
- ✅ 配置多个账户分散风险(建议 5+ 账户)
- ✅ 每账户设置并发限制(maxConcurrentTasks=4,用户接受的风险)
- ✅ 实时监控账户状态,及时发现封禁
- ✅ 自动故障转移,单账户封禁不影响服务

**残留风险:**
- 如果所有账户同时被封禁,服务完全中断
- 需要人工介入补充新账户

### Risk 2: 窗口边界突发 (中)

**描述:** 固定窗口实现可能导致窗口切换时流量尖峰

**示例场景:**
```
时间轴:    09:00 -------- 09:59 | 10:00 -------- 10:59
窗口1限制:  100 req       (接近满)
窗口2限制:  100 req       (新窗口,立即可用)
突发风险:   09:59 发送大量请求 → 10:00 再次发送大量请求
```

**缓解措施:**
- ✅ 配置合理的 `sessionWindowHours`(推荐1-2小时)
- ✅ 设置保守的 `maxRequestsPerWindow`(留有余量)
- ⚠️ 可选:未来实现滑动窗口(复杂度高,暂不实现)

### Risk 3: 费用失控 (中)

**描述:** 用户接受"不限费用"风险,可能导致成本超预期

**缓解措施:**
- ✅ 默认配置 `maxCostPerDay=0`(不限制,用户需主动配置)
- ✅ Dashboard 实时显示费用,80% 阈值告警
- ✅ Webhook 通知费用超限事件
- ✅ 费用趋势图帮助用户提前识别异常

**建议配置:**
```javascript
{
  "maxCostPerDay": 50.0,  // 建议设置保底限制
  "alertThreshold": 0.8   // 80% 告警(未来可实现)
}
```

### Risk 4: 粘性会话失效 (低)

**描述:** 粘性会话绑定的账户不可用时,会话丢失上下文

**场景:**
- 会话绑定到账户 A
- 账户 A 达到费用限制 / 被封禁
- 自动切换到账户 B,但上下文丢失

**缓解措施:**
- ✅ 现有逻辑:粘性会话失效时自动删除映射(`_deleteSessionMapping`)
- ✅ 客户端重试机制:Claude Code 会自动重试失败的请求
- ⚠️ 可选:未来实现"同提供商优先"策略(优先选择同一中转商的其他账户)

## Migration Plan

### Phase 1: 数据结构扩展 (无影响)
- 添加新字段到 CCR 账户数据结构
- 默认值保持向后兼容:
  ```javascript
  sessionWindowHours: 1
  maxRequestsPerWindow: 0  // 0 表示不限制
  maxCostPerDay: 0         // 0 表示不限制
  provider: ''             // 空字符串表示未配置
  ```
- 现有账户自动使用默认值,无需迁移脚本

### Phase 2: 逻辑增强 (灰度发布)
1. 部署新代码到测试环境
2. 配置少量测试账户使用新限制
3. 验证限流逻辑正确触发
4. 验证 Webhook 通知正常
5. 灰度 7 天后全量发布

### Phase 3: 用户配置 (可选)
- 管理员通过 Web UI 配置账户限制
- CLI 工具提供批量配置能力
- 文档提供最佳实践建议

### Rollback Plan

如果发现严重问题,回滚步骤:

1. **代码回滚**: Git revert 到上一个稳定版本
2. **数据兼容**: 新字段有默认值,回滚后仍可正常读取
3. **配置清理**: 删除新增的环境变量(可选)

**无数据丢失风险**: 所有新字段有默认值,回滚不影响现有数据

## Open Questions

### Q1: 是否需要支持多个会话窗口?

**背景:** 当前设计每账户一个固定会话窗口(如1小时)

**备选方案:**
- 支持多个窗口配置(如: 15分钟窗口 100 req + 1小时窗口 300 req)
- 优点: 更细粒度的流量控制
- 缺点: 配置复杂度指数增长

**决策:** 暂不支持,保持简单。如有需求,未来可通过多账户模拟多窗口

### Q2: 是否需要支持动态调整限制?

**背景:** 根据账户健康度动态调整 `maxConcurrentTasks`

**示例:**
- 账户正常时: maxConcurrentTasks = 4
- 检测到异常时: 自动降低到 2

**决策:** 暂不支持,保持配置稳定可预测。风险监控由管理员根据告警人工调整

### Q3: 是否需要跨账户会话迁移?

**背景:** 账户 A 不可用时,自动迁移会话到账户 B

**挑战:**
- 上游 API 会话状态无法跨账户迁移(不同账户不共享上下文)
- 仅能迁移粘性会话映射,无法恢复对话历史

**决策:** 暂不实现。依赖客户端重试机制处理会话失效

---

**设计完成时间:** 2025-01-11
**设计负责人:** Claude (AI Assistant)
**审核状态:** 待用户审核
