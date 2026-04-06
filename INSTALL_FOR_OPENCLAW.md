# OpenClaw AI 安装指南

> **给 OpenClaw AI 的指令文档**
> 
> 当用户发送 GitHub 仓库链接并要求安装此技能时，请按照本文档执行安装。

---

## 📋 安装目标

将 `git-context` 和 `session-compaction` 两个技能安装到用户的 OpenClaw 环境中。

---

## 🔍 步骤 1：侦测 OpenClaw 安装位置

**任务**：找到用户的 OpenClaw 工作目录。

**检查顺序**：
1. 环境变量 `$OPENCLAW_HOME` 或 `$CLAWD_HOME`
2. 常见位置：
   - `~/clawd`
   - `~/.clawd`
   - `~/.openclaw`
   - `/opt/clawd`
   - `/opt/openclaw`
3. `openclaw` 命令的位置

**确认方法**：
- 目录应包含 `skills/` 和 `config/` 子目录
- 或包含 `.openclaw/` 配置目录

**输出**：确定 `<OPENCLAW_HOME>` 路径

---

## 📦 步骤 2：获取技能文件

**任务**：从 GitHub 仓库下载技能文件

**仓库地址**：
```
https://github.com/askiteng-cloud/claw-memory-enhancements
```

**需要的文件**：
```
git-context/
  ├── index.js              # 核心功能
  ├── openclaw.js           # OpenClaw 集成接口
  ├── test.js               # 测试文件
  └── SKILL.md              # 技能文档

session-compaction/
  ├── index.js              # 核心功能
  ├── compactor.js          # 压缩引擎
  ├── classifier.js         # 消息分类器
  ├── summarizer.js         # 摘要生成器
  ├── token-counter.js      # Token 计数器
  ├── openclaw.js           # OpenClaw 集成接口
  ├── test.js               # 测试文件
  └── SKILL.md              # 技能文档

compaction.json             # 配置文件
```

**获取方式**：
- 方法 A：克隆仓库
  ```bash
  git clone https://github.com/askiteng-cloud/claw-memory-enhancements.git /tmp/claw-memory-enhancements
  ```

- 方法 B：下载 ZIP
  ```bash
  wget -O /tmp/claw-memory-enhancements.zip https://github.com/askiteng-cloud/claw-memory-enhancements/archive/refs/heads/master.zip
  unzip /tmp/claw-memory-enhancements.zip -d /tmp/
  ```

---

## 🔧 步骤 3：安装技能

**任务**：将技能文件复制到 OpenClaw 目录

### 3.1 安装 git-context

```bash
# 创建目标目录（如果不存在）
mkdir -p <OPENCLAW_HOME>/skills

# 复制技能文件
cp -r /tmp/claw-memory-enhancements/git-context <OPENCLAW_HOME>/skills/

# 设置权限
chmod -R 755 <OPENCLAW_HOME>/skills/git-context
```

### 3.2 安装 session-compaction

```bash
# 复制技能文件
cp -r /tmp/claw-memory-enhancements/session-compaction <OPENCLAW_HOME>/skills/

# 设置权限
chmod -R 755 <OPENCLAW_HOME>/skills/session-compaction
```

### 3.3 安装配置文件

```bash
# 创建配置目录
mkdir -p <OPENCLAW_HOME>/config

# 备份原有配置（如果存在）
if [ -f <OPENCLAW_HOME>/config/compaction.json ]; then
  cp <OPENCLAW_HOME>/config/compaction.json <OPENCLAW_HOME>/config/compaction.json.bak.$(date +%Y%m%d_%H%M%S)
fi

# 复制新配置
cp /tmp/claw-memory-enhancements/compaction.json <OPENCLAW_HOME>/config/
chmod 644 <OPENCLAW_HOME>/config/compaction.json
```

---

## ✅ 步骤 4：验证安装

**任务**：确认技能已正确安装

### 4.1 检查文件是否存在

```bash
# 检查技能目录
ls -la <OPENCLAW_HOME>/skills/git-context/
ls -la <OPENCLAW_HOME>/skills/session-compaction/

# 检查配置文件
ls -la <OPENCLAW_HOME>/config/compaction.json
```

### 4.2 运行测试

```bash
# 测试 git-context
cd <OPENCLAW_HOME>/skills/git-context && node test.js

# 测试 session-compaction
cd <OPENCLAW_HOME>/skills/session-compaction && node test.js
```

**预期输出**：
- Git 测试："All tests passed" 或显示 Git 状态信息
- 压缩测试："All tests passed" 或显示压缩演示

---

## 📝 步骤 5：向用户报告

**报告内容模板**：

```
✅ 安装完成！

安装位置：<OPENCLAW_HOME>

已安装技能：
  ✅ git-context - Git 上下文感知
  ✅ session-compaction - 会话压缩

配置文件：
  <OPENCLAW_HOME>/config/compaction.json

功能说明：
  1. Git 上下文：聊代码时自动注入 Git 仓库状态
  2. 会话压缩：Token 使用率 >70% 时自动压缩对话

使用方法：
  - Telegram：直接对话，自动启用
  - 命令行：node <OPENCLAW_HOME>/skills/git-context/openclaw.js

如需调整配置，请编辑：
  <OPENCLAW_HOME>/config/compaction.json
```

---

## 🔧 故障排除

### 问题 1：找不到 OpenClaw 目录

**解决方案**：
- 询问用户 OpenClaw 安装位置
- 或搜索更多位置：`find ~ -name ".openclaw" -type d 2>/dev/null`

### 问题 2：权限不足

**解决方案**：
- 检查目录权限：`ls -la <OPENCLAW_HOME>/`
- 如果需要，使用 `chmod` 修改权限

### 问题 3：Node.js 版本过低

**解决方案**：
- 检查版本：`node --version`
- 如果 < 18，警告用户升级

### 问题 4：Git 未安装

**解决方案**：
- 警告用户：git-context 技能需要 Git
- 但继续安装 session-compaction

---

## 📚 配置说明

**配置文件位置**：`<OPENCLAW_HOME>/config/compaction.json`

**默认配置**：
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

**配置项说明**：
- `gitIntegration.enabled`：是否启用 Git 上下文
- `gitIntegration.triggerOnSkills`：触发 Git 注入的技能列表
- `compaction.enabled`：是否启用会话压缩
- `compaction.triggerThreshold`：压缩触发阈值（0.70 = 70%）

---

## 🎯 安装完成后

**向用户确认**：
1. 技能已成功安装
2. 配置文件的用途
3. 如何验证安装（运行测试）
4. 日常使用方式（Telegram/命令行）

**可选操作**：
- 帮用户运行一次测试验证
- 解释配置文件的作用
- 演示如何使用

---

**文档版本**：1.0.0  
**更新日期**：2026-04-06  
**作者**：旭哥 (Aski)
