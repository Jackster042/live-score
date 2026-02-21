# Live Score Development Environment Launcher
# Opens multiple terminal windows for all services

$projectPath = "C:\Users\feema\OneDrive\Desktop\live-score"

Write-Host "Starting Live Score Development Environment..." -ForegroundColor Green
Write-Host ""

# Function to start a new PowerShell window
function Start-TerminalWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$Color = "White"
    )
    
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Write-Host '[$Title]' -ForegroundColor $Color; cd '$projectPath'; $Command"
    )
    
    Write-Host "Started: $Title" -ForegroundColor $Color
}

# 1. Start Docker (if not running)
Write-Host "Checking Docker containers..." -ForegroundColor Cyan
$containers = docker ps --format "{{.Names}}"

if ($containers -notmatch "live-score-postgres") {
    Write-Host "   Starting PostgreSQL..." -ForegroundColor Yellow
    docker-compose up -d postgres
}

if ($containers -notmatch "live-score-redis") {
    Write-Host "   Starting Redis..." -ForegroundColor Yellow
    docker-compose up -d redis
}

Write-Host "   Docker containers are running!" -ForegroundColor Green
Write-Host ""

# 2. Start Redis Monitor
Start-TerminalWindow -Title "REDIS MONITOR" -Command "docker exec -it live-score-redis redis-cli monitor" -Color "Red"
Start-Sleep -Seconds 1

# 3. Start PostgreSQL Monitor
Start-TerminalWindow -Title "POSTGRES LOGS" -Command "docker logs -f live-score-postgres" -Color "Blue"
Start-Sleep -Seconds 1

# 4. Start API Server
Start-TerminalWindow -Title "API SERVER" -Command "npm run dev:ts" -Color "Green"
Start-Sleep -Seconds 1

# 5. Start Worker
Start-TerminalWindow -Title "WORKER" -Command "npm run worker" -Color "Magenta"
Start-Sleep -Seconds 1

# 6. Test Terminal
Start-TerminalWindow -Title "TEST COMMANDS" -Command "Write-Host 'Ready for testing!' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Try these commands:' -ForegroundColor Yellow; Write-Host '  curl http://localhost:8000/api/matches' -ForegroundColor White; Write-Host '  curl http://localhost:8000/api/matches/1/commentary' -ForegroundColor White; Write-Host ''" -Color "Yellow"

Write-Host ""
Write-Host "All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "Windows opened:"
Write-Host "  REDIS MONITOR - Shows all Redis commands in real-time"
Write-Host "  POSTGRES LOGS - Database query logs"
Write-Host "  API SERVER - Express API on port 8000"
Write-Host "  WORKER - BullMQ job processor"
Write-Host "  TEST COMMANDS - Ready for curl commands"
Write-Host ""

Read-Host "Press Enter to close this window"
