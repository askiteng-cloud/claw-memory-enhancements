#!/bin/bash
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的信息
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     OpenClaw 记忆增强技能 - 安装程序                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# ═════════════════════════════════════════════════════════════════
# 步骤 1: 侦测 OpenClaw 安装位置
# ═════════════════════════════════════════════════════════════════

info "步骤 1/5: 侦测 OpenClaw 工作环境..."

# 函数：快速判断是否可能是 OpenClaw 目录
is_likely_clawd() {
  local dir="$1"
  [ -z "$dir" ] && return 1
  [ ! -d "$dir" ] && return 1
  # 包含 .openclaw 或是典型的目录名
  if [[ "$dir" == *"openclaw"* ]] || [[ "$dir" == *"clawd"* ]]; then
    return 0
  fi
  return 1
}

find_locations() {
  local candidates=(
    "$HOME/.openclaw"
    "$HOME/.openclaw/workspace"
    "$HOME/.openclaw/workspace-main"
    "$HOME/clawd"
    "$HOME/.clawd"
    "$HOME/.npm-global/lib/node_modules/openclaw"
  )
  
  # 从 openclaw 命令推断
  if command -v openclaw >/dev/null 2>&1; then
    local op
    op=$(readlink -f "$(which openclaw)")
    candidates+=("$(dirname "$op")" "$(dirname "$(dirname "$op")")")
  fi

  # 使用简单 find
  mapfile -t found < <(find "$HOME" -maxdepth 2 -name "*openclaw*" -type d 2>/dev/null || true)
  candidates+=("${found[@]}")

  # 过滤并去重
  local final=()
  for c in "${candidates[@]}"; do
    if [ -d "$c" ]; then
      final+=("$(readlink -f "$c")")
    fi
  done
  
  printf '%s\n' "${final[@]}" | sort -u | grep -v '^$'
}

# 搜集路径
mapfile -t found_dirs < <(find_locations)

if [ ${#found_dirs[@]} -gt 0 ]; then
  success "发现以下可能的 OpenClaw 目录:"
  for i in "${!found_dirs[@]}"; do
    echo "  [$((i+1))] ${found_dirs[$i]}"
  done
  echo "  [m] 手动输入路径"
  echo ""
  read -rp "请选择安装目标 [1-${#found_dirs[@]}/m]: " choice
  
  if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#found_dirs[@]}" ]; then
    OPENCLAW_HOME="${found_dirs[$((choice-1))]}"
  elif [[ "$choice" == "m" ]]; then
    read -rp "请输入路径: " OPENCLAW_HOME
  else
    error "选择无效，退出"
    exit 1
  fi
else
  warning "未自动侦测到目录"
  read -rp "请输入你的 OpenClaw 目录路径 [默认: $HOME/.openclaw]: " OPENCLAW_HOME
  OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
fi

export OPENCLAW_HOME
SKILLS_DIR="$OPENCLAW_HOME/skills"
CONFIG_DIR="$OPENCLAW_HOME/config"

# 处理隐藏配置目录的情况
[ -d "$OPENCLAW_HOME/.openclaw" ] && CONFIG_DIR="$OPENCLAW_HOME/.openclaw"
# 确保 skills 目录存在
[ ! -d "$SKILLS_DIR" ] && SKILLS_DIR="$OPENCLAW_HOME"

info "安装到: $OPENCLAW_HOME"
echo "  Skills: $SKILLS_DIR"
echo "  Config: $CONFIG_DIR"

# ═════════════════════════════════════════════════════════════════
# 步骤 2: 执行安装
# ═════════════════════════════════════════════════════════════════

mkdir -p "$SKILLS_DIR" "$CONFIG_DIR"

info "复制文件..."
cp -r git-context session-compaction "$SKILLS_DIR/"
cp compaction.json "$CONFIG_DIR/"

# ═════════════════════════════════════════════════════════════════
# 步骤 5: 验证与 Doctor
# ═════════════════════════════════════════════════════════════════

if command -v openclaw >/dev/null 2>&1; then
  info "运行 openclaw doctor --fix..."
  openclaw doctor --fix || true
fi

success "安装完成！"
