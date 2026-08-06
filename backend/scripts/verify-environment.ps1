param(
  [string]$ApiUrl = 'http://localhost:5000',
  [string]$FrontendUrl = 'http://localhost:5173'
)

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is not installed or not on PATH.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm is not installed or not on PATH.' }
$live = Invoke-RestMethod "$ApiUrl/api/v1/health/live"
$ready = Invoke-RestMethod "$ApiUrl/api/v1/health/ready"
$frontend = Invoke-WebRequest $FrontendUrl -UseBasicParsing
if ($live.data.status -ne 'ok') { throw 'Backend liveness failed.' }
if ($ready.data.database -ne 'connected') { throw 'Backend database readiness failed.' }
if ($frontend.StatusCode -ne 200) { throw 'Frontend startup check failed.' }
Write-Output 'Environment verification passed: backend, database, and frontend are reachable.'
