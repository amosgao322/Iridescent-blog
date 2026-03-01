# Docker 构建脚本 - 确保在正确的目录执行
$ErrorActionPreference = "Stop"

# 获取脚本所在目录的父目录（项目根目录）
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# 切换到项目根目录
Set-Location $projectRoot

Write-Host "=== Docker 镜像构建 ===" -ForegroundColor Cyan
Write-Host "项目根目录: $projectRoot" -ForegroundColor Yellow

# 验证必要文件存在
if (-not (Test-Path "package.json")) {
    Write-Host "错误: package.json 不存在！" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "docker\Dockerfile")) {
    Write-Host "错误: docker\Dockerfile 不存在！" -ForegroundColor Red
    exit 1
}

Write-Host "开始构建 Docker 镜像..." -ForegroundColor Green
Write-Host "命令: docker build -f docker/Dockerfile -t procurement-manager:latest ." -ForegroundColor Cyan
Write-Host ""

# 执行构建
docker build -f docker/Dockerfile -t procurement-manager:latest .

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n构建成功！" -ForegroundColor Green
} else {
    Write-Host "`n构建失败！" -ForegroundColor Red
    exit 1
}

