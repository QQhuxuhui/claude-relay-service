# 🐳 主应用阶段 (前端已在本地预构建)
FROM node:18-alpine

# 📋 设置标签
LABEL maintainer="claude-relay-service@example.com"
LABEL description="Claude Code API Relay Service"
LABEL version="1.0.0"

# 🔧 安装系统依赖 (使用 wget 替代 curl，已在基础镜像中)
RUN apk add --no-cache dumb-init || true

# 📁 设置工作目录
WORKDIR /app

# 📋 复制应用代码 (包含预构建的前端 dist 目录和 node_modules)
COPY . .

# 🔧 复制并设置启动脚本权限
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 📁 创建必要目录
RUN mkdir -p logs data temp

# 🔧 预先创建配置文件
RUN if [ ! -f "/app/config/config.js" ] && [ -f "/app/config/config.example.js" ]; then \
        cp /app/config/config.example.js /app/config/config.js; \
    fi

# 🌐 暴露端口
EXPOSE 3000

# 🏥 健康检查 (使用 wget，在基础镜像中可用)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 🚀 启动应用
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "src/app.js"]