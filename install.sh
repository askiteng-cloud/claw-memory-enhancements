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

# 函数：验证目录是否是有效的 OpenClaw 目录
validate_clawd_dir() {
  local dir="$1"
  if [ -d "$dir" ] && [ -d "$dir/skills" ] && [ -d "$dir/config" ]; then
    return 0
  elif [ -d "$dir" ] && [ -f "$dir/.openclaw/config.json" ] 2>/dev/null; then
    return 0
  else
    return 1
  fi
}

# 函数：查找可能的 OpenClaw 目录
find_clawd_locations() {
  local locations=(
    "$HOME/clawd"
    "$HOME/.clawd"
    "$HOME/.openclaw"
    "$HOME/openclaw"
    "/opt/clawd"
    "/opt/openclaw"
  )
  
  # 检查 CLAWD_HOME 环境变量
  if [ -n "$CLAWD_HOME" ]; then
    locations=("$CLAWD_HOME" "${locations[@]}")
  fi
  
  # 检查 openclaw 命令位置
  if command -v openclaw >/dev/null 2>&1; then
    local openclaw_path
    openclaw_path=$(which openclaw)
    # 尝试从命令路径推断
    if [ -L "$openclaw_path" ]; then
      local real_path
      real_path=$(readlink -f "$openclaw_path")
      local parent_dir
      parent_dir=$(dirname "$real_path")
      locations+=("$parent_dir")
    fi
  fi
  
  # 去重并检查
  local found_dirs=()
  for dir in "${locations[@]}"; do
    if validate_clawd_dir "$dir"; then
      found_dirs+=("$dir")
    fi
  done
  
  # 去除重复
  printf '%s\n' "${found_dirs[@]}" | sort -u
}

CLAWD_HOME=""

# 首先检查环境变量
if [ -n "$CLAWD_HOME" ] && validate_clawd_dir "$CLAWD_HOME"; then
  success "从环境变量找到 OpenClaw: $CLAWD_HOME"
