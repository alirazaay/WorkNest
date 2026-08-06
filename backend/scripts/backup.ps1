param(
  [string]$OutputDirectory = "./backups",
  [string]$DatabaseName = $env:DB_NAME,
  [string]$DatabaseHost = $env:DB_HOST,
  [string]$DatabaseUser = $env:DB_USER
)

if ([string]::IsNullOrWhiteSpace($DatabaseName)) { throw 'DB_NAME is required' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $OutputDirectory "worknest-$timestamp.sql"
mysqldump --single-transaction --routines --triggers --host=$DatabaseHost --user=$DatabaseUser --databases $DatabaseName | Out-File -FilePath $target -Encoding utf8
Write-Output "Backup written to $target"
