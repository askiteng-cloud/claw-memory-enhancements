# OpenClaw 记忆增强技能 v1.0.0

## 包含技能

### 1. git-context - Git 上下文感知
自动获取 Git 仓库状态并注入到 OpenClaw 会话中。

**触发条件:**
- Skill: coding-agent, skill-creator
- 或消息包含: git, code, 文件 等关键词

**输出:**
- 当前分支
- 修改状态
- 最近提交

### 2. session-compaction - 会话压缩
自动压缩超长对话，防止超出 AI 上下文限制。

**触发条件:**
- Token 使用率 ≥ 70%

**策略:**
- 保留最近 6 条完整消息
- 保留所有错误消息
- 生成 XML 结构化摘要

## 快速安装

```bash
./install.sh
```

## 验证安装

```bash
node ~/clawd/openclaw-smart.js --status
```

## 使用

### 命令行
```bash
node ~/clawd/openclaw-with-git.js agent "分析代码"
```

### Telegram
直接对话即可，自动启用增强功能。

## 配置

编辑 `~/clawd/config/compaction.json` 调整设置。

## 文档

- 详细文档: docs/MIGRATION_GUIDE.md
- 架构设计: docs/auto-enable-architecture.md