# 然后尝试自动侦测
else
  info "正在搜索 OpenClaw 安装位置..."
  
  # 查找所有可能的位置
  mapfile -t found_dirs < <(find_clawd_locations)
  
  if [ ${#found_dirs[@]} -eq 0 ]; then
    warning "未找到 OpenClaw 安装目录"
    echo ""
    echo "可能的 OpenClaw 位置:"
    echo "  - ~/clawd (默认)"
    echo "  - ~/.clawd"
    echo "  - ~/.openclaw"
    echo "  - /opt/clawd"
    echo ""
    read -rp "请输入你的 OpenClaw 目录路径 [默认: ~/clawd]: " user_input
    
    CLAWD_HOME="${user_input:-$HOME/clawd}"
    
    if ! validate_clawd_dir "$CLAWD_HOME"; then
      warning "目录 $CLAWD_HOME 看起来不像有效的 OpenClaw 目录"
      read -rp "是否仍要安装到此目录? (y/N): " confirm
      if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        error "安装取消"
        exit 1
      fi
    fi
    
  elif [ ${#found_dirs[@]} -eq 1 ]; then
    CLAWD_HOME="${found_dirs[0]}"
    success "找到 OpenClaw: $CLAWD_HOME"
    
  else
    # 找到多个，让用户选择
    echo ""
    echo "找到多个可能的 OpenClaw 目录:"
    for i in "${!found_dirs[@]}"; do
      echo "  [$((i+1))] ${found_dirs[$i]}"
    done
    echo ""
    read -rp "请选择要安装到的目录 [1-${#found_dirs[@]}]: " choice
    
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#found_dirs[@]}" ]; then
      CLAWD_HOME="${found_dirs[$((choice-1))]}"
      success "选择: $CLAWD_HOME"
    else
      error "无效选择，安装取消"
      exit 1
    fi
  fi
fi

# 导出供后续使用
export CLAWD_HOME
SKILLS_DIR="$CLAWD_HOME/skills"
CONFIG_DIR="$CLAWD_HOME/config"

echo ""
info "安装目标:"
echo "  CLAWD_HOME: $CLAWD_HOME"
echo "  SKILLS_DIR: $SKILLS_DIR"
echo "  CONFIG_DIR: $CONFIG_DIR"
echo ""

# ═════════════════════════════════════════════════════════════════
# 步骤 2: 检查依赖
# ═════════════════════════════════════════════════════════════════

info "步骤 2/5: 检查依赖..."

# 检查 Node.js
if ! command -v node >/dev/null 2>&1; then
  error "未找到 Node.js，请先安装 Node.js ≥ 18"
  exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  warning "Node.js 版本 $NODE_VERSION 可能太低，建议 ≥ 18"
else
  success "Node.js: $(node --version)"
fi

# 检查 Git（可选）
if ! command -v git >/dev/null 2>&1; then
  warning "未找到 Git，git-context 技能将无法使用"
else
  success "Git: $(git --version | head -1)"
fi

# 检查 OpenClaw 命令（可选）
if command -v openclaw >/dev/null 2>&1; then
  success "OpenClaw 命令: $(which openclaw)"
else
  warning "未找到 openclaw 命令，但技能仍可安装"
fi

echo ""

# ═════════════════════════════════════════════════════════════════
# 步骤 3: 验证目录结构
# ═════════════════════════════════════════════════════════════════

info "步骤 3/5: 验证目录结构..."

# 确保目标目录存在
if [ ! -d "$CLAWD_HOME" ]; then
  info "创建 CLAWD_HOME 目录..."
  mkdir -p "$CLAWD_HOME"
fi

# 确保 skills 和 config 子目录存在
mkdir -p "$SKILLS_DIR"
mkdir -p "$CONFIG_DIR"

# 验证权限
if [ ! -w "$SKILLS_DIR" ]; then
  error "没有写入权限: $SKILLS_DIR"
  exit 1
fi

if [ ! -w "$CONFIG_DIR" ]; then
  error "没有写入权限: $CONFIG_DIR"
  exit 1
fi

success "目录结构验证通过"
echo ""

# ═════════════════════════════════════════════════════════════════
# 步骤 4: 安装技能
# ═════════════════════════════════════════════════════════════════

info "步骤 4/5: 安装技能文件..."

# 检查源文件是否存在
if [ ! -d "git-context" ] || [ ! -d "session-compaction" ]; then
  error "未找到技能文件，请确保在正确的目录运行此脚本"
  echo ""
  echo "正确用法:"
  echo "  cd claw-memory-enhancements/"
  echo "  ./install.sh"
  exit 1
fi

# 安装 git-context
if [ -d "git-context" ]; then
  info "安装 git-context..."
  
  # 如果已存在，先备份
  if [ -d "$SKILLS_DIR/git-context" ]; then
    backup_name="git-context.bak.$(date +%Y%m%d_%H%M%S)"
    mv "$SKILLS_DIR/git-context" "$SKILLS_DIR/$backup_name"
    warning "已备份原有 git-context 到 $backup_name"
  fi
  
  cp -r git-context "$SKILLS_DIR/"
  chmod -R 755 "$SKILLS_DIR/git-context"
  success "git-context 安装完成"
fi

# 安装 session-compaction
if [ -d "session-compaction" ]; then
  info "安装 session-compaction..."
  
  # 如果已存在，先备份
  if [ -d "$SKILLS_DIR/session-compaction" ]; then
    backup_name="session-compaction.bak.$(date +%Y%m%d_%H%M%S)"
    mv "$SKILLS_DIR/session-compaction" "$SKILLS_DIR/$backup_name"
    warning "已备份原有 session-compaction 到 $backup_name"
  fi
  
  cp -r session-compaction "$SKILLS_DIR/"
  chmod -R 755 "$SKILLS_DIR/session-compaction"
  success "session-compaction 安装完成"
fi

# 安装配置文件
if [ -f "compaction.json" ]; then
  info "安装配置文件..."
  
  # 备份原有配置
  if [ -f "$CONFIG_DIR/compaction.json" ]; then
    backup_name="compaction.json.bak.$(date +%Y%m%d_%H%M%S)"
    cp "$CONFIG_DIR/compaction.json" "$CONFIG_DIR/$backup_name"
    warning "已备份原有配置到 $backup_name"
  fi
  
  cp compaction.json "$CONFIG_DIR/"
  chmod 644 "$CONFIG_DIR/compaction.json"
  success "配置文件安装完成"
fi

echo ""

# ═════════════════════════════════════════════════════════════════
# 步骤 5: 验证安装
# ═════════════════════════════════════════════════════════════════

info "步骤 5/5: 验证安装..."
echo "────────────────────────────────────────────────────────────────"

# 检查文件是否存在
all_good=true

if [ -d "$SKILLS_DIR/git-context" ]; then
  success "git-context 目录存在"
else
  error "git-context 目录不存在"
  all_good=false
fi

if [ -d "$SKILLS_DIR/session-compaction" ]; then
  success "session-compaction 目录存在"
else
  error "session-compaction 目录不存在"
  all_good=false
fi

if [ -f "$CONFIG_DIR/compaction.json" ]; then
  success "compaction.json 存在"
else
  error "compaction.json 不存在"
  all_good=false
fi

echo ""

# 运行测试（可选）
info "运行技能测试..."

if [ -f "$SKILLS_DIR/git-context/test.js" ]; then
  if node "$SKILLS_DIR/git-context/test.js" 2>/dev/null | grep -q "All tests passed"; then
    success "git-context 测试通过"
  else
    warning "git-context 测试未完全通过（可能不影响使用）"
  fi
else
  warning "未找到 git-context 测试文件"
fi

if [ -f "$SKILLS_DIR/session-compaction/test.js" ]; then
  if node "$SKILLS_DIR/session-compaction/test.js" 2>/dev/null | grep -q "All tests passed"; then
    success "session-compaction 测试通过"
  else
    warning "session-compaction 测试未完全通过（可能不影响使用）"
  fi
else
  warning "未找到 session-compaction 测试文件"
fi

echo ""

# ═════════════════════════════════════════════════════════════════
# 完成
# ═════════════════════════════════════════════════════════════════

if [ "$all_good" = true ]; then
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║     ✅ 安装成功！                                              ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  success "OpenClaw 记忆增强技能已安装到:"
  echo "  📁 $CLAWD_HOME"
  echo ""
  info "查看状态:"
  echo "  node $CLAWD_HOME/skills/git-context/openclaw.js --status 2>/dev/null || echo '  请手动检查配置'"
  echo ""
  info "快速开始:"
  echo "  # 命令行使用"
  echo "  node $CLAWD_HOME/skills/git-context/openclaw.js"
  echo ""
  echo "  # 或在 Telegram 直接对话（自动启用）"
  echo ""
  info "配置文件位置:"
  echo "  $CONFIG_DIR/compaction.json"
  echo ""
  warning "提示: 如果 openclaw 命令找不到这些技能，请检查:"
  echo "  1. CLAWD_HOME 环境变量是否设置正确"
  echo "  2. OpenClaw 的 skills 目录配置"
  echo ""
else
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║     ⚠️  安装完成，但有警告                                     ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  warning "某些文件可能未正确安装，请检查上述错误信息"
  exit 1
fi
