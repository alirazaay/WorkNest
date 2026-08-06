param([string]$BaseUrl = 'http://localhost:5000')

$live = Invoke-RestMethod "$BaseUrl/api/v1/health/live"
if ($live.data.status -ne 'ok') { throw 'Liveness check failed' }
$ready = Invoke-RestMethod "$BaseUrl/api/v1/health/ready"
if ($ready.data.database -ne 'connected') { throw 'Readiness database check failed' }
$docs = Invoke-RestMethod "$BaseUrl/api/v1/docs/openapi.json"
if ($docs.openapi -ne '3.0.3') { throw 'OpenAPI document check failed' }
Write-Output 'WorkNest API smoke checks passed.'
