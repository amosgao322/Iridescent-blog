# 使用 Node.js 运行时作为基础镜像（官方 Docker Hub：node:20-alpine）
# 若需使用其他镜像源，构建时传入：docker build --build-arg BASE_IMAGE=你的镜像地址 ...
ARG BASE_IMAGE=node:20-alpine
FROM ${BASE_IMAGE} AS base

# 安装依赖阶段
FROM base AS deps
WORKDIR /app

#  package 文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量（构建阶段也需要 NODE_ENV）
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 复制构建脚本并设置权限
# 注意：由于 COPY . . 已经执行，文件已经在 /app/docker/build-with-debug.sh
# 我们将其复制到 /tmp 并设置权限
RUN cp /app/docker/build-with-debug.sh /tmp/build-with-debug.sh && \
    chmod +x /tmp/build-with-debug.sh

# 构建应用（使用调试脚本）
# 注意：脚本会输出所有调试信息到标准输出，如果失败会显示详细错误
RUN /tmp/build-with-debug.sh

# 验证构建产物存在（详细检查）
RUN echo "=== Verifying build output ===" && \
    test -d /app/.next || (echo "ERROR: .next directory not found!"; exit 1) && \
    test -d /app/.next/standalone || (echo "ERROR: .next/standalone directory not found!"; echo "Contents of .next:"; ls -la /app/.next/ 2>&1; echo "Contents of .next (recursive):"; find /app/.next -type d -maxdepth 2 2>&1; exit 1) && \
    test -d /app/.next/static || (echo "ERROR: .next/static directory not found!"; exit 1) && \
    echo "=== Build output verification passed ===" && \
    ls -la /app/.next/standalone/ | head -10 && \
    echo "=== Checking for API routes in standalone ===" && \
    (test -d /app/.next/standalone/app/api && echo "✓ API routes directory found" || echo "✗ API routes directory NOT found") && \
    (test -d /app/.next/standalone/app/api/analytics && echo "✓ Analytics API directory found" || echo "✗ Analytics API directory NOT found") && \
    (test -f /app/.next/standalone/app/api/analytics/duration/route.js && echo "✓ Duration API route found" || echo "✗ Duration API route NOT found")

# 确保 public 目录存在（如果项目中没有，创建一个空的）
RUN mkdir -p /app/public

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 安装构建工具（用于编译 better-sqlite3 原生模块）
RUN apk add --no-cache python3 make g++

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制 package.json 以便安装 better-sqlite3（需要在运行环境重新编译）
COPY --from=builder /app/package.json ./package.json

# 在 standalone 输出目录中安装 better-sqlite3（在运行环境重新编译以确保架构匹配）
# 注意：COPY --from=builder /app/.next/standalone ./ 会把 standalone 的内容复制到 /app/
# 所以 node_modules 应该在 /app/node_modules，而不是 /app/.next/standalone/node_modules
# 注意：需要在切换用户之前执行，因为需要 root 权限安装依赖
RUN echo "=== Checking standalone output structure ===" && \
    ls -la . | head -15 && \
    (test -d "node_modules" && echo "✓ node_modules exists" || echo "✗ node_modules NOT found") && \
    (test -f "server.js" && echo "✓ server.js exists" || echo "✗ server.js NOT found") && \
    (test -d "app" && echo "✓ app directory exists" || echo "✗ app directory NOT found")

# 如果已存在 better-sqlite3，先删除（可能是错误架构的版本）
RUN rm -rf node_modules/better-sqlite3 2>/dev/null || true

# 安装 better-sqlite3（在当前架构上重新编译）
RUN npm install better-sqlite3 --no-save --production && \
    npm cache clean --force && \
    echo "✓ better-sqlite3 installed successfully"

# 清理构建工具（减小镜像大小，但保留以便运行时可能需要）
# 注意：如果运行时还需要编译其他原生模块，不要删除这些工具
# RUN apk del python3 make g++

# 确保 standalone 模式包含 app 目录（API 路由需要）
# Next.js standalone 模式会自动复制 app 目录，但为了确保，我们显式检查
RUN echo "=== Checking standalone output structure ===" && \
    ls -la . | head -20 && \
    (test -d ./app && echo "✓ app directory found" || echo "✗ app directory NOT found") && \
    (test -d ./app/api && echo "✓ app/api directory found" || echo "✗ app/api directory NOT found") && \
    (test -d ./app/api/analytics && echo "✓ app/api/analytics directory found" || echo "✗ app/api/analytics directory NOT found") && \
    (test -d ./app/api/analytics/duration && echo "✓ app/api/analytics/duration directory found" || echo "✗ app/api/analytics/duration directory NOT found") && \
    (test -f ./app/api/analytics/duration/route.js && echo "✓ duration route.js found" || (echo "✗ duration route.js NOT found" && find ./app -name "route.js" 2>/dev/null | head -10))

# 创建 content 目录
RUN mkdir -p /app/content/posts && chown -R nextjs:nodejs /app/content

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

