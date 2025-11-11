# Docker 构建快速参考

> 📚 完整文档请查看: [docs/DOCKER_BUILD.md](docs/DOCKER_BUILD.md)

## 🚀 快速命令

### 构建镜像

```bash
# 构建新版本（版本号自动递增）
npm run docker:build

# 构建并推送到阿里云
npm run docker:build:push

# 不使用缓存构建
npm run docker:build:nocache

# 查看镜像列表
npm run docker:list
```

### 直接使用脚本

```bash
# 基本构建
./scripts/docker-build.sh

# 构建并推送
./scripts/docker-build.sh --push

# 指定版本
./scripts/docker-build.sh -v 10

# 查看帮助
./scripts/docker-build.sh --help
```

## 📦 镜像信息

- **镜像地址**: `registry.cn-shanghai.aliyuncs.com/hxh_ai/claude-relay-service`
- **版本文件**: `DOCKER_VERSION`（当前版本号存储在此文件）

## 🔐 首次使用

```bash
# 1. 登录阿里云镜像仓库
docker login registry.cn-shanghai.aliyuncs.com

# 2. 构建并推送
npm run docker:build:push
```

## 🐳 使用镜像

```bash
# 拉取最新镜像
docker pull registry.cn-shanghai.aliyuncs.com/hxh_ai/claude-relay-service:latest

# 拉取指定版本
docker pull registry.cn-shanghai.aliyuncs.com/hxh_ai/claude-relay-service:5

# 运行容器
docker run -d -p 3000:3000 \
  --name claude-relay \
  registry.cn-shanghai.aliyuncs.com/hxh_ai/claude-relay-service:latest
```

## 📋 版本管理

```bash
# 查看当前版本
cat DOCKER_VERSION

# 手动设置版本
echo "10" > DOCKER_VERSION

# 查看已构建的镜像
docker images registry.cn-shanghai.aliyuncs.com/hxh_ai/claude-relay-service
```

## ⚠️ 常见问题

### Docker 未运行
```bash
# macOS/Windows: 启动 Docker Desktop
# Linux
sudo systemctl start docker
```

### 未登录镜像仓库
```bash
docker login registry.cn-shanghai.aliyuncs.com
```

### 推送权限被拒绝
- 检查账号是否有推送权限
- 在阿里云容器镜像服务控制台检查仓库设置

---

💡 **提示**: 更���高级用法和故障排除请参考 [完整文档](docs/DOCKER_BUILD.md)
