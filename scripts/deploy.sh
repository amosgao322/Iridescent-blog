#!/bin/bash
# 一键部署脚本
# 使用方法: bash scripts/deploy.sh [镜像文件路径]
# 默认镜像路径: /tmp/iridescent-blog.tar

set -e  # 遇到错误立即退出

# 配置变量（可根据实际情况修改）
IMAGE_FILE="${1:-/tmp/iridescent-blog.tar}"
CONTAINER_NAME="iridescent-blog"
IMAGE_NAME="iridescent-blog:latest"

# 重要：使用绝对路径，确保 volume 挂载正确
PROJECT_DIR="${PROJECT_DIR:-/opt/iridescent-blog}"
# 确保 PROJECT_DIR 是绝对路径
if [[ ! "$PROJECT_DIR" = /* ]]; then
    echo "错误: PROJECT_DIR 必须是绝对路径，当前值: $PROJECT_DIR"
    exit 1
fi

# 重要：使用 3001 端口，避免与 nginx 的 80 端口冲突
# 如果环境变量 PORT_MAPPING 设置为 80:3000，这里会强制使用 3001:3000
PORT_MAPPING="3001:3000"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查镜像文件是否存在
if [ ! -f "$IMAGE_FILE" ]; then
    print_error "镜像文件不存在: $IMAGE_FILE"
    exit 1
fi

print_info "开始部署流程..."
print_info "镜像文件: $IMAGE_FILE"
print_info "容器名称: $CONTAINER_NAME"
print_info "项目目录: $PROJECT_DIR"

# 第一步：停止并删除当前容器
print_info "第一步：停止并删除当前容器"
if docker ps -a | grep -q "$CONTAINER_NAME"; then
    print_info "停止容器: $CONTAINER_NAME"
    docker stop "$CONTAINER_NAME" || print_warn "容器可能已经停止"
    
    print_info "删除容器: $CONTAINER_NAME"
    docker rm "$CONTAINER_NAME" || print_warn "容器可能已经删除"
else
    print_warn "容器 $CONTAINER_NAME 不存在，跳过停止和删除步骤"
fi

# 第二步：加载镜像
print_info "第二步：加载镜像"
print_info "正在从 $IMAGE_FILE 加载镜像，这可能需要几分钟..."
if docker load -i "$IMAGE_FILE"; then
    print_info "镜像加载成功"
else
    print_error "镜像加载失败"
    exit 1
fi


# 第三步：重新启动容器
print_info "第三步：重新启动容器"

# 检查 .env 文件是否存在
ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    print_warn ".env 文件不存在: $ENV_FILE"
    print_warn "将不使用 --env-file 参数启动容器"
    ENV_FILE_FLAG=""
else
    ENV_FILE_FLAG="--env-file $ENV_FILE"
    print_info "使用环境变量文件: $ENV_FILE"
fi

# 检查 content 目录是否存在（使用绝对路径）
CONTENT_DIR="$PROJECT_DIR/content"

# 确保使用绝对路径
if [[ ! "$CONTENT_DIR" = /* ]]; then
    print_error "CONTENT_DIR 必须是绝对路径: $CONTENT_DIR"
    print_error "请设置 PROJECT_DIR 为绝对路径，例如: export PROJECT_DIR=/opt/iridescent-blog"
    exit 1
fi

if [ ! -d "$CONTENT_DIR" ]; then
    print_warn "content 目录不存在: $CONTENT_DIR"
    print_warn "将创建该目录"
    mkdir -p "$CONTENT_DIR/posts"
    mkdir -p "$CONTENT_DIR/notes"
    mkdir -p "$CONTENT_DIR/private-posts"
    print_info "已创建 content 目录结构: $CONTENT_DIR"
else
    print_info "content 目录已存在: $CONTENT_DIR"
    # 显示目录内容统计
    POST_COUNT=$(ls -1 "$CONTENT_DIR/posts" 2>/dev/null | wc -l)
    NOTE_COUNT=$(ls -1 "$CONTENT_DIR/notes" 2>/dev/null | wc -l)
    print_info "  - 文章数量: $POST_COUNT"
    print_info "  - 随记数量: $NOTE_COUNT"
fi

# 启动容器
print_info "启动容器..."
print_info "端口映射: $PORT_MAPPING"
print_info "Content 目录挂载: $CONTENT_DIR -> /app/content"

# 检查端口是否被占用
HOST_PORT=$(echo "$PORT_MAPPING" | cut -d: -f1)
if netstat -tuln 2>/dev/null | grep -q ":$HOST_PORT " || ss -tuln 2>/dev/null | grep -q ":$HOST_PORT "; then
    print_warn "端口 $HOST_PORT 已被占用，可能会启动失败"
    print_warn "如果启动失败，请检查端口占用情况: sudo netstat -tulpn | grep :$HOST_PORT"
    print_warn "或者使用其他端口，例如: export PORT_MAPPING=3002:3000"
fi

# 重要提示：确保端口映射正确
if [ "$HOST_PORT" = "80" ]; then
    print_error "错误: 不能使用 80 端口，因为 nginx 正在使用该端口"
    print_error "请使用其他端口，例如 3001:3000"
    exit 1
fi

# 启动容器（使用绝对路径确保 volume 挂载正确）
print_info "执行启动命令..."
print_info "  - 容器名: $CONTAINER_NAME"
print_info "  - 端口映射: $PORT_MAPPING"
print_info "  - Volume 挂载: $CONTENT_DIR -> /app/content"
print_info "  - 环境变量文件: ${ENV_FILE:-未使用}"

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "$PORT_MAPPING" \
  $ENV_FILE_FLAG \
  --dns 8.8.8.8 \
  --dns 114.114.114.114 \
  -v "$CONTENT_DIR:/app/content" \
  "$IMAGE_NAME"

if [ $? -ne 0 ]; then
    print_error "容器启动失败！"
    print_error "请检查："
    print_error "  1. 端口 $HOST_PORT 是否被占用"
    print_error "  2. content 目录路径是否正确: $CONTENT_DIR"
    print_error "  3. 镜像是否存在: $IMAGE_NAME"
    exit 1
fi

# 等待容器启动
sleep 2

# 验证容器是否运行
if docker ps | grep -q "$CONTAINER_NAME"; then
    print_info "容器启动成功！"
    print_info "容器状态:"
    docker ps | grep "$CONTAINER_NAME"
    print_info ""
    
    # 验证 volume 挂载
    print_info "验证 volume 挂载..."
    MOUNTS=$(docker inspect "$CONTAINER_NAME" --format='{{json .Mounts}}' 2>/dev/null)
    if [ -z "$MOUNTS" ] || [ "$MOUNTS" = "[]" ]; then
        print_error "✗ Volume 挂载失败！挂载信息为空"
        print_error "请检查启动命令中的 -v 参数"
        exit 1
    elif echo "$MOUNTS" | grep -q "$CONTENT_DIR"; then
        print_info "✓ Volume 挂载成功: $CONTENT_DIR -> /app/content"
    else
        print_warn "⚠ Volume 挂载验证失败，请检查挂载配置"
        print_warn "期望的挂载路径: $CONTENT_DIR"
        print_warn "实际挂载信息: $MOUNTS"
    fi
    
    # 验证 content 目录内容
    print_info "验证 content 目录内容..."
    if docker exec "$CONTAINER_NAME" test -d /app/content 2>/dev/null; then
        CONTAINER_POST_COUNT=$(docker exec "$CONTAINER_NAME" ls -1 /app/content/posts/ 2>/dev/null | wc -l)
        HOST_POST_COUNT=$(ls -1 "$CONTENT_DIR/posts" 2>/dev/null | wc -l)
        print_info "✓ Content 目录存在"
        print_info "  - 容器内文章数量: $CONTAINER_POST_COUNT"
        print_info "  - 宿主机文章数量: $HOST_POST_COUNT"
        
        if [ "$CONTAINER_POST_COUNT" -ne "$HOST_POST_COUNT" ]; then
            print_warn "⚠ 警告: 容器内和宿主机的文件数量不一致！"
            print_warn "  这可能表示 volume 挂载有问题"
        fi
    else
        print_warn "⚠ Content 目录不存在或无法访问"
    fi
    
    print_info ""
    print_info "部署完成！"
    print_info "访问地址: http://localhost:$(echo $PORT_MAPPING | cut -d: -f1)"
    print_info "注意: 如果使用 nginx 反向代理，请确保 nginx 配置指向端口 $(echo $PORT_MAPPING | cut -d: -f1)"
else
    print_error "容器启动失败，请检查日志:"
    docker logs "$CONTAINER_NAME" 2>&1 | tail -30
    exit 1
fi

