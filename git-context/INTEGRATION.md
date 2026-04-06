# Git Context 集成到 OpenClaw Gateway

## 方案一：通过 Node.js 脚本包装 (推荐用于开发测试)

创建一个启动脚本，在调用 OpenClaw 之前注入 Git 上下文：

```javascript
#!/usr/bin/env node
// scripts/openclaw-with-git.js

const { spawn } = require('child_process');
const gitContext = require('../skills/git-context/openclaw');

// 检测当前目录的 Git 上下文
const cwd = process.cwd();
const context = gitContext.getGitContext(cwd, 'cli-session', 'coding-agent');

if (context) {
  console.log('\n📝 Git Context:');
  console.log(context.split('\n').map(l => '   ' + l).join('\n'));
  console.log();
}

// 启动 OpenClaw
const args = process.argv.slice(2);
const openclaw = spawn('openclaw', args, {
  stdio: 'inherit',
  cwd,
});

openclaw.on('exit', (code) => {
  process.exit(code);
});
```

使用方法：
```bash
# 代替 openclaw 命令
node scripts/openclaw-with-git.js agent "帮我分析这个 Git 仓库"
```

---

## 方案二：通过 Environment Variable 注入

将 Git 上下文写入环境变量，在系统提示中读取：

```bash
#!/bin/bash
# scripts/openclaw-git.sh

# 获取 Git 上下文
GIT_CONTEXT=$(node -e "
  const git = require('./skills/git-context/openclaw');
  const ctx = git.getGitContext(process.cwd(), 'cli', 'coding-agent');
  console.log(ctx || '');
")

# 导出为环境变量
export OPENCLAW_GIT_CONTEXT="$GIT_CONTEXT"

# 启动 OpenClaw
openclaw "$@"
```

然后在 OpenClaw 的系统提示配置中读取这个环境变量。

---

## 方案三：Skill 级别的集成 (推荐用于生产)

修改具体的 Skill 文件，在入口处注入 Git 上下文：

```javascript
// skills/coding-agent/index.js

const gitContext = require('../git-context/openclaw');

async function execute(args, context) {
  // 注入 Git 上下文到系统提示
  if (context.systemPrompt) {
    context.systemPrompt = gitContext.enrichSession(
      { 
        key: context.sessionKey, 
        cwd: context.cwd, 
        systemPrompt: context.systemPrompt 
      },
      'coding-agent'
    ).systemPrompt;
  }
  
  // 继续执行原逻辑...
}

module.exports = { execute };
```

---

## 方案四：通过 OpenClaw Hooks (如果支持)

如果 OpenClaw 支持 pre-request hooks：

```javascript
// ~/.openclaw/hooks/pre-request.js

const gitContext = require('/path/to/git-context/openclaw');

module.exports = function(session, context) {
  // 在请求处理前注入 Git 上下文
  return gitContext.enrichSession(session, context.skill);
};
```

---

## 推荐：方案三的具体实现

这是最直接的生产环境集成方式。让我们为 `coding-agent` skill 创建一个增强版本：

### 1. 创建增强版 coding-agent wrapper

```javascript
// skills/coding-agent-git/index.js

const path = require('path');
const { enrichSession } = require('../git-context/openclaw');

// 加载原始的 coding-agent skill
const originalSkill = require('../coding-agent');

module.exports = {
  ...originalSkill,
  
  async execute(args, context) {
    console.log('[coding-agent-git] Injecting Git context...');
    
    // 注入 Git 上下文
    const enriched = enrichSession(
      {
        key: context.sessionKey || 'default',
        cwd: context.cwd || process.cwd(),
        systemPrompt: context.systemPrompt,
      },
      'coding-agent'
    );
    
    // 更新上下文
    context.systemPrompt = enriched.systemPrompt;
    
    // 调用原始 skill
    return originalSkill.execute(args, context);
  },
};
```

### 2. SKILL.md

```markdown
# coding-agent-git

Enhanced coding-agent with automatic Git context injection.

## Usage

Use this skill instead of `coding-agent` when working in a Git repository.

## Features

- Automatically detects Git repository
- Injects branch, status, and recent commits into system prompt
- Cached for 30 seconds to avoid repeated git commands

## Configuration

Edit `config/compaction.json` to customize behavior.
```

---

## 验证集成

运行以下命令验证集成是否工作：

```bash
# 1. 测试 Git 上下文模块
node skills/git-context/test.js

# 2. 演示集成效果
node skills/git-context/demo-gateway-integration.js coding-agent

# 3. 对比测试
node skills/git-context/demo-gateway-integration.js --compare

# 4. 性能测试
node skills/git-context/demo-gateway-integration.js --perf
```

---

## 下一步：真正的 Gateway 集成

要与真正的 OpenClaw Gateway 集成，需要修改 Gateway 的源代码或在 Gateway 和 Model 之间添加一个代理层。

由于 OpenClaw Gateway 是一个已编译的应用程序，建议通过以下方式：

1. **Feature Request**: 向 OpenClaw 提交 PR，添加 Git 上下文注入的原生支持
2. **Plugin**: 如果 OpenClaw 支持插件系统，创建一个 Git Context 插件
3. **Proxy**: 在 Gateway 和 Model Provider 之间添加一个代理服务，拦截并修改请求

当前实现的模块 (`skills/git-context/`) 已经为任何集成方式做好了准备。
