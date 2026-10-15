# Update User Environment PATH persistently and verify all tools
$nodeDir = "C:\Users\admin\AppData\Local\Programs\nodejs"
$pythonDir = "C:\Users\admin\AppData\Local\Programs\Python\Python311"
$pyScripts = Join-Path $pythonDir "Scripts"
$gitDir = "C:\Program Files\Git\cmd"

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$currentPaths = $userPath -split ';' | Where-Object { $_ -ne "" }

foreach ($p in @($nodeDir, $pythonDir, $pyScripts, $gitDir)) {
    if ($currentPaths -notcontains $p) {
        $currentPaths += $p
        Write-Host "Added $p to User PATH"
    }
}

$newPath = ($currentPaths -join ';')
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
$env:Path = "$newPath;$env:Path"

Write-Host "`n=== TOOL VERIFICATION SUMMARY ==="
try {
    $gitVer = & git --version
    Write-Host "GIT: $gitVer"
} catch {
    Write-Host "GIT: Failed"
}

try {
    $nodeVer = & node --version
    Write-Host "NODE: $nodeVer"
} catch {
    Write-Host "NODE: Failed"
}

try {
    $npmVer = & npm --version
    Write-Host "NPM: $npmVer"
} catch {
    Write-Host "NPM: Failed"
}

try {
    $pyVer = & python --version
    Write-Host "PYTHON: $pyVer"
} catch {
    Write-Host "PYTHON: Failed"
}

try {
    $pipVer = & pip --version
    Write-Host "PIP: $pipVer"
} catch {
    Write-Host "PIP: Failed"
}
