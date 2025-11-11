#!/bin/bash

# ============================================================================
# Docker 镜像构建脚本
# ============================================================================
# 功能：自动递增版本号，构建并推送 Docker 镜像到阿里云镜像仓库
# 使用：./scripts/docker-build.sh [options]
# ============================================================================

set -e  # 遇到错误立即退出

# ============================================================================
# 配置项
# ============================================================================
REGISTRY="registry.cn-shanghai.aliyuncs.com"
NAMESPACE="hxh_ai"
IMAGE_NAME="claude-relay-service"
FULL_IMAGE_NAME="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}"

# 版本文件路径
VERSION_FILE="DOCKER_VERSION"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# 辅助函数
# ============================================================================

# 打印带颜色的消息
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

# 显示帮助信息
show_help() {
    cat << EOF
Docker 镜像构建脚本

用法:
    $0 [选项]

选项:
    -h, --help              显示帮助信息
    -v, --version VERSION   指定版本号（不自动递增）
    -p, --push              构建后推送到远程仓库
    --no-cache              构建时不使用缓存
    --platform PLATFORMS    指定平台（如 linux/amd64,linux/arm64）
    --dry-run               模拟运行，不实际构建
    --list-tags             列出最近的镜像标签
    --use-app-version       使用项目 VERSION 文件中的版本号

示例:
    # 自动递增版本并构建
    $0

    # 构建并推送到远程仓库
    $0 --push

    # 指定版本号
    $0 -v 10

    # 多架构构建并推送
    $0 --platform linux/amd64,linux/arm64 --push

    # 查看镜像标签
    $0 --list-tags

EOF
    exit 0
}

# 获取当前版本号
get_current_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE" | tr -d '[:space:]'
    else
        echo "0"
    fi
}

# 保存版本号
save_version() {
    local version=$1
    echo "$version" > "$VERSION_FILE"
    print_success "版本号已保存到 $VERSION_FILE: $version"
}

# 递增版本号
increment_version() {
    local current_version=$(get_current_version)
    local new_version=$((current_version + 1))
    echo "$new_version"
}

# 列出最近的镜像标签
list_tags() {
    print_info "正在查询镜像标签..."

    # 尝试使用 docker images 列出本地镜像
    if docker images "${FULL_IMAGE_NAME}" --format "table {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | head -20; then
        echo ""
        print_info "当前 Docker 版本号: $(get_current_version)"
    else
        print_warning "未找到本地镜像"
    fi

    exit 0
}

# 检查 Docker 是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker 未运行，请先启动 Docker"
        exit 1
    fi
}

# 检查是否登录到阿里云镜像仓库
check_registry_login() {
    print_info "检查镜像仓库登录状态..."

    # 尝试推送一个轻量级测试（实际上不会执行，只是检查权限）
    if ! docker login "${REGISTRY}" --get-login 2>/dev/null | grep -q "Login Succeeded"; then
        print_warning "尚未登录到阿里云镜像仓库"
        print_info "请运行以下命令登录："
        echo ""
        echo "    docker login ${REGISTRY}"
        echo ""
        read -p "是否现在登录? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker login "${REGISTRY}"
        else
            print_error "需要登录才能推送镜像"
            exit 1
        fi
    else
        print_success "已登录到镜像仓库"
    fi
}

# 构建 Docker 镜像
build_image() {
    local version=$1
    local no_cache=$2
    local platform=$3
    local dry_run=$4

    local cache_flag=""
    if [ "$no_cache" = true ]; then
        cache_flag="--no-cache"
    fi

    local platform_flag=""
    if [ -n "$platform" ]; then
        platform_flag="--platform $platform"
    fi

    print_info "开始构建镜像..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  镜像名称: ${FULL_IMAGE_NAME}"
    echo "  版本号:   ${version}"
    echo "  标签:     ${version}, latest"
    if [ -n "$platform" ]; then
        echo "  平台:     ${platform}"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    if [ "$dry_run" = true ]; then
        print_warning "模拟运行模式，不会实际构建"
        print_info "将执行的命令："
        echo "docker build $cache_flag $platform_flag \\"
        echo "  -t ${FULL_IMAGE_NAME}:${version} \\"
        echo "  -t ${FULL_IMAGE_NAME}:latest \\"
        echo "  ."
        return 0
    fi

    # 执行构建
    docker build $cache_flag $platform_flag \
        -t "${FULL_IMAGE_NAME}:${version}" \
        -t "${FULL_IMAGE_NAME}:latest" \
        .

    print_success "镜像构建完成"
    echo ""
    print_info "构建的镜像："
    echo "  - ${FULL_IMAGE_NAME}:${version}"
    echo "  - ${FULL_IMAGE_NAME}:latest"
}

