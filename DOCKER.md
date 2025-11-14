# Docker 构建快速参考

> 📚 完整文档请查看: [docs/DOCKER_BUILD.md](docs/DOCKER_BUILD.md)

## 🚀 快速命令

### 构建镜像

```bash
# 构建新版本（版本号自动递增，自动编译前端）
npm run docker:build

# 构建并推送到阿里云（自动编译前端）
npm run docker:build:push

# 跳过前端编译（如果已手动编译）
npm run docker:build -- --skip-build-web

# 不使用缓存构建
npm run docker:build:nocache

# 查看镜像列表
npm run docker:list
```

### 直接使用脚本

```bash
# 基本构建（自动编译前端）
./scripts/docker-build.sh

# 构建并推送（自动编译前端）
./scripts/docker-build.sh --push

# 跳过前端编译
./scripts/docker-build.sh --skip-build-web --push

# 指定版本
./scripts/docker-build.sh -v 10

# 查看帮助
./scripts/docker-build.sh --help
```

## 📦 镜像信息

- **镜像地址**: `registry.cn-shanghai.aliyuncs.com/hxh_ai/claude-relay-service`
- **版本文件**: `DOCKER_VERSION`（当前版本号存储在此文件）

## 🔄 自动编译前端

从现在开始，Docker 构建脚本会 **自动编译前端项目**，无需手动运行 `npm run build:web`。

### 功能特点

- ✅ **自动检测依赖**：如果前端依赖未安装，会自动运行 `npm install`
- ✅ **编译验证**：自动检查 `dist` 目录是否生成，并显示编译产物大小
- ✅ **智能跳过**：使用 `--skip-build-web` 参数可跳过编译（适合已手动编译的场景）
- ✅ **错误处理**：编译失败会立即停止构建流程

### 工作流程

```bash
# 完整流程（推荐）
npm run docker:build:push

# 等同于手动执行：
# 1. cd web/admin-spa && npm run build
# 2. cd ../..
# 3. docker build ...
# 4. docker push ...
```

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
