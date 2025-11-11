#!/bin/bash

# ============================================================================
# 数据恢复脚本
# ============================================================================
# 功能：从备份恢复所有关键数据
# 使用：./scripts/restore-data.sh <备份目录>
# ============================================================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查参数
if [ -z "$1" ]; then
    print_error "请指定备份目录"
    echo ""
    echo "用法: $0 <备份目录>"
    echo ""
    echo "示例:"
    echo "  $0 ./backups/backup-20250111-120000"
    echo ""
    exit 1
fi

BACKUP_DIR="$1"

# 检查备份目录是否存在
if [ ! -d "$BACKUP_DIR" ]; then
    print_error "备份目录不存在: $BACKUP_DIR"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════╗"
echo "║     数据恢复工具                       ║"
echo "║     Claude Relay Service               ║"
echo "╚════════════════════════════════════════╝"
echo ""

print_info "备份目录: $BACKUP_DIR"
echo ""

# 显示备份信息
if [ -f "$BACKUP_DIR/BACKUP_INFO.txt" ]; then
    print_info "备份信息:"
    cat "$BACKUP_DIR/BACKUP_INFO.txt"
    echo ""
fi

# 确认恢复
print_warning "这将覆盖当前数据！"
read -p "确认恢复? (输入 YES 继续): " -r
echo
if [ "$REPLY" != "YES" ]; then
    print_warning "恢复已取消"
    exit 0
fi

# 停止服务
print_info "停止 Docker 服务..."
docker-compose down 2>/dev/null || print_warning "Docker 服务未��行或停止失败"
echo ""

# 备份当前数据（以防万一）
CURRENT_BACKUP="./backups/before-restore-$(date +%Y%m%d-%H%M%S)"
print_info "备份当前数据到: $CURRENT_BACKUP"
mkdir -p "$CURRENT_BACKUP"
[ -d "./redis_data" ] && cp -r ./redis_data "$CURRENT_BACKUP/" && print_success "当前 Redis 数据已备份"
[ -d "./data" ] && cp -r ./data "$CURRENT_BACKUP/" && print_success "当前应用数据已备份"
[ -f ".env" ] && cp .env "$CURRENT_BACKUP/" && print_success "当前 .env 已备份"
echo ""

# 恢复数据
print_info "恢复数据..."

# 1. 恢复 Redis 数据
if [ -d "$BACKUP_DIR/redis_data" ]; then
    rm -rf ./redis_data
    cp -r "$BACKUP_DIR/redis_data" ./redis_data
    print_success "Redis 数据恢复完成"
fi

# 2. 恢复应用数据
if [ -d "$BACKUP_DIR/data" ]; then
    rm -rf ./data
    cp -r "$BACKUP_DIR/data" ./data
    print_success "应用数据恢复完成"
fi

# 3. 恢复配置文件
if [ -f "$BACKUP_DIR/.env" ]; then
    cp "$BACKUP_DIR/.env" ./.env
    print_success ".env 文件恢复完成"
fi

if [ -f "$BACKUP_DIR/config.js" ]; then
    cp "$BACKUP_DIR/config.js" ./config/config.js
    print_success "config.js 文件恢复完成"
fi

echo ""

# 显示总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "恢复完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 恢复信息："
echo "  来源: $BACKUP_DIR"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "💡 下一步："
echo "  1. 启动服务: docker-compose up -d"
echo "  2. 查看日志: docker-compose logs -f"
echo "  3. 检查状态: npm run status"
echo ""
echo "⚠️  当前数据备份在: $CURRENT_BACKUP"
echo ""
