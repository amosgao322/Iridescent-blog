# Docker 构建上下文验证脚本
$logPath = ".cursor\debug.log"
$serverEndpoint = "http://127.0.0.1:7243/ingest/c13bc734-5cbc-4b67-9752-d2caac9061e3"

function Log-Debug {
    param($location, $message, $data, $hypothesisId)
    $logEntry = @{
        sessionId = "debug-session"
        runId = "verify-build-context"
        hypothesisId = $hypothesisId
        location = $location
        message = $message
        data = $data
        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    } | ConvertTo-Json -Compress
    try {
        Invoke-RestMethod -Uri $serverEndpoint -Method Post -Body $logEntry -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
    } catch {
        Add-Content -Path $logPath -Value $logEntry -ErrorAction SilentlyContinue
    }
}

Write-Host "=== Docker 构建上下文验证 ===" -ForegroundColor Cyan

$currentDir = Get-Location
Log-Debug -location "verify-docker-build.ps1:20" -message "当前工作目录" -data @{directory = $currentDir.Path} -hypothesisId "A"

$packageJsonExists = Test-Path "package.json"
Log-Debug -location "verify-docker-build.ps1:23" -message "package.json存在性检查" -data @{exists = $packageJsonExists; path = (Join-Path $currentDir.Path "package.json")} -hypothesisId "B"

$dockerfileExists = Test-Path "docker\Dockerfile"
Log-Debug -location "verify-docker-build.ps1:26" -message "Dockerfile存在性检查" -data @{exists = $dockerfileExists; path = (Join-Path $currentDir.Path "docker\Dockerfile")} -hypothesisId "C"

if ($dockerfileExists) {
    $dockerfileContent = Get-Content "docker\Dockerfile" -Raw
    $hasCopyPackageJson = $dockerfileContent -match "COPY.*package\.json"
    Log-Debug -location "verify-docker-build.ps1:30" -message "Dockerfile包含COPY package.json" -data @{hasCopy = $hasCopyPackageJson} -hypothesisId "D"
}

$buildCommand = "docker build -f docker/Dockerfile -t procurement-manager:latest ."
Log-Debug -location "verify-docker-build.ps1:33" -message "建议的构建命令" -data @{command = $buildCommand; currentDir = $currentDir.Path} -hypothesisId "E"

Write-Host "当前目录: $($currentDir.Path)" -ForegroundColor Yellow
Write-Host "package.json 存在: $packageJsonExists" -ForegroundColor $(if ($packageJsonExists) { "Green" } else { "Red" })
Write-Host "Dockerfile 存在: $dockerfileExists" -ForegroundColor $(if ($dockerfileExists) { "Green" } else { "Red" })

if (-not $packageJsonExists) {
    Write-Host "`n错误: package.json 不在当前目录！" -ForegroundColor Red
    Write-Host "请切换到项目根目录: D:\dream-start\code\Iridescent-blog" -ForegroundColor Yellow
}

if ($packageJsonExists -and $dockerfileExists) {
    Write-Host "`n建议的构建命令:" -ForegroundColor Cyan
    Write-Host "  docker build -f docker/Dockerfile -t procurement-manager:latest ." -ForegroundColor Green
}
