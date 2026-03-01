$logFile = ".cursor\debug.log"
$endpoint = "http://127.0.0.1:7243/ingest/c13bc734-5cbc-4b67-9752-d2caac9061e3"

$currentDir = Get-Location
$pkgExists = Test-Path "package.json"
$dockerfileExists = Test-Path "docker\Dockerfile"

$logData = @{
    sessionId = "debug-session"
    runId = "diagnose-1"
    hypothesisId = "A"
    location = "diagnose-docker.ps1:10"
    message = "构建上下文诊断"
    data = @{
        currentDir = $currentDir.Path
        packageJsonExists = $pkgExists
        dockerfileExists = $dockerfileExists
        isRootDir = $pkgExists -and $dockerfileExists
    }
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
} | ConvertTo-Json -Compress

try {
    Invoke-RestMethod -Uri $endpoint -Method Post -Body $logData -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
} catch {
    Add-Content -Path $logFile -Value $logData -ErrorAction SilentlyContinue
}

Write-Host "当前目录: $($currentDir.Path)"
Write-Host "package.json: $(if ($pkgExists) { '存在' } else { '不存在' })"
Write-Host "docker/Dockerfile: $(if ($dockerfileExists) { '存在' } else { '不存在' })"

if (-not $pkgExists) {
    Write-Host "`n错误: 请在项目根目录执行构建命令！" -ForegroundColor Red
    Write-Host "正确命令: docker build -f docker/Dockerfile -t procurement-manager:latest ." -ForegroundColor Green
}

