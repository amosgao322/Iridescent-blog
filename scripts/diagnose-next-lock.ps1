# Next.js 锁文件诊断脚本
$logFile = ".cursor\debug.log"
$lockPath = ".next\dev\lock"
$nextDir = ".next"

# #region agent log
$logEntry = @{
    timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    location = "diagnose-next-lock.ps1:8"
    message = "Diagnosis script started"
    data = @{
        lockPath = $lockPath
        nextDir = $nextDir
        pwd = (Get-Location).Path
    }
    sessionId = "debug-session"
    runId = "diagnosis"
    hypothesisId = "ALL"
} | ConvertTo-Json -Compress
Add-Content -Path $logFile -Value $logEntry
# #endregion

# 假设 A: 检查是否有其他 Next.js 进程在运行
# #region agent log
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node.exe*" }
$logEntry = @{
    timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    location = "diagnose-next-lock.ps1:22"
    message = "Checking for running Node processes"
    data = @{
        processCount = $nodeProcesses.Count
        processes = $nodeProcesses | ForEach-Object { @{ pid = $_.Id; path = $_.Path; startTime = $_.StartTime.ToString() } }
    }
    sessionId = "debug-session"
    runId = "diagnosis"
    hypothesisId = "A"
} | ConvertTo-Json -Compress
Add-Content -Path $logFile -Value $logEntry
# #endregion

# 假设 B: 检查锁文件是否存在
# #region agent log
$lockExists = Test-Path $lockPath
$lockInfo = $null
if ($lockExists) {
    $lockFile = Get-Item $lockPath -ErrorAction SilentlyContinue
    if ($lockFile) {
        $lockInfo = @{
            exists = $true
            lastWriteTime = $lockFile.LastWriteTime.ToString()
            length = $lockFile.Length
            attributes = $lockFile.Attributes.ToString()
        }
    }
} else {
    $lockInfo = @{ exists = $false }
}
$logEntry = @{
    timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    location = "diagnose-next-lock.ps1:45"
    message = "Checking lock file existence"
    data = $lockInfo
    sessionId = "debug-session"
    runId = "diagnosis"
    hypothesisId = "B"
} | ConvertTo-Json -Compress
Add-Content -Path $logFile -Value $logEntry
# #endregion

# 假设 C: 检查文件权限
# #region agent log
$canDelete = $false
$permissionError = $null
if ($lockExists) {
    try {
        $acl = Get-Acl $lockPath -ErrorAction Stop
        $canDelete = $true
        $permissionInfo = @{
            owner = $acl.Owner
            accessRules = $acl.Access | ForEach-Object { @{ identity = $_.IdentityReference; rights = $_.FileSystemRights.ToString() } }
        }
    } catch {
        $permissionError = $_.Exception.Message
        $permissionInfo = @{ error = $permissionError }
    }
} else {
    $permissionInfo = @{ message = "Lock file does not exist" }
}
$logEntry = @{
    timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    location = "diagnose-next-lock.ps1:66"
    message = "Checking file permissions"
    data = $permissionInfo
    sessionId = "debug-session"
    runId = "diagnosis"
    hypothesisId = "C"
} | ConvertTo-Json -Compress
Add-Content -Path $logFile -Value $logEntry
# #endregion

# 假设 D: 检查 .next 目录状态
# #region agent log
$nextDirExists = Test-Path $nextDir
$nextDirInfo = $null
if ($nextDirExists) {
    $dir = Get-Item $nextDir -ErrorAction SilentlyContinue
    if ($dir) {
        $subDirs = Get-ChildItem $nextDir -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name
        $nextDirInfo = @{
            exists = $true
            lastWriteTime = $dir.LastWriteTime.ToString()
            subdirectories = $subDirs
        }
    }
} else {
    $nextDirInfo = @{ exists = $false }
}
$logEntry = @{
    timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    location = "diagnose-next-lock.ps1:88"
    message = "Checking .next directory state"
    data = $nextDirInfo
    sessionId = "debug-session"
    runId = "diagnosis"
    hypothesisId = "D"
} | ConvertTo-Json -Compress
Add-Content -Path $logFile -Value $logEntry
# #endregion

# 检查端口占用情况
# #region agent log
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$portInfo = @{
    port3000 = if ($port3000) { @{ occupied = $true; owningProcess = $port3000.OwningProcess } } else { @{ occupied = $false } }
    port3001 = if ($port3001) { @{ occupied = $true; owningProcess = $port3001.OwningProcess } } else { @{ occupied = $false } }
}
$logEntry = @{
    timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    location = "diagnose-next-lock.ps1:100"
    message = "Checking port usage"
    data = $portInfo
    sessionId = "debug-session"
    runId = "diagnosis"
    hypothesisId = "A"
} | ConvertTo-Json -Compress
Add-Content -Path $logFile -Value $logEntry
# #endregion

Write-Host "诊断完成，日志已保存到 $logFile"
Write-Host "发现的 Node 进程数量: $($nodeProcesses.Count)"
Write-Host "锁文件存在: $lockExists"
Write-Host ".next 目录存在: $nextDirExists"











