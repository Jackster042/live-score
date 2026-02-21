# Horizontal Scaling Test for Live Score API
# Verifies two API instances share WebSocket broadcasts via Redis Pub/Sub

$projectPath = "C:\Users\feema\OneDrive\Desktop\live-score"
$testResults = @()

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Horizontal Scaling Verification Test  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This test will:"
Write-Host "  1. Start TWO API instances (ports 8000 and 8001)"
Write-Host "  2. Connect WebSocket clients to BOTH instances"
Write-Host "  3. Send a score update via Instance 1"
Write-Host "  4. Verify BOTH clients receive the update via Redis Pub/Sub"
Write-Host ""
Read-Host "Press Enter to start the test"

# Check if Docker is running
Write-Host "`n[1/6] Checking Docker containers..." -ForegroundColor Yellow
$containers = docker ps --format "{{.Names}}"
if ($containers -notmatch "live-score-postgres") {
    Write-Host "Starting PostgreSQL..." -ForegroundColor Gray
    docker-compose up -d postgres
}
if ($containers -notmatch "live-score-redis") {
    Write-Host "Starting Redis..." -ForegroundColor Gray
    docker-compose up -d redis
}
Write-Host "Docker containers ready!" -ForegroundColor Green

# Function to start API instance
function Start-ApiInstance {
    param([int]$Port)
    
    $env:PORT = $Port
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$projectPath'; `$env:PORT='$Port'; Write-Host '[API INSTANCE - Port $Port]' -ForegroundColor Green; npm run dev:ts"
    ) -WindowStyle Normal
    
    Write-Host "Started API instance on port $Port" -ForegroundColor Gray
}

# Start two API instances
Write-Host "`n[2/6] Starting TWO API instances..." -ForegroundColor Yellow
Start-ApiInstance -Port 8000
Start-Sleep -Seconds 3
Start-ApiInstance -Port 8001
Start-Sleep -Seconds 3
Write-Host "Both API instances started!" -ForegroundColor Green

# Wait for APIs to be ready
Write-Host "`n[3/6] Waiting for APIs to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$bothReady = $false

while (-not $bothReady -and $attempt -lt $maxAttempts) {
    $attempt++
    try {
        $resp1 = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2
        $resp2 = Invoke-WebRequest -Uri "http://localhost:8001/health" -UseBasicParsing -TimeoutSec 2
        if ($resp1.StatusCode -eq 200 -and $resp2.StatusCode -eq 200) {
            $bothReady = $true
        }
    } catch {}
    if (-not $bothReady) {
        Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
}

if (-not $bothReady) {
    Write-Host "APIs failed to start! Check the API windows for errors." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Both APIs are ready!" -ForegroundColor Green

# Create WebSocket test clients
Write-Host "`n[4/6] Starting WebSocket test clients..." -ForegroundColor Yellow

$wsClientScript = @"
param([int]`$Port, [string]`$InstanceName)
`$client = `$null
`$receivedMessages = @()

try {
    `$client = New-Object System.Net.WebSockets.ClientWebSocket
    `$uri = New-Object System.Uri("ws://localhost:`$Port/ws")
    `$connectTask = `$client.ConnectAsync(`$uri, [System.Threading.CancellationToken]::None)
    `$connectTask.Wait()
    
    Write-Host "[`$InstanceName] Connected to port `$Port" -ForegroundColor Green
    
    # Subscribe to match 1
    `$subscribeMsg = '{"action":"subscribe","matchId":1}'
    `$bytes = [System.Text.Encoding]::UTF8.GetBytes(`$subscribeMsg)
    `$segment = New-Object System.ArraySegment[byte] -ArgumentList @(,`$bytes)
    `$sendTask = `$client.SendAsync(`$segment, [System.Net.WebSockets.WebSocketMessageType]::Text, `$true, [System.Threading.CancellationToken]::None)
    `$sendTask.Wait()
    Write-Host "[`$InstanceName] Subscribed to match 1" -ForegroundColor Gray
    
    # Listen for messages
    `$buffer = New-Object byte[] 4096
    `$timeout = [DateTime]::Now.AddSeconds(30)
    
    while (`$client.State -eq [System.Net.WebSockets.WebSocketState]::Open -and [DateTime]::Now -lt `$timeout) {
        `$segment = New-Object System.ArraySegment[byte] -ArgumentList @(,`$buffer)
        `$receiveTask = `$client.ReceiveAsync(`$segment, [System.Threading.CancellationToken]::None)
        
        if (`$receiveTask.Wait(1000)) {
            `$result = `$receiveTask.Result
            if (`$result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Text) {
                `$message = [System.Text.Encoding]::UTF8.GetString(`$buffer, 0, `$result.Count)
                `$receivedMessages += `$message
                Write-Host "[`$InstanceName] RECEIVED: `$message" -ForegroundColor Cyan
            }
        }
    }
    
    # Save received messages to file
    `$receivedMessages | Out-File -FilePath "`$env:TEMP\ws_messages_`$Port.txt" -Encoding UTF8
    
} catch {
    Write-Host "[`$InstanceName] Error: `$(`$_.Exception.Message)" -ForegroundColor Red
} finally {
    if (`$client -ne `$null -and `$client.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        `$client.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Test complete", [System.Threading.CancellationToken]::None).Wait()
    }
    Write-Host "[`$InstanceName] Disconnected" -ForegroundColor Yellow
}
"@

$wsClientScript | Out-File -FilePath "$env:TEMP\ws-client.ps1" -Encoding UTF8

# Start WebSocket clients
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "$env:TEMP\ws-client.ps1 -Port 8000 -InstanceName 'CLIENT-A'") -WindowStyle Normal
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "$$env:TEMP\ws-client.ps1 -Port 8001 -InstanceName 'CLIENT-B'") -WindowStyle Normal

Write-Host "WebSocket clients started!" -ForegroundColor Green
Write-Host "  CLIENT-A connected to port 8000" -ForegroundColor Gray
Write-Host "  CLIENT-B connected to port 8001" -ForegroundColor Gray

# Wait for clients to connect
Write-Host "`n[5/6] Waiting for WebSocket clients to connect..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Send test update via Instance 1
Write-Host "`n[6/6] Sending score update via Instance 1 (port 8000)..." -ForegroundColor Yellow
Write-Host "This should be broadcast to BOTH clients via Redis Pub/Sub!" -ForegroundColor Magenta

$testPayload = @{
    minute = 75
    message = "TEST GOAL - Horizontal Scaling Verification!"
    eventType = "goal"
} | ConvertTo-Json

try {
    Invoke-WebRequest -Uri "http://localhost:8000/api/matches/1/commentary" -Method POST -Body $testPayload -ContentType "application/json" | Out-Null
    Write-Host "Update sent successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to send update: $($_.Exception.Message)" -ForegroundColor Red
}

# Wait for broadcast
Write-Host "`nWaiting 5 seconds for Redis broadcast..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           TEST SUMMARY                 " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check the CLIENT-A and CLIENT-B windows:" -ForegroundColor Yellow
Write-Host "  - Both should have received the 'TEST GOAL' message" -ForegroundColor White
Write-Host "  - This confirms Redis Pub/Sub is working!" -ForegroundColor Green
Write-Host ""
Write-Host "If both clients received the message, horizontal scaling is WORKING!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close this test window"

# Cleanup
Write-Host "`nCleaning up..." -ForegroundColor Gray
Remove-Item "$env:TEMP\ws-client.ps1" -ErrorAction SilentlyContinue
Write-Host "Test complete!" -ForegroundColor Green
