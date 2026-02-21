# Live Score - Development Environment Menu
# Choose your preferred setup

$projectPath = "C:\Users\feema\OneDrive\Desktop\live-score"

function Show-Menu {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "    Live Score - Dev Environment Menu   " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  [1] BASIC Setup (5 windows)           " -ForegroundColor Green
    Write-Host "      API + Worker + Redis + Postgres + Test" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [2] FULL Setup (7 windows) *          " -ForegroundColor Yellow
    Write-Host "      Basic + Docker Stats + Load Test Ready" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [3] Windows Terminal Tabs             " -ForegroundColor Magenta
    Write-Host "      All services in one window (tabs)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [4] Just Docker Stats                 " -ForegroundColor Cyan
    Write-Host "      Monitor container resources" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [5] Run Load Test                     " -ForegroundColor Red
    Write-Host "      Artillery load testing" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [6] Test Horizontal Scaling           " -ForegroundColor Magenta
    Write-Host "      Verify Redis Pub/Sub between instances" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [Q] Quit                              " -ForegroundColor White
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
}

function Start-BasicSetup {
    Write-Host "Starting BASIC setup..." -ForegroundColor Green
    & "$PSScriptRoot\start-dev-env.ps1"
}

function Start-FullSetup {
    Write-Host "Starting FULL setup..." -ForegroundColor Yellow
    & "$PSScriptRoot\start-dev-env-full.ps1"
}

function Start-WTSetup {
    Write-Host "Starting Windows Terminal setup..." -ForegroundColor Magenta
    & "$PSScriptRoot\start-with-wt.ps1"
}

function Start-DockerStats {
    Write-Host "Starting Docker Stats..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Write-Host '[DOCKER STATS]' -ForegroundColor Cyan; docker stats --format 'table {{.Name}}	{{.CPUPerc}}	{{.MemUsage}}	{{.NetIO}}' live-score-postgres live-score-redis"
    )
}

function Start-LoadTest {
    Write-Host "Starting Load Test..." -ForegroundColor Red
    & "$PSScriptRoot\run-load-test.ps1"
}

# Main loop
do {
    Show-Menu
    $selection = Read-Host "Enter your choice"
    
    switch ($selection) {
        '1' { Start-BasicSetup; exit }
        '2' { Start-FullSetup; exit }
        '3' { Start-WTSetup; exit }
        '4' { Start-DockerStats; exit }
        '5' { Start-LoadTest; exit }
        '6' { 
            Write-Host "Starting Horizontal Scaling Test..." -ForegroundColor Magenta
            & "$PSScriptRoot\test-horizontal-scaling-simple.ps1"
            exit 
        }
        'q' { exit }
        'Q' { exit }
        default { 
            Write-Host "Invalid choice! Press Enter to continue..." -ForegroundColor Red
            Read-Host
        }
    }
} while ($true)