# 推送镜像到远程仓库
push_image() {
    local version=$1
    local dry_run=$2

    print_info "准备推送镜像到远程仓库..."

    if [ "$dry_run" = true ]; then
        print_warning "模拟运行模式，不会实际推送"
        print_info "将执行的命令："
        echo "docker push ${FULL_IMAGE_NAME}:${version}"
        echo "docker push ${FULL_IMAGE_NAME}:latest"
        return 0
    fi

    check_registry_login

    echo ""
    print_info "推送版本镜像: ${version}"
    docker push "${FULL_IMAGE_NAME}:${version}"

    echo ""
    print_info "推送 latest 镜像"
    docker push "${FULL_IMAGE_NAME}:latest"

    print_success "镜像推送完成"
}

# 显示构建总结
show_summary() {
    local version=$1
    local pushed=$2

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_success "构建完成！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📦 构建信息："
    echo "  版本号: ${version}"
    echo "  镜像名: ${FULL_IMAGE_NAME}"
    echo ""
    echo "🏷️  镜像标签："
    echo "  - ${FULL_IMAGE_NAME}:${version}"
    echo "  - ${FULL_IMAGE_NAME}:latest"
    echo ""

    if [ "$pushed" = true ]; then
        echo "🚀 推送状态: 已推送到远程仓库"
        echo ""
        echo "💡 拉取命令："
        echo "  docker pull ${FULL_IMAGE_NAME}:${version}"
        echo "  docker pull ${FULL_IMAGE_NAME}:latest"
    else
        echo "📍 推送状态: 未推送（仅本地构建）"
        echo ""
        echo "💡 推送命令："
        echo "  docker push ${FULL_IMAGE_NAME}:${version}"
        echo "  docker push ${FULL_IMAGE_NAME}:latest"
    fi

    echo ""
    echo "🐳 运行命令："
    echo "  docker run -d -p 3000:3000 ${FULL_IMAGE_NAME}:${version}"
    echo ""
}

# ============================================================================
# 主程序
# ============================================================================

main() {
    # 默认参数
    local custom_version=""
    local should_push=false
    local no_cache=false
    local platform=""
    local dry_run=false
    local use_app_version=false

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                ;;
            -v|--version)
                custom_version="$2"
                shift 2
                ;;
            -p|--push)
                should_push=true
                shift
                ;;
            --no-cache)
                no_cache=true
                shift
                ;;
            --platform)
                platform="$2"
                shift 2
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --list-tags)
                list_tags
                ;;
            --use-app-version)
                use_app_version=true
                shift
                ;;
            *)
                print_error "未知参数: $1"
                echo "使用 -h 或 --help 查看帮助"
                exit 1
                ;;
        esac
    done

    # 检查 Docker
    check_docker

    # 显示标题
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   Docker 镜像构建工具                  ║"
    echo "║   Claude Relay Service                 ║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    # 确定版本号
    local version
    if [ -n "$custom_version" ]; then
        version="$custom_version"
        print_info "使用指定版本号: $version"
    elif [ "$use_app_version" = true ]; then
        if [ -f "VERSION" ]; then
            version=$(cat VERSION | tr -d '[:space:]')
            print_info "使用项目版本号: $version"
        else
            print_error "未找到 VERSION 文件"
            exit 1
        fi
    else
        local current_version=$(get_current_version)
        version=$(increment_version)
        print_info "当前版本: $current_version"
        print_info "新版本: $version"
    fi

    echo ""

    # 确认构建
    if [ "$dry_run" = false ]; then
        read -p "确认构建版本 $version? (Y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]?$ ]]; then
            print_warning "构建已取消"
            exit 0
        fi
    fi

    echo ""

    # 构建镜像
    build_image "$version" "$no_cache" "$platform" "$dry_run"

    # 保存版本号（仅在自动递增且非干跑模式时）
    if [ -z "$custom_version" ] && [ "$use_app_version" = false ] && [ "$dry_run" = false ]; then
        save_version "$version"
    fi

    # 推送镜像（如果需要）
    if [ "$should_push" = true ]; then
        echo ""
        push_image "$version" "$dry_run"
    fi

    # 显示总结
    show_summary "$version" "$should_push"
}

# 运行主程序
main "$@"
