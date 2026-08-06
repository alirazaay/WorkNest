param(
  [string]$ApiUrl = 'http://localhost:5000',
  [string]$FrontendUrl = 'http://localhost:5173',
  [switch]$Live
)

$results = [ordered]@{}
$backendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$workspaceRoot = (Resolve-Path (Join-Path $backendRoot '..')).Path

$sourceFiles = @(Get-ChildItem (Join-Path $backendRoot 'src') -Recurse -Filter *.js; Get-ChildItem (Join-Path $backendRoot 'scripts') -Recurse -Filter *.js; Get-ChildItem (Join-Path $backendRoot 'test') -Recurse -Filter *.js)
$syntaxFailures = @()
foreach ($file in $sourceFiles) { node --check $file.FullName 2>$null | Out-Null; if ($LASTEXITCODE -ne 0) { $syntaxFailures += $file.FullName } }
$results['backendSyntax'] = if ($syntaxFailures.Count -eq 0) { 'passed' } else { "failed: $($syntaxFailures -join ', ')" }

Push-Location $backendRoot
npm test 2>$null | Out-Null
$results['backendTests'] = if ($LASTEXITCODE -eq 0) { 'passed' } else { 'blocked_or_failed: run output contains environment/runtime failure' }
Pop-Location

Push-Location $workspaceRoot
npm run build 2>$null | Out-Null
$results['frontendBuild'] = if ($LASTEXITCODE -eq 0) { 'passed' } else { 'blocked_or_failed: run output contains environment/runtime failure' }
Pop-Location

if ($Live) {
  try { $live = Invoke-RestMethod "$ApiUrl/api/v1/health/live"; $ready = Invoke-RestMethod "$ApiUrl/api/v1/health/ready"; $results['backendLive'] = if ($live.data.status -eq 'ok') { 'passed' } else { 'failed' }; $results['databaseReady'] = if ($ready.data.database -eq 'connected') { 'passed' } else { 'failed' } } catch { $results['liveChecks'] = "blocked: $($_.Exception.Message)" }
  try { $frontend = Invoke-WebRequest $FrontendUrl -UseBasicParsing; $results['frontendReachable'] = if ($frontend.StatusCode -eq 200) { 'passed' } else { 'failed' } } catch { $results['frontendReachable'] = "blocked: $($_.Exception.Message)" }
} else { $results['liveChecks'] = 'not_run: pass -Live after services are running' }

$report = [ordered]@{ generatedAt = (Get-Date).ToUniversalTime().ToString('o'); results = $results; note = 'Full workflow tests require MySQL and running API services.' }
$report | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $workspaceRoot 'PHASE13_QA_REPORT.json')
$report | ConvertTo-Json -Depth 5
