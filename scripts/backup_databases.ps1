# Safe backup of databases and configuration
$backupDir = "d:\DATA D\LUXURY DASHBOARD\backups\pre_recovery"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$dbFiles = @(
    "d:\DATA D\LUXURY DASHBOARD\usman_data_analytics.db",
    "d:\DATA D\LUXURY DASHBOARD\usman_luxury_engine.db",
    "d:\DATA D\LUXURY DASHBOARD\ultra_outreach_401_500.db"
)

foreach ($db in $dbFiles) {
    if (Test-Path $db) {
        $dest = Join-Path $backupDir (Split-Path $db -Leaf)
        Copy-Item -Path $db -Destination $dest -Force
        Write-Host "Backed up: $db -> $dest ($((Get-Item $dest).Length) bytes)"
    } else {
        Write-Host "Database not found: $db"
    }
}
Write-Host "Backup complete."
