# Live Score Development Environment Launcher (FULL MODE)
# Opens all terminals: Services + Monitoring + Load Testing

$projectPath = "C:\Users\feema\OneDrive\Desktop\live-score"

Write-Host "Starting Live Score FULL Development Environment..." -ForegroundColor Green
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

# 2. Core Services
Start-TerminalWindow -Title "API SERVER" -Command "npm run dev:ts" -Color "Green"
Start-Sleep -Seconds 1

Start-TerminalWindow -Title "WORKER" -Command "npm run worker" -Color "Magenta"
Start-Sleep -Seconds 1

# 3. Database Monitoring
Start-TerminalWindow -Title "REDIS MONITOR" -Command "docker exec -it live-score-redis redis-cli monitor" -Color "Red"
Start-Sleep -Seconds 1

Start-TerminalWindow -Title "POSTGRES LOGS" -Command "docker logs -f live-score-postgres" -Color "Blue"
Start-Sleep -Seconds 1

# 4. Docker Stats (Resource monitoring)
Start-TerminalWindow -Title "DOCKER STATS" -Command "docker stats --format 'table {{.Name}}	{{.CPUPerc}}	{{.MemUsage}}	{{.NetIO}}' live-score-postgres live-score-redis" -Color "Cyan"
Start-Sleep -Seconds 1

# 5. Load Test (Ready to run)
Start-TerminalWindow -Title "LOAD TEST" -Command "Write-Host 'Load Test Ready!' -ForegroundColor Green; Write-Host ''; Write-Host 'Run: artillery run scripts/load-test.yml' -ForegroundColor Yellow; Write-Host 'Or: npm run test:load' -ForegroundColor Yellow; Write-Host ''; Write-Host 'Prerequisites:' -ForegroundColor Cyan; Write-Host '  npm install -g artillery' -ForegroundColor White; Write-Host ''; Write-Host 'Config:' -ForegroundColor Cyan; Write-Host '  scripts/load-test.yml' -ForegroundColor White" -Color "Yellow"

# 6. Test Commands
Start-TerminalWindow -Title "TEST COMMANDS" -Command "Write-Host 'Ready for testing!' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Quick test commands:' -ForegroundColor Yellow; Write-Host '  curl http://localhost:8000/health' -ForegroundColor White; Write-Host '  curl http://localhost:8000/api/matches' -ForegroundColor White; Write-Host '  curl http://localhost:8000/api/matches/1/commentary' -ForegroundColor White; Write-Host ''; Write-Host 'WebSocket test:' -ForegroundColor Yellow; Write-Host '  Open: scripts/test-websocket.html' -ForegroundColor White" -Color "White"

Write-Host ""
Write-Host "All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "Windows opened:"
Write-Host "  API SERVER     - Express API on port 8000"
Write-Host "  WORKER         - BullMQ job processor"
Write-Host "  REDIS MONITOR  - Redis commands in real-time"
Write-Host "  POSTGRES LOGS  - Database query logs"
Write-Host "  DOCKER STATS   - Container CPU/Memory/Network"
Write-Host "  LOAD TEST      - Artillery load testing (ready)"
Write-Host "  TEST COMMANDS  - API testing terminal"
Write-Host ""

Read-Host "Press Enter to close this launcher"
