# 修复 Docker 镜像源配置脚本
# 添加国内镜像源以解决 Docker Hub 访问问题

$logPath = ".cursor\debug.log"
$sessionId = "debug-session"
$runId = "fix-run-1"

function Write-DebugLog {
    param(
        [string]$hypothesisId,
        [string]$location,
        [string]$message,
        [object]$data
    )
    
    $logEntry = @{
        sessionId = $sessionId
        runId = $runId
        hypothesisId = $hypothesisId
        location = $location
        message = $message
        data = $data
        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    } | ConvertTo-Json -Compress
    
    Add-Content -Path $logPath -Value $logEntry
}

Write-Host "开始修复 Docker 镜像源配置..." -ForegroundColor Green

$dockerConfigPath = "$env:USERPROFILE\.docker\daemon.json"
$backupPath = "$dockerConfigPath.backup"

# 读取现有配置
if (Test-Path $dockerConfigPath) {
    try {
        $configContent = Get-Content $dockerConfigPath -Raw
        $dockerConfig = $configContent | ConvertFrom-Json
        
        Write-DebugLog -hypothesisId "E" -location "fix-docker-registry.ps1:read-config" -message "读取现有配置" -data @{
            hasConfig = $true
            hasMirrors = ($dockerConfig.PSObject.Properties['registry-mirrors'] -ne $null)
        }
        
        # 备份现有配置
        Copy-Item $dockerConfigPath $backupPath -Force
        Write-Host "已备份现有配置到: $backupPath" -ForegroundColor Yellow
        
    } catch {
        Write-DebugLog -hypothesisId "E" -location "fix-docker-registry.ps1:read-config" -message "读取配置失败" -data @{ error = $_.Exception.Message }
        Write-Host "读取配置失败: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    # 创建新配置
    $dockerConfig = @{} | ConvertTo-Json | ConvertFrom-Json
    Write-DebugLog -hypothesisId "E" -location "fix-docker-registry.ps1:create-config" -message "创建新配置" -data @{ hasConfig = $false }
}

# 添加镜像源配置
$mirrors = @(
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
)

# 使用 PowerShell 对象操作
if (-not $dockerConfig.PSObject.Properties['registry-mirrors']) {
    Add-Member -InputObject $dockerConfig -MemberType NoteProperty -Name "registry-mirrors" -Value @($mirrors)
} else {
    $dockerConfig.'registry-mirrors' = $mirrors
}

# 确保目录存在
$dockerDir = Split-Path $dockerConfigPath -Parent
if (-not (Test-Path $dockerDir)) {
    New-Item -ItemType Directory -Path $dockerDir -Force | Out-Null
}

# 保存配置
try {
    $newConfigJson = $dockerConfig | ConvertTo-Json -Depth 10
    Set-Content -Path $dockerConfigPath -Value $newConfigJson -Encoding UTF8
    
    Write-DebugLog -hypothesisId "E" -location "fix-docker-registry.ps1:save-config" -message "保存配置成功" -data @{
        mirrors = $mirrors
        success = $true
    }
    
    Write-Host "已成功配置 Docker 镜像源:" -ForegroundColor Green
    foreach ($mirror in $mirrors) {
        Write-Host "  - $mirror" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "请重启 Docker Desktop 以使配置生效！" -ForegroundColor Yellow
    
} catch {
    Write-DebugLog -hypothesisId "E" -location "fix-docker-registry.ps1:save-config" -message "保存配置失败" -data @{ error = $_.Exception.Message }
    Write-Host "保存配置失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}



















