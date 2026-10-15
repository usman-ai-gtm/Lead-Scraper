$installer = "C:\Users\admin\AppData\Local\Temp\WinGet\Python.Python.3.11.3.11.9\python-3.11.9-amd64.exe"
$targetDir = "C:\Users\admin\AppData\Local\Programs\Python\Python311"
$logFile = "C:\Users\admin\AppData\Local\Temp\py_install.log"

Write-Host "Running Python installer silently with InstallLauncherAllUsers=0 Include_launcher=0 AssociateFiles=0..."
$argList = "/quiet InstallAllUsers=0 InstallLauncherAllUsers=0 Include_launcher=0 AssociateFiles=0 Shortcuts=0 PrependPath=1 Include_pip=1 TargetDir=`"$targetDir`" /log `"$logFile`""

$proc = Start-Process -FilePath $installer -ArgumentList $argList -Wait -PassThru
Write-Host "Exit Code: $($proc.ExitCode)"

if (Test-Path "$targetDir\python.exe") {
    Write-Host "SUCCESS: python.exe installed!"
    & "$targetDir\python.exe" --version
    & "$targetDir\python.exe" -m pip --version
} else {
    Write-Host "python.exe not found in $targetDir"
    if (Test-Path $logFile) {
        Write-Host "Last 20 lines of log:"
        Get-Content $logFile -Tail 20
    }
}
