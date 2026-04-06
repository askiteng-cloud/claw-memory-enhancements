# Git Context Skill - 实现说明

## 快速开始

```javascript
const { getGitContext, injectGitContext } = require('./skills/git-context');

// 获取 Git 上下文
const context = getGitContext('/path/to/repo', 'session-123', 'coding-agent');
console.log(context);

// 注入到系统提示
const enrichedPrompt = injectGitContext(systemPrompt, context);
```

## 集成方式

### 方式一：中间件 (推荐)

```javascript
const { gitContextMiddleware } = require('./skills/git-context/integration');
app.use('/api/skills', gitContextMiddleware);
```

### 方式二：拦截器

```javascript
const { GitContextInterceptor } = require('./skills/git-context/integration');
const interceptor = new GitContextInterceptor();

// 在工具调用前
interceptor.beforeToolCall(toolName, args, context);
```

### 方式三：Skill 包装

```javascript
const { wrapSkillWithGitContext } = require('./skills/git-context/integration');
const wrappedSkill = wrapSkillWithGitContext(originalSkill, 'coding-agent');
```

## 配置选项

编辑 `config/compaction.json`：

```json
{
  "gitIntegration": {
    "enabled": true,                    // 是否启用
    "triggerOnSkills": [                // 触发 Git 注入的 skills
      "coding-agent",
      "skill-creator"
    ],
    "cacheDuration": 30,                // 缓存时间 (秒)
    "includeDiffStat": true,            // 是否包含 diff 统计
    "includeRecentCommits": 3           // 显示最近几个提交
  }
}
```

## 输出示例

```markdown
# Git Context
- Branch: main (ahead 2, behind 1)
- Status: 2 staged, 3 modified, 1 untracked
- Changes: 5 files changed, 42 insertions(+), 10 deletions(-)
- Modified files: src/index.js, src/utils.js, README.md
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

## 性能

- Git 命令执行时间: ~50-200ms
- 缓存命中时: ~1ms
- 建议缓存时间: 30-60 秒

## 错误处理

- 非 Git 仓库: 返回 null，不注入
- Git 命令失败: 优雅降级，使用默认值
- 配置错误: 使用默认配置
