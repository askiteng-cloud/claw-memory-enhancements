# Session Compaction Skill - 使用指南

## 快速开始

```javascript
const compaction = require('./skills/session-compaction');

// 检查会话统计
const stats = compaction.getStats(messages);
console.log(compaction.formatStats(stats));

// 手动压缩
const result = compaction.compact(messages);
console.log(`Removed: ${result.removedCount}, Preserved: ${result.preservedCount}`);

// 自动压缩（基于 token 阈值）
const autoResult = compaction.autoCompact(messages, 128000);
```

## 配置

编辑 `config/compaction.json`：

```json
{
  "compaction": {
    "enabled": true,
    "triggerThreshold": 0.70,
    "preserveRecent": 6,
    "preserveErrors": true,
    "maxSummaryLength": 4000
  }
}
```

## 输出格式

```xml
<summary>
Conversation summary:
- Scope: 23 messages compacted (user=8, assistant=7, tool=8)
- Tools mentioned: read, edit, bash
- Recent user requests:
  - 分析代码结构
  - 修复 bug
- Pending work:
  - 需要测试修复结果
- Key files referenced: src/index.js, src/utils.js
- Current work: 正在实现会话压缩
- Key timeline:
  - user: 分析会话压缩需求
  - assistant: tool_use read
  - tool_result: read
</summary>
```

## API 参考

### `compact(messages, options)`

手动压缩会话。

**参数:**
- `messages` - 消息列表
- `options` - 配置选项（可选）

**返回:**
```javascript
{
  messages,        // 压缩后的消息列表
  summary,         // 生成的摘要
  removedCount,    // 移除的消息数
  preservedCount,  // 保留的消息数
  compacted        // 是否执行了压缩
}
```

### `autoCompact(messages, contextWindow, currentTokens)`

自动检查并压缩会话。

**参数:**
- `messages` - 消息列表
- `contextWindow` - 上下文窗口大小（默认 128000）
- `currentTokens` - 当前 token 数（可选，自动计算）

### `getStats(messages)`

获取会话统计信息。

### `shouldCompact(messages, contextWindow)`

检查是否需要压缩。

## OpenClaw 集成

```javascript
const openclaw = require('./skills/session-compaction/openclaw');

// 检查会话状态
const check = openclaw.checkSession(session);
console.log(check.percent + '% used');

// 包装会话（自动压缩）
const wrapped = openclaw.wrapSession(session);

// 可视化状态
console.log(openclaw.getStatusVisualization(session));
```

## 性能

- Token 计数: ~1ms/1000 messages
- 压缩: ~400ms/200 messages（取决于消息大小）

## 测试

```bash
cd skills/session-compaction
node test.js
```
