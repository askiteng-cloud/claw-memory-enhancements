#!/bin/bash
set -e

CLAWD_HOME="${CLAWD_HOME:-$HOME/clawd}"
SKILLS_DIR="$CLAWD_HOME/skills"
CONFIG_DIR="$CLAWD_HOME/config"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     安装 OpenClaw 记忆增强技能                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 检查依赖
echo "🔍 检查依赖..."

if ! command -v node >/dev/null 2>&1; then
  echo "❌ 错误: 未找到 Node.js，请先安装 Node.js ≥ 18"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "⚠️  警告: 未找到 Git，git-context 技能将无法使用"
fi

# 创建目录
echo "📁 创建目录..."
mkdir -p "$SKILLS_DIR"
mkdir -p "$CONFIG_DIR"

# 复制技能
echo "📦 复制技能文件..."
if [ -d "git-context" ]; then
  cp -r git-context "$SKILLS_DIR/"
  echo "  ✅ git-context"
fi

if [ -d "session-compaction" ]; then
  cp -r session-compaction "$SKILLS_DIR/"
  echo "  ✅ session-compaction"
fi

# 复制配置
echo "⚙️  复制配置文件..."
if [ -f "$CONFIG_DIR/compaction.json" ]; then
  echo "  📝 备份原有配置: compaction.json.bak"
  cp "$CONFIG_DIR/compaction.json" "$CONFIG_DIR/compaction.json.bak"
fi

cp compaction.json "$CONFIG_DIR/"
echo "  ✅ compaction.json"

# 设置权限
echo "🔒 设置权限..."
chmod -R 755 "$SKILLS_DIR/git-context"
chmod -R 755 "$SKILLS_DIR/session-compaction"
chmod 644 "$CONFIG_DIR/compaction.json"

# 验证
echo ""
echo "🧪 运行测试..."
echo "────────────────────────────────────────────────────────────────"

if node "$SKILLS_DIR/git-context/test.js" 2>/dev/null; then
  echo "✅ git-context 测试通过"
else
  echo "⚠️  git-context 测试未通过，但安装完成"
fi

if node "$SKILLS_DIR/session-compaction/test.js" 2>/dev/null; then
  echo "✅ session-compaction 测试通过"
else
  echo "⚠️  session-compaction 测试未通过，但安装完成"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     安装完成！                                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "查看状态:"
echo "  node ~/clawd/openclaw-smart.js --status"
echo ""
echo "快速开始:"
echo "  node ~/clawd/openclaw-with-git.js agent \"你的问题\""
echo ""
