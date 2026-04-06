# Git Context Skill - 使用指南

## ✅ 已完成

Git 上下文注入功能已实现并测试通过。

## 文件结构

```
skills/git-context/
├── SKILL.md           # 技能定义
├── index.js           # 核心功能
├── integration.js     # 通用集成方式
├── openclaw.js        # OpenClaw 专用集成
├── test.js            # 测试套件
└── README.md          # 详细文档
```

## 配置

编辑 `config/compaction.json`：

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

## 功能特性

- ✅ 自动读取 Git 分支、状态、变更
- ✅ 仅在指定 skill 调用时触发
- ✅ 缓存机制 (30秒) 避免重复执行
- ✅ 优雅降级 (非 Git 仓库不报错)
- ✅ 结构化输出，易于 AI 理解

## 集成到 OpenClaw

### 方法：在 Gateway 中调用

修改 `gateway.js` (或相应的入口文件)：

```javascript
const { enrichSession } = require('./skills/git-context/openclaw');

// 在处理请求前
function handleRequest(session, skillName) {
  // 注入 Git 上下文
  session = enrichSession(session, skillName);
  
  // 继续处理...
}
```

## 输出示例

```markdown
# Git Context
- Branch: main (ahead 2, behind 1)
- Status: 3 staged, 2 modified
- Changes: 5 files changed, 42 insertions(+), 10 deletions(-)
- Modified files: src/index.js, src/utils.js
- Recent commits:
  - feat: add auto-compaction
  - fix: handle edge case
  - docs: update README
```

## 测试

```bash
cd skills/git-context
node test.js
```

结果：✅ 5/5 测试通过

## 下一步

1. 在 OpenClaw Gateway 中集成 `enrichSession`
2. 测试实际对话场景
3. 监控性能指标
