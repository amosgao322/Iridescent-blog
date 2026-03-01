# 配置 Docker Desktop 镜像源的详细指南脚本
Write-Host "Docker Desktop Configuration Guide" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

Write-Host "Since daemon.json configuration may not work on Windows Docker Desktop," -ForegroundColor Yellow
Write-Host "please configure through Docker Desktop GUI:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Open Docker Desktop" -ForegroundColor Cyan
Write-Host "  - Right-click Docker Desktop icon in system tray" -ForegroundColor White
Write-Host "  - Click 'Settings' or click the gear icon" -ForegroundColor White
Write-Host ""

Write-Host "Step 2: Navigate to Docker Engine" -ForegroundColor Cyan
Write-Host "  - Click 'Docker Engine' in the left sidebar" -ForegroundColor White
Write-Host ""

Write-Host "Step 3: Add registry-mirrors configuration" -ForegroundColor Cyan
Write-Host "  - Find the JSON configuration editor" -ForegroundColor White
Write-Host "  - Add or update the 'registry-mirrors' section:" -ForegroundColor White
Write-Host ""

$configExample = @"
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
"@

Write-Host $configExample -ForegroundColor Gray
Write-Host ""

Write-Host "Step 4: Apply and Restart" -ForegroundColor Cyan
Write-Host "  - Click 'Apply & Restart' button" -ForegroundColor White
Write-Host "  - Wait for Docker Desktop to restart" -ForegroundColor White
Write-Host ""

Write-Host "Step 5: Verify configuration" -ForegroundColor Cyan
Write-Host "  - Run: docker info | findstr /i 'registry mirror'" -ForegroundColor White
Write-Host "  - You should see the mirror URLs listed" -ForegroundColor White
Write-Host ""

Write-Host "Alternative: If GUI configuration doesn't work," -ForegroundColor Yellow
Write-Host "use the build script with manual mirror pull:" -ForegroundColor Yellow
Write-Host "  .\scripts\docker-build-with-mirror.ps1" -ForegroundColor Cyan
Write-Host ""


















