# Docker 构建脚本 - 使用镜像源构建（通过 BASE_IMAGE 走国内镜像，避免 Docker Hub 元数据拉取失败）
param(
    [string]$ImageTag = "iridescent-blog:latest"
)

Write-Host "Docker Build with Mirror Support" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

$baseImage = "node:20-alpine"
$mirrors = @(
    "docker.mirrors.ustc.edu.cn",
    "hub-mirror.c.163.com",
    "mirror.baidubce.com"
)

$buildSuccess = $false

# 仓库根目录（脚本在 scripts/ 下）
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$originalDir = Get-Location

# 先尝试使用默认镜像直接构建（适用于已配置 registry-mirrors 或网络可达 Docker Hub）
Write-Host "Trying default build (node:20-alpine)..." -ForegroundColor Yellow
try {
    Set-Location $repoRoot
    $out = docker build -f docker/Dockerfile -t $ImageTag . 2>&1
    if ($LASTEXITCODE -eq 0) {
        $buildSuccess = $true
        Write-Host "Build completed successfully with default image." -ForegroundColor Green
    }
} finally {
    Set-Location $originalDir
}

if ($buildSuccess) {
    Write-Host "Image: $ImageTag" -ForegroundColor Cyan
    exit 0
}

# 默认构建失败（多为 load metadata 失败），改用国内镜像源通过 BUILD ARG 构建
Write-Host ""
Write-Host "Default build failed. Trying builds with mirror as BASE_IMAGE..." -ForegroundColor Yellow
foreach ($mirror in $mirrors) {
    $mirrorImage = "$mirror/library/node:20-alpine"
    Write-Host "  Building with: $mirrorImage" -ForegroundColor Cyan
    try {
        Set-Location $repoRoot
        docker build -f docker/Dockerfile --build-arg BASE_IMAGE=$mirrorImage -t $ImageTag . 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $buildSuccess = $true
            Write-Host "  Success!" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "  Failed: $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        Set-Location $originalDir
    }
}

if (-not $buildSuccess) {
    Write-Host ""
    Write-Host "ERROR: Build failed with all sources." -ForegroundColor Red
    Write-Host ""
    Write-Host "If you see 'load metadata for docker.io/library/node:20-alpine', Docker cannot reach Docker Hub." -ForegroundColor Yellow
    Write-Host "Try:" -ForegroundColor Cyan
    Write-Host "  1. Run this script from repo root: .\scripts\docker-build-with-mirror.ps1" -ForegroundColor White
    Write-Host "  2. Or build with a mirror manually:" -ForegroundColor White
    Write-Host "     docker build -f docker/Dockerfile --build-arg BASE_IMAGE=docker.mirrors.ustc.edu.cn/library/node:20-alpine -t iridescent-blog:latest ." -ForegroundColor White
    Write-Host "  3. Or configure Docker Desktop: Settings > Docker Engine > registry-mirrors, then Apply & Restart" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Build completed successfully! Image: $ImageTag" -ForegroundColor Green


















