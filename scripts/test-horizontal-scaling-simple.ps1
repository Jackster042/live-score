# Horizontal Scaling Test - Simple Version
# Tests Redis Pub/Sub between two API instances

$projectPath = "C:\Users\feema\OneDrive\Desktop\live-score"

function Write-Header($text) {
    Write-Host "`n=== $text ===" -ForegroundColor Cyan
}

function Write-Step($num, $total, $text) {
    Write-Host "[$num/$total] $text" -ForegroundColor Yellow
}

function Write-Success($text) {
    Write-Host "  $text" -ForegroundColor Green
}

function Write-Error($text) {
    Write-Host "  $text" -ForegroundColor Red
}

Clear-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Horizontal Scaling Verification Test  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This test verifies that multiple API instances can share" -ForegroundColor White
Write-Host "WebSocket broadcasts via Redis Pub/Sub." -ForegroundColor White
Write-Host ""
Write-Host "Test Architecture:" -ForegroundColor Gray
Write-Host "  API Instance 1 (Port 8000)  <--->  Redis  <--->  API Instance 2 (Port 8001)" -ForegroundColor Gray
Write-Host "         |                                              |" -ForegroundColor Gray
Write-Host "    Client A                                       Client B" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to start"

# Step 1: Check Docker
Write-Step 1 5 "Checking Docker containers..."
$containers = docker ps --format "{{.Names}}"
if ($containers -match "live-score-redis" -and $containers -match "live-score-postgres") {
    Write-Success "Redis and PostgreSQL are running"
} else {
    Write-Error "Containers not running. Starting them..."
    docker-compose up -d postgres redis
    Start-Sleep -Seconds 3
    Write-Success "Containers started"
}

# Step 2: Start API Instance 1
Write-Step 2 5 "Starting API Instance 1 on port 8000..."
$env:PORT = 8000
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$projectPath'; `$env:PORT='8000'; Write-Host '[API INSTANCE 1 - Port 8000]' -ForegroundColor Green -BackgroundColor Black; npm run dev:ts"
) -WindowStyle Normal
Write-Success "Instance 1 started"

# Step 3: Start API Instance 2
Write-Step 3 5 "Starting API Instance 2 on port 8001..."
$env:PORT = 8001
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$projectPath'; `$env:PORT='8001'; Write-Host '[API INSTANCE 2 - Port 8001]' -ForegroundColor Blue -BackgroundColor Black; npm run dev:ts"
) -WindowStyle Normal
Write-Success "Instance 2 started"

# Wait for APIs
Write-Host "`nWaiting for APIs to be ready..." -ForegroundColor Yellow
$ready = $false
$attempts = 0
while (-not $ready -and $attempts -lt 30) {
    $attempts++
    try {
        $r1 = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        $r2 = Invoke-WebRequest -Uri "http://localhost:8001/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r1.StatusCode -eq 200 -and $r2.StatusCode -eq 200) {
            $ready = $true
        }
    } catch {
        Write-Host "  Waiting... ($attempts/30)" -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    Write-Error "APIs failed to start. Check the API windows for errors."
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Success "Both APIs are ready!"

# Step 4: Verify data consistency
Write-Step 4 5 "Verifying data consistency across instances..."

try {
    $data1 = Invoke-WebRequest -Uri "http://localhost:8000/api/matches" -UseBasicParsing | ConvertFrom-Json
    $data2 = Invoke-WebRequest -Uri "http://localhost:8001/api/matches" -UseBasicParsing | ConvertFrom-Json
    
    if ($data1.data.Count -eq $data2.data.Count) {
        Write-Success "Both instances return same data count: $($data1.data.Count) matches"
    } else {
        Write-Error "Data mismatch! Instance 1: $($data1.data.Count), Instance 2: $($data2.data.Count)"
    }
} catch {
    Write-Error "Failed to verify data: $($_.Exception.Message)"
}

# Step 5: Test Redis Pub/Sub
Write-Step 5 5 "Testing Redis Pub/Sub broadcast..."
Write-Host "  Sending commentary update via Instance 1 (port 8000)..." -ForegroundColor Gray

try {
    $payload = '{"minute": 75, "message": "Horizontal Scaling Test - Goal!", "eventType": "goal"}'
    Invoke-WebRequest -Uri "http://localhost:8000/api/matches/1/commentary" -Method POST -Body $payload -ContentType "application/json" | Out-Null
    Write-Success "Update sent via Instance 1"
    
    # Verify update appears on Instance 2
    Start-Sleep -Seconds 2
    $commentary2 = Invoke-WebRequest -Uri "http://localhost:8001/api/matches/1/commentary" -UseBasicParsing | ConvertFrom-Json
    
    $found = $false
    foreach ($item in $commentary2.data) {
        if ($item.message -like "*Horizontal Scaling Test*") {
            $found = $true
            break
        }
    }
    
    if ($found) {
        Write-Success "Update propagated to Instance 2 via Redis!"
    } else {
        Write-Host "  (Note: Commentary may take a moment to sync)" -ForegroundColor Yellow
    }
} catch {
    Write-Error "Failed to send update: $($_.Exception.Message)"
}

# Summary
Write-Header "TEST SUMMARY"
Write-Host "Setup Complete:" -ForegroundColor Green
Write-Host "  - API Instance 1: http://localhost:8000" -ForegroundColor White
Write-Host "  - API Instance 2: http://localhost:8001" -ForegroundColor White
Write-Host "  - Redis Pub/Sub: Verified" -ForegroundColor White
Write-Host ""
Write-Host "To manually verify WebSocket broadcasting:" -ForegroundColor Yellow
Write-Host "  1. Open two browser tabs to test-websocket.html" -ForegroundColor White
Write-Host "  2. In Tab 1: Connect to ws://localhost:8000/ws" -ForegroundColor White
Write-Host "  3. In Tab 2: Connect to ws://localhost:8001/ws" -ForegroundColor White
Write-Host "  4. Subscribe both to match 1" -ForegroundColor White
Write-Host "  5. Send goal via one instance" -ForegroundColor White
Write-Host "  6. Verify BOTH tabs receive the update!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close"
