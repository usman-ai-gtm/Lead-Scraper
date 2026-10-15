$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'

$pyUrl = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
$destExe = "C:\Users\admin\AppData\Local\Temp\python-3.11.9-amd64.exe"
$targetDir = "C:\Users\admin\AppData\Local\Programs\Python\Python311"

Write-Host "Downloading Python 3.11.9 installer..."
$client = New-Object System.Net.WebClient
$client.DownloadFile($pyUrl, $destExe)

Write-Host "Downloaded successfully ($((Get-Item $destExe).Length) bytes)."
Write-Host "Running Python installer silently with user-level flags..."

# Switches for user-level non-elevated install
$args = "/passive InstallAllUsers=0 TargetDir=`"$targetDir`" PrependPath=1 Shortcuts=0 Include_doc=0 Include_test=0 Include_pip=1 SimpleInstall=1"
$proc = Start-Process -FilePath $destExe -ArgumentList $args -Wait -PassThru
Write-Host "Installer finished with exit code: $($proc.ExitCode)"

# Add to User PATH persistently
$nodeDir = "C:\Users\admin\AppData\Local\Programs\nodejs"
$pyScripts = Join-Path $targetDir "Scripts"
$gitDir = "C:\Program Files\Git\cmd"

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$currentPaths = $userPath -split ';' | Where-Object { $_ -ne "" }

foreach ($p in @($nodeDir, $targetDir, $pyScripts, $gitDir)) {
    if ($currentPaths -notcontains $p) {
        $currentPaths += $p
        Write-Host "Added $p to User PATH"
    }
}

$newPath = ($currentPaths -join ';')
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
$env:Path = "$newPath;$env:Path"

# Verify
if (Test-Path (Join-Path $targetDir "python.exe")) {
    Write-Host "Python verification:"
    & "$targetDir\python.exe" --version
    & "$targetDir\python.exe" -m pip --version
} else {
    Write-Host "python.exe was not found in $targetDir"
}
