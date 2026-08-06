param(
  [Parameter(Mandatory=$true)][string]$BackupFile,
  [string]$DatabaseName = $env:DB_NAME,
  [string]$DatabaseHost = $env:DB_HOST,
  [string]$DatabaseUser = $env:DB_USER,
  [string]$DatabasePassword = $env:DB_PASSWORD,
  [switch]$ConfirmRestore
)

if (-not $ConfirmRestore) { throw 'Restore is destructive. Re-run with -ConfirmRestore.' }
if (-not (Test-Path -LiteralPath $BackupFile)) { throw "Backup file not found: $BackupFile" }
Get-Content -LiteralPath $BackupFile -Raw | mysql --host=$DatabaseHost --user=$DatabaseUser --password=$DatabasePassword $DatabaseName
Write-Output "Restore completed from $BackupFile"
