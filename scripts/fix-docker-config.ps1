# 修复 Docker 镜像源配置
$configPath = "$env:USERPROFILE\.docker\daemon.json"

# 读取现有配置
$config = @{}
if (Test-Path $configPath) {
    $content = Get-Content $configPath -Raw -Encoding UTF8
    $config = $content | ConvertFrom-Json
} else {
    $config = @{} | ConvertTo-Json | ConvertFrom-Json
}

# 添加镜像源
$mirrors = @(
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
)

if (-not $config.PSObject.Properties['registry-mirrors']) {
    $config | Add-Member -MemberType NoteProperty -Name "registry-mirrors" -Value $mirrors
} else {
    $config.'registry-mirrors' = $mirrors
}

# 保存配置
$json = $config | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($configPath, $json, [System.Text.Encoding]::UTF8)

Write-Host "Config updated: $configPath" -ForegroundColor Green
Write-Host "Registry mirrors:" -ForegroundColor Yellow
foreach ($mirror in $mirrors) {
    Write-Host "  - $mirror" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Please restart Docker Desktop for the configuration to take effect!" -ForegroundColor Yellow

