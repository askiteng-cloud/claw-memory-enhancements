# OpenClaw 记忆增强技能

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/askiteng-cloud/claw-memory-enhancements/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-compatible-orange.svg)](https://openclaw.ai)

基于 [Claw Code](https://github.com/ultraworkers/claw-code) 架构启发的 OpenClaw 记忆增强技能包。

## ✨ 功能特性

### 🔗 Git 上下文感知 (git-context)

自动获取 Git 仓库状态并注入到 OpenClaw 会话中。

**增强特性：**
- 📝 **差异抓取 (Diff Snippets)**：当修改文件较少（≤3个）时，自动提取并注入代码差异片段，让 AI 看到具体的逻辑变更。
- 🛡️ **安全过滤**：自动过滤 `.env`、密钥及包含 `password` 等关键词的文件，确保代码安全。

**自动触发条件：**
- Skill: `coding-agent`, `skill-creator`
- 或消息包含: `git`, `code`, `文件`, `repo` 等关键词

### 🗜️ 会话压缩 (session-compaction)

自动压缩超长对话，防止超出 AI 上下文限制。

**增强特性：**
- 💾 **长效记忆持久化**：每次压缩生成的摘要会自动追加到本地 `memory/long-term-memory.md`，实现跨会话记忆。

**自动触发条件：**
- Token 使用率 ≥ 70%

**压缩效果：**
```
Before: 201 messages, 42,405 tokens (141%)
After:    8 messages,  2,295 tokens (8%)
压缩率:  96% 消息减少, 95% token 减少
```

## 🚀 快速开始

### 方法 1：让 OpenClaw AI 自动安装（推荐）

只需给 OpenClaw 发送以下消息：

```
请帮我安装这个技能：https://github.com/askiteng-cloud/claw-memory-enhancements
```

OpenClaw 会读取 [INSTALL_FOR_OPENCLAW.md](./INSTALL_FOR_OPENCLAW.md) 并自动完成安装。

### 方法 2：手动安装

如果你更喜欢手动控制：

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

## 📄 许可证

[MIT](LICENSE)

## 🙏 致谢

- [Claw Code](https://github.com/ultraworkers/claw-code) - 架构启发
- [OpenClaw](https://openclaw.ai) - 平台支持

---

**Made with ❤️ by 旭哥 (Aski)**
