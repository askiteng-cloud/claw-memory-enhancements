# Git Context Skill

为 OpenClaw 会话自动注入 Git 上下文信息。

## 功能

- 读取 Git 仓库状态 (status)
- 读取 Git 变更摘要 (diff --stat)
- 读取最近提交历史
- 缓存结果避免重复执行
- 仅在指定 skill 触发时注入

## 配置

在 `config/compaction.json` 中配置：

```json
{
  "gitIntegration": {
    "enabled": true,
    "triggerOnSkills": ["coding-agent", "skill-creator"],
    "cacheDuration": 30,
    "includeDiffStat": true,
    "includeRecentCommits": 3
  }
}
```

## 使用

自动触发，无需手动调用。

## 输出格式

```markdown
# Git Context
- Branch: main (ahead 2, behind 1)
- Status: 3 modified, 1 staged
- Recent commits:
  - feat: add auto-compaction
  - fix: handle edge case
  - docs: update README
```
