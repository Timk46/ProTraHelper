# HEFL Development Workflow Startup Script
# Automatically starts all required development tools
# Usage: Right-click -> "Run with PowerShell" or execute in terminal

Write-Host "=== HEFL Development Workflow Startup ===" -ForegroundColor Cyan
Write-Host ""

# Project root directory (fallback)
$projectRoot = "C:\dev\a\hefl"

# Helper function to find executable path
function Find-ExecutablePath {
    param(
        [string]$programName,
        [string[]]$possiblePaths,
        [string]$fallbackCommand
    )

    # Try to find via where.exe (PATH search)
    try {
        $pathResult = Get-Command $fallbackCommand -ErrorAction SilentlyContinue
        if ($pathResult) {
            return $pathResult.Source
        }
    }
    catch {
        # Ignore and try other methods
    }

    # Try possible installation paths
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            return $path
        }
    }

    return $null
}

# Helper function to start a program
function Start-Program {
    param(
        [string]$name,
        [string]$path,
        [string]$arguments = "",
        [string]$workingDirectory = ""
    )

    if (-not $path) {
        Write-Host "  [WARNUNG] $name nicht gefunden - ueberspringe" -ForegroundColor Yellow
        return $false
    }

    try {
        $params = @{
            FilePath = $path
        }

        if ($arguments) {
            $params.ArgumentList = $arguments
        }

        if ($workingDirectory -and (Test-Path $workingDirectory)) {
            $params.WorkingDirectory = $workingDirectory
        }

        Start-Process @params
        Write-Host "  [OK] $name gestartet" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "  [FEHLER] Fehler beim Starten von ${name}: $_" -ForegroundColor Red
        return $false
    }
}

# =============================================================================
# PROGRAM DEFINITIONS
# =============================================================================

Write-Host "[1/6] Suche Cursor IDE..." -ForegroundColor Cyan
$cursorPaths = @(
    "$env:LOCALAPPDATA\Programs\cursor\Cursor.exe",
    "$env:ProgramFiles\Cursor\Cursor.exe",
    "$env:APPDATA\Local\Programs\cursor\Cursor.exe"
)
$cursorPath = Find-ExecutablePath -programName "Cursor IDE" -possiblePaths $cursorPaths -fallbackCommand "cursor"

Write-Host "[2/5] Suche DBeaver..." -ForegroundColor Cyan
$dbeaverPaths = @(
    "$env:ProgramFiles\DBeaver\dbeaver.exe",
    "$env:ProgramFiles (x86)\DBeaver\dbeaver.exe",
    "$env:LOCALAPPDATA\DBeaver\dbeaver.exe"
)
$dbeaverPath = Find-ExecutablePath -programName "DBeaver" -possiblePaths $dbeaverPaths -fallbackCommand "dbeaver"

Write-Host "[3/5] Suche GitHub Desktop..." -ForegroundColor Cyan
$githubPaths = @(
    "$env:LOCALAPPDATA\GitHubDesktop\GitHubDesktop.exe",
    "$env:ProgramFiles\GitHub Desktop\GitHubDesktop.exe"
)
$githubPath = Find-ExecutablePath -programName "GitHub Desktop" -possiblePaths $githubPaths -fallbackCommand "github"

Write-Host "[4/5] Suche OpenVPN Connect..." -ForegroundColor Cyan
$openvpnPaths = @(
    "$env:ProgramFiles\OpenVPN Connect\OpenVPNConnect.exe",
    "$env:ProgramFiles (x86)\OpenVPN Connect\OpenVPNConnect.exe",
    "$env:LOCALAPPDATA\OpenVPN Connect\OpenVPNConnect.exe"
)
$openvpnPath = Find-ExecutablePath -programName "OpenVPN Connect" -possiblePaths $openvpnPaths -fallbackCommand "openvpn-connect"

Write-Host "[5/5] Suche Firefox..." -ForegroundColor Cyan
$firefoxPaths = @(
    "$env:ProgramFiles\Mozilla Firefox\firefox.exe",
    "$env:ProgramFiles (x86)\Mozilla Firefox\firefox.exe",
    "$env:LOCALAPPDATA\Mozilla Firefox\firefox.exe"
)
$firefoxPath = Find-ExecutablePath -programName "Firefox" -possiblePaths $firefoxPaths -fallbackCommand "firefox"

Write-Host ""
Write-Host "=== Starte Programme ===" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# START PROGRAMS
# =============================================================================

# 1. DBeaver
Write-Host "Starte DBeaver..." -ForegroundColor White
Start-Program -name "DBeaver" -path $dbeaverPath
Start-Sleep -Milliseconds 500

# 2. GitHub Desktop (with HEFL repository)

Write-Host "Starte GitHub Desktop mit HEFL-Repository..." -ForegroundColor White
if ($githubPath) {
    Start-Process $githubPath -ArgumentList "`"$projectRoot`"" -WindowStyle Hidden
    Write-Host "  [OK] GitHub Desktop gestartet" -ForegroundColor Green
    Start-Sleep -Milliseconds 500
}
else {
    Write-Host "  [WARNUNG] GitHub Desktop nicht gefunden - ueberspringe" -ForegroundColor Yellow
}

# 3. OpenVPN Connect
Write-Host "Starte OpenVPN Connect..." -ForegroundColor White
Start-Program -name "OpenVPN Connect" -path $openvpnPath
Start-Sleep -Milliseconds 500

# 4. Firefox
Write-Host "Starte Firefox..." -ForegroundColor White
Start-Program -name "Firefox" -path $firefoxPath
Start-Sleep -Milliseconds 500

# 5. Cursor IDE (opens HEFL workspace with auto-starting terminals)
Write-Host "Starte Cursor IDE mit HEFL-Workspace..." -ForegroundColor White
if ($cursorPath) {
    Start-Process $cursorPath -ArgumentList "`"$projectRoot`"" -WindowStyle Hidden
    Write-Host "  [OK] Cursor IDE gestartet" -ForegroundColor Green
    Write-Host "  [INFO] 5 Terminals starten automatisch in 2-3 Sekunden..." -ForegroundColor Cyan
}
else {
    Write-Host "  [WARNUNG] Cursor IDE nicht gefunden" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Workflow-Start abgeschlossen ===" -ForegroundColor Green
Write-Host ""
Write-Host "Hinweise:" -ForegroundColor Yellow
Write-Host "  - 5 Terminals oeffnen sich automatisch in Cursor:"
Write-Host "    * Terminal 1: client_angular/ (prompt-bereit)"
Write-Host "    * Terminal 2: server_nestjs/ (prompt-bereit)"
Write-Host "    * Terminal 3-5: hefl/ (bereit fuer Claude Code)"
Write-Host "  - OpenVPN: VPN-Verbindung manuell herstellen"
Write-Host "  - HINWEIS: Terminals starten bei jedem Cursor-Oeffnen (tasks.json)"
Write-Host ""
