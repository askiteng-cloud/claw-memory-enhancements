# 🚀 OpenClaw 记忆增强技能 - 快速安装

## 方式一：AI 自动安装（推荐）

**复制下面这句话发送给 OpenClaw：**

```
请帮我安装这个技能：https://github.com/askiteng-cloud/claw-memory-enhancements
```

AI 会自动完成全部安装。

---

## 方式二：手动安装

```bash
# 1. 克隆仓库
git clone https://github.com/askiteng-cloud/claw-memory-enhancements.git

# 2. 进入目录
cd claw-memory-enhancements

# 3. 运行安装脚本（自动侦测 OpenClaw 位置）
./install.sh
```

---

## ✅ 安装后验证

```bash
# 查看状态
node $OPENCLAW_HOME/skills/git-context/openclaw.js --status

# 或运行测试
cd $OPENCLAW_HOME/skills/git-context && node test.js
cd $OPENCLAW_HOME/skills/session-compaction && node test.js
```

---

## 📦 包含内容

| 技能 | 功能 |
|------|------|
| **git-context** | 聊代码时自动注入 Git 上下文 |
| **session-compaction** | Token >70% 时自动压缩对话 |

---

## 🔧 配置

配置文件：`$OPENCLAW_HOME/config/compaction.json`

---

**仓库**：https://github.com/askiteng-cloud/claw-memory-enhancements  
**作者**：旭哥 (Aski)
