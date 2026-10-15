# Script to install Python 3.11 and Node.js v20.18.0 for current user
$ErrorActionPreference = "Stop"

Write-Host "=========================================="
Write-Host "  RESTORING RUNTIMES: PYTHON & NODE.JS"
Write-Host "=========================================="

# 1. Install Node.js v20.18.0
$nodeTargetBase = "C:\Users\admin\AppData\Local\Programs"
$nodeDir = Join-Path $nodeTargetBase "nodejs"
$nodeZip = Join-Path $env:TEMP "node-v20.18.0-win-x64.zip"
$nodeUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"

if (-not (Test-Path (Join-Path $nodeDir "node.exe"))) {
    Write-Host "`n[1/2] Downloading Node.js 20.18.0 from $nodeUrl ..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing
    
    Write-Host "Extracting Node.js..."
    if (-not (Test-Path $nodeTargetBase)) {
        New-Item -ItemType Directory -Path $nodeTargetBase -Force | Out-Null
    }
    Expand-Archive -Path $nodeZip -DestinationPath $nodeTargetBase -Force
    
    $extractedFolder = Join-Path $nodeTargetBase "node-v20.18.0-win-x64"
    if (Test-Path $nodeDir) {
        Remove-Item -Path $nodeDir -Recurse -Force
    }
    Rename-Item -Path $extractedFolder -NewName "nodejs"
    Remove-Item -Path $nodeZip -Force -ErrorAction SilentlyContinue
    Write-Host "Node.js successfully installed at: $nodeDir"
} else {
    Write-Host "Node.js already present at $nodeDir"
}

# 2. Install Python 3.11
$pythonDir = "C:\Users\admin\AppData\Local\Programs\Python\Python311"
$pyInstaller = Join-Path $env:TEMP "python-3.11.9-amd64.exe"
$pyUrl = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"

if (-not (Test-Path (Join-Path $pythonDir "python.exe"))) {
    Write-Host "`n[2/2] Downloading Python 3.11.9 from $pyUrl ..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $pyUrl -OutFile $pyInstaller -UseBasicParsing
    
    Write-Host "Installing Python 3.11 (User-level, non-elevated)..."
    $installArgs = "/passive InstallAllUsers=0 TargetDir=`"$pythonDir`" PrependPath=1 Shortcuts=0 Include_doc=0 Include_test=0 Include_pip=1 SimpleInstall=1"
    $process = Start-Process -FilePath $pyInstaller -ArgumentList $installArgs -Wait -PassThru
    Write-Host "Python installer exit code: $($process.ExitCode)"
    
    # Check if python.exe exists
    if (-not (Test-Path (Join-Path $pythonDir "python.exe"))) {
        Write-Host "Standard installer exited with code $($process.ExitCode). Checking alternative installation..."
    }
} else {
    Write-Host "Python 3.11 already present at $pythonDir"
}

# 3. Update User PATH persistently
Write-Host "`nUpdating User Environment PATH..."
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$gitPath = "C:\Program Files\Git\cmd"
$scriptsDir = Join-Path $pythonDir "Scripts"

$pathsToAdd = @($nodeDir, $pythonDir, $scriptsDir, $gitPath)
$currentList = $userPath -split ';' | Where-Object { $_ -ne "" }

foreach ($p in $pathsToAdd) {
    if ($currentList -notcontains $p) {
        $currentList += $p
        Write-Host "Adding to PATH: $p"
    }
}

$newUserPath = ($currentList -join ';')
[Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")

# Also update current process PATH
$env:Path = "$newUserPath;$env:Path"

Write-Host "`n=========================================="
Write-Host "VERIFYING TOOLS IN PROCESS:"
Write-Host "=========================================="
try { & "$nodeDir\node.exe" -v } catch { Write-Host "Node check error" }
try { & "$nodeDir\npm.cmd" -v } catch { Write-Host "Npm check error" }
try { & "$pythonDir\python.exe" --version } catch { Write-Host "Python check error" }
try { & "$gitPath\git.exe" --version } catch { Write-Host "Git check error" }
Write-Host "Environment restore script finished."
