# Live Score - Windows Terminal Split Pane Launcher
# Note: Windows Terminal command-line arguments can be tricky from PowerShell
# This script falls back to multi-window mode for reliability

$projectPath = "C:\Users\feema\OneDrive\Desktop\live-score"
$wtPath = "C:\Users\feema\AppData\Local\Microsoft\WindowsApps\wt.exe"

Write-Host "Starting Live Score Development Environment..." -ForegroundColor Green
Write-Host ""

# Start Docker containers first
Write-Host "Starting Docker containers..." -ForegroundColor Cyan
docker-compose up -d postgres redis

# Check if Windows Terminal is installed and usable
if (Test-Path $wtPath) {
    Write-Host "Windows Terminal found!" -ForegroundColor Green
    Write-Host "Note: Due to PowerShell parsing limitations, using multi-window mode instead of split panes." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Windows Terminal not found. Using standard PowerShell windows." -ForegroundColor Yellow
    Write-Host ""
}

# Function to start a new terminal window
function Start-TerminalWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$Color = "White"
    )
    
    # Try Windows Terminal first, fall back to PowerShell
    if (Test-Path $wtPath) {
        Start-Process $wtPath -ArgumentList @(
            "new-tab", "-p", "PowerShell", "-d", $projectPath, 
            "--title", $Title, 
            "PowerShell", "-NoExit", "-Command", 
            "Write-Host '[$Title]' -ForegroundColor $Color; $Command"
        )
    } else {
        Start-Process powershell -ArgumentList @(
            "-NoExit",
            "-Command",
            "Write-Host '[$Title]' -ForegroundColor $Color; cd '$projectPath'; $Command"
        )
    }
    
    Write-Host "Started: $Title" -ForegroundColor $Color
    Start-Sleep -Milliseconds 500
}

# Start all services
Start-TerminalWindow -Title "API SERVER" -Command "npm run dev:ts" -Color "Green"
Start-TerminalWindow -Title "WORKER" -Command "npm run worker" -Color "Magenta"
Start-TerminalWindow -Title "REDIS MONITOR" -Command "docker exec -it live-score-redis redis-cli monitor" -Color "Red"
Start-TerminalWindow -Title "POSTGRES LOGS" -Command "docker logs -f live-score-postgres" -Color "Blue"
Start-TerminalWindow -Title "TEST COMMANDS" -Command "Write-Host 'Ready for testing!' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Quick commands:' -ForegroundColor Yellow; Write-Host '  curl http://localhost:8000/api/matches' -ForegroundColor White; Write-Host '  curl http://localhost:8000/api/matches/1/commentary' -ForegroundColor White" -Color "White"

Write-Host ""
Write-Host "All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "Windows opened:"
Write-Host "  API SERVER     - Express API on port 8000"
Write-Host "  WORKER         - BullMQ job processor"
Write-Host "  REDIS MONITOR  - Redis commands in real-time"
Write-Host "  POSTGRES LOGS  - Database query logs"
Write-Host "  TEST COMMANDS  - Ready for curl commands"
Write-Host ""
Write-Host "Note: If using Windows Terminal, tabs are in the same window." -ForegroundColor Cyan
Write-Host "      If using PowerShell, separate windows are opened." -ForegroundColor Cyan
