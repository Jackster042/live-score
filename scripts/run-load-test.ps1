# Load Test Runner for Live Score API
# Uses Artillery.io for load testing

$projectPath = "C:\Users\feema\OneDrive\Desktop\live-score"

Write-Host "=== Live Score Load Test ===" -ForegroundColor Green
Write-Host ""

# Check if Artillery is installed
$artilleryInstalled = Get-Command artillery -ErrorAction SilentlyContinue

if (-not $artilleryInstalled) {
    Write-Host "Artillery not found. Installing globally..." -ForegroundColor Yellow
    npm install -g artillery
    Write-Host "Artillery installed!" -ForegroundColor Green
    Write-Host ""
}

# Check if API is running
Write-Host "Checking if API is running..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "API is running on port 8000" -ForegroundColor Green
    }
} catch {
    Write-Host "API is not running on port 8000!" -ForegroundColor Red
    Write-Host "Please start the API first:" -ForegroundColor Yellow
    Write-Host "  npm run dev:ts" -ForegroundColor White
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting load test..." -ForegroundColor Cyan
Write-Host "  Config: scripts/load-test.yml" -ForegroundColor Gray
Write-Host "  Duration: ~5 minutes" -ForegroundColor Gray
Write-Host "  Phases: Warm up -> Normal -> Peak -> Cool down" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop early" -ForegroundColor Red
Write-Host ""

# Run the load test
cd $projectPath
artillery run scripts/load-test.yml

Write-Host ""
Write-Host "Load test complete!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close"
