# Session Compaction Skill

自动压缩 OpenClaw 会话上下文，防止超出模型的上下文窗口限制。

## 功能

- **Token 监控**: 实时追踪会话的 token 使用量
- **自动触发**: 达到阈值时自动压缩
- **智能保留**: 保留最近消息 + 所有错误 + 关键系统消息
- **结构化摘要**: 生成 XML 格式的对话摘要
- **多次压缩**: 支持连续压缩，合并历史摘要

## 触发条件

```
当累计 input tokens >= 70% 上下文窗口时触发压缩
```

## 压缩策略

1. **保留最近 N 条消息** (默认 6 条)
2. **保留所有 tool_result 错误**
3. **保留所有 system 消息**
4. **压缩中间消息为结构化摘要**

## 配置

在 `config/compaction.json` 中配置：

```json
{
  "compaction": {
    "enabled": true,
    "triggerThreshold": 0.70,
    "preserveRecent": 6,
    "preserveErrors": true,
    "maxSummaryLength": 4000,
    "format": "xml"
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
  - assistant: tool_use read(src/compact.rs)
  - tool_result read: [文件内容...]
</summary>
```
