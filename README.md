# OpenClaw 记忆增强技能

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/askiteng-cloud/claw-memory-enhancements/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-compatible-orange.svg)](https://openclaw.ai)

基于 [Claw Code](https://github.com/ultraworkers/claw-code) 架构启发的 OpenClaw 记忆增强技能包。

## ✨ 功能特性

### 🔗 Git 上下文感知 (git-context)

自动获取 Git 仓库状态并注入到 OpenClaw 会话中，让 AI 知道你的代码上下文。

**自动触发条件：**
- Skill: `coding-agent`, `skill-creator`
- 或消息包含: `git`, `code`, `文件`, `repo` 等关键词

**输出内容：**
```
# Git Context
- Branch: master (ahead 25, behind 0)
- Status: 3 modified, 1 untracked
- Changes: 2 files changed, 42 insertions(+)
- Modified files: src/index.js, src/utils.js
- Recent commits:
  - feat: add new feature
  - fix: handle edge case
```

### 🗜️ 会话压缩 (session-compaction)

自动压缩超长对话，防止超出 AI 上下文限制。

**自动触发条件：**
- Token 使用率 ≥ 70%

**压缩效果：**
```
Before: 201 messages, 42,405 tokens (141%)
After:    8 messages,  2,295 tokens (8%)
压缩率:  96% 消息减少, 95% token 减少
```

**保留策略：**
- ✅ 最近 6 条消息（完整保留）
- ✅ 所有错误消息（防止丢失错误信息）
- ✅ 系统消息和之前的摘要
- 📝 其余消息 → XML 结构化摘要

## 🚀 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/askiteng-cloud/claw-memory-enhancements.git
cd claw-memory-enhancements

# 一键安装
# 智能侦测 .openclaw 隐藏目录，支持多工作区选择 (1, 2, 3...)
./install.sh
```

**install.sh 会自动：**
- 侦测 OpenClaw 安装位置（包括 `.openclaw` 隐藏目录及 npm 全局目录）
- **多工作区识别**：如果找到多个位置（如 `workspace`, `workspace-main`），让你通过数字选择
- **环境自检**：安装后自动运行 `openclaw doctor --fix` 确保配置生效
- 自动备份原有配置

### 验证安装

安装完成后，根据提示运行：

```bash
# 查看安装位置（install.sh 会显示实际路径）
# 例如：/home/user/clawd 或 /opt/openclaw

node <你的 OPENCLAW_HOME>/skills/git-context/openclaw.js
```

或使用启动器（如果已复制）：
```bash
node <你的 OPENCLAW_HOME>/openclaw-smart.js --status
```

### 使用

#### 命令行
```bash
# 直接使用技能
node <你的 OPENCLAW_HOME>/skills/git-context/openclaw.js

# 或使用增强版启动器（如果已安装）
node <你的 OPENCLAW_HOME>/openclaw-with-git.js agent "分析当前代码"
```

#### Telegram
直接对话即可，系统会自动：
- 聊代码时注入 Git 上下文
- 长对话时自动压缩

## ⚙️ 配置

编辑 `<你的 OPENCLAW_HOME>/config/compaction.json`：

```json
{
  "gitIntegration": {
    "enabled": true,
    "triggerOnSkills": ["coding-agent", "skill-creator"],
    "cacheDuration": 30,
    "includeDiffStat": true,
    "includeRecentCommits": 3
  },
  "compaction": {
    "enabled": true,
    "triggerThreshold": 0.70,
    "preserveRecent": 6,
    "preserveErrors": true,
    "maxSummaryLength": 4000
  }
}
```

## 📁 项目结构

```
claw-memory-enhancements/
├── git-context/              # Git 上下文技能
│   ├── index.js              # 核心功能
│   ├── openclaw.js           # OpenClaw 集成
│   ├── test.js               # 测试套件
│   └── SKILL.md              # 技能文档
│
├── session-compaction/       # 会话压缩技能
│   ├── index.js              # 核心功能
│   ├── compactor.js          # 压缩引擎
│   ├── openclaw.js           # OpenClaw 集成
│   ├── test.js               # 测试套件
│   └── SKILL.md              # 技能文档
│
├── compaction.json           # 配置文件
├── install.sh                # 安装脚本
└── README.md                 # 本文件
```

## 🧪 测试

安装脚本会自动运行测试，也可以手动测试：

```bash
# 请根据你的实际安装路径替换 <你的 OPENCLAW_HOME>
# install.sh 会显示实际安装位置

# 测试 Git 上下文
cd <你的 OPENCLAW_HOME>/skills/git-context
node test.js

# 测试会话压缩
cd <你的 OPENCLAW_HOME>/skills/session-compaction
node test.js
```

**示例**（如果安装在默认位置）：
```bash
cd ~/clawd/skills/git-context && node test.js
cd ~/clawd/skills/session-compaction && node test.js
```

## 📊 性能指标

| 功能 | 冷启动 | 热缓存 | 说明 |
|------|--------|--------|------|
| Git 上下文 | ~30ms | ~1ms | 30秒缓存 |
| Token 计数 | ~1ms | ~1ms | 简单估算 |
| 会话压缩 | ~400ms | - | 200条消息 |

## 🔧 技术架构

- **独立 Skill 形态**：与 OpenClaw Gateway 解耦
- **多平台支持**：命令行、Telegram、Discord 等
- **配置化设计**：可调整阈值、保留策略
- **零侵入集成**：无需修改 OpenClaw 核心

## 📝 依赖

- Node.js ≥ 18
- Git（用于 git-context）
- OpenClaw

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可证

[MIT](LICENSE)

## 🙏 致谢

- [Claw Code](https://github.com/ultraworkers/claw-code) - 架构启发
- [OpenClaw](https://openclaw.ai) - 平台支持

---

**Made with ❤️ by 旭哥 (Aski)**
text）
- OpenClaw

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可证

[MIT](LICENSE)

## 🙏 致谢

- [Claw Code](https://github.com/ultraworkers/claw-code) - 架构启发
- [OpenClaw](https://openclaw.ai) - 平台支持

---

**Made with ❤️ by 旭哥 (Aski)**
