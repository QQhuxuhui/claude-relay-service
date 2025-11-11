#!/bin/bash

# ============================================================================
# 数据备份脚本
# ============================================================================
# 功能：备份所有关键数据（Redis、配置、日志）
# 使用：./scripts/backup-data.sh [备份目录]
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

# 默认备份目录
BACKUP_DIR="${1:-./backups/backup-$(date +%Y%m%d-%H%M%S)}"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║     数据备份工具                       ║"
echo "║     Claude Relay Service               ║"
echo "╚════════════════════════════════════════╝"
echo ""

print_info "备份目录: $BACKUP_DIR"
echo ""

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 1. 备份 Redis 数据
print_info "备份 Redis 数据..."
if [ -d "./redis_data" ]; then
    cp -r ./redis_data "$BACKUP_DIR/redis_data"
    print_success "Redis 数据备份完成"
else
    print_warning "Redis 数据目录不存在，跳过"
fi
echo ""

# 2. 备份应用数据
print_info "备份应用数据..."
if [ -d "./data" ]; then
    cp -r ./data "$BACKUP_DIR/data"
    print_success "应用数据备份完成"
else
    print_warning "应用数据目录不存在，跳过"
fi
echo ""

# 3. 备份日志（可选）
print_info "备份日志文件..."
if [ -d "./logs" ]; then
    cp -r ./logs "$BACKUP_DIR/logs"
    print_success "日志文件备份完成"
else
    print_warning "日志目录不存在，跳过"
fi
echo ""

# 4. 备份配置文件
print_info "备份配置文件..."
[ -f ".env" ] && cp .env "$BACKUP_DIR/.env" && print_success ".env 文件备份完成"
[ -f "config/config.js" ] && cp config/config.js "$BACKUP_DIR/config.js" && print_success "config.js 文件备份完成"
echo ""

# 5. 使用项目自带工具导出 Redis 数据（JSON 格式）
print_info "导出 Redis 数据为 JSON 格式..."
if command -v node &> /dev/null; then
    if [ -f "scripts/data-transfer-enhanced.js" ]; then
        node scripts/data-transfer-enhanced.js export "$BACKUP_DIR/redis-export.json" --decrypt 2>/dev/null || print_warning "Redis 导出失败（可能是 Redis 未运行）"
        if [ -f "$BACKUP_DIR/redis-export.json" ]; then
            print_success "Redis JSON 导出完成"
        fi
    fi
fi
echo ""

# 6. 创建备份清单
print_info "创建备份清单..."
cat > "$BACKUP_DIR/BACKUP_INFO.txt" <<EOF
备份时间: $(date '+%Y-%m-%d %H:%M:%S')
备份目录: $BACKUP_DIR
主机名: $(hostname)
备份内容:
- Redis 数据 (redis_data/)
- 应用数据 (data/)
- 日志文件 (logs/)
- 环境配置 (.env)
- 应用配置 (config.js)
- Redis JSON 导出 (redis-export.json)

恢复说明:
1. 停止服务: docker-compose down
2. 恢复数据:
   - cp -r $BACKUP_DIR/redis_data ./
   - cp -r $BACKUP_DIR/data ./
   - cp $BACKUP_DIR/.env ./
3. 启动服务: docker-compose up -d

或使用 JSON 导入:
   node scripts/data-transfer-enhanced.js import $BACKUP_DIR/redis-export.json
EOF

print_success "备份清单创建完成"
echo ""

# 7. 计算备份大小
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

# 显示总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "备份完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 备份信息："
echo "  位置: $BACKUP_DIR"
echo "  大小: $BACKUP_SIZE"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "📋 备份内容："
[ -d "$BACKUP_DIR/redis_data" ] && echo "  ✅ Redis 数据"
[ -d "$BACKUP_DIR/data" ] && echo "  ✅ 应用数据"
[ -d "$BACKUP_DIR/logs" ] && echo "  ✅ 日志文件"
[ -f "$BACKUP_DIR/.env" ] && echo "  ✅ 环境配置"
[ -f "$BACKUP_DIR/config.js" ] && echo "  ✅ 应用配置"
[ -f "$BACKUP_DIR/redis-export.json" ] && echo "  ✅ Redis JSON 导出"
echo ""
echo "💡 恢复命令："
echo "  ./scripts/restore-data.sh $BACKUP_DIR"
echo ""
