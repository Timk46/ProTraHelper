# DirectGHLoader Installationsskript (OPTIMIERT FÜR RHINO 8)
# Dieses PowerShell-Skript erstellt Registry-Einträge für das rhinogh:// URI-Schema
# mit direktem Grasshopper-Befehl ohne Python-Skript-Abhängigkeit

# ACHTUNG: Dieses Skript muss als Administrator ausgeführt werden!
# Rechtsklick -> Als Administrator ausführen

# ------------------------------------------------------------------------------------------
# KONFIGURATION - BITTE ANPASSEN, WENN RHINO AN EINEM ANDEREN ORT INSTALLIERT IST
# ------------------------------------------------------------------------------------------

# Rhino 8 wird verwendet
$rhinoVersion = "8.0"

# Pfade - werden automatisch angepasst basierend auf der Rhino-Version
$rhinoProgramPath = "C:\Program Files\Rhino $rhinoVersion\System\Rhino.exe"

# ------------------------------------------------------------------------------------------
# ADMINISTRATORRECHTE PRÜFEN
# ------------------------------------------------------------------------------------------

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Dieses Skript muss als Administrator ausgeführt werden." -ForegroundColor Red
    Write-Host "Bitte schließen Sie dieses Fenster und führen Sie das Skript mit Rechtsklick -> 'Als Administrator ausführen' aus." -ForegroundColor Red
    Start-Sleep -Seconds 5
    exit
}

# ------------------------------------------------------------------------------------------
# PFADPRÜFUNG
# ------------------------------------------------------------------------------------------

Write-Host "Rhino Grasshopper - Direkt-Starter Installer" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Rhino Version: $rhinoVersion" -ForegroundColor Cyan
Write-Host "Rhino Programm-Pfad: $rhinoProgramPath" -ForegroundColor Cyan
Write-Host ""

# Pfade überprüfen
if (-not (Test-Path $rhinoProgramPath)) {
    Write-Host "WARNUNG: Rhino.exe wurde nicht gefunden unter: $rhinoProgramPath" -ForegroundColor Yellow
    Write-Host "Bitte manuell den Pfad zu Rhino angeben:" -ForegroundColor Yellow
    $userRhinoPath = Read-Host "Pfad zu Rhino.exe (z.B. C:\Program Files\Rhino 8\System\Rhino.exe)"
    if (-not [string]::IsNullOrEmpty($userRhinoPath) -and (Test-Path $userRhinoPath)) {
        $rhinoProgramPath = $userRhinoPath
        Write-Host "Neuer Pfad akzeptiert: $rhinoProgramPath" -ForegroundColor Green
    } else {
        Write-Host "Ungültiger Pfad oder keine Eingabe. Installation wird fortgesetzt, könnte aber fehlschlagen." -ForegroundColor Red
    }
}

# ------------------------------------------------------------------------------------------
# REGISTRY-EINTRÄGE ERSTELLEN
# ------------------------------------------------------------------------------------------

Write-Host "Erstelle Registry-Einträge für das rhinogh:// URI-Schema..." -ForegroundColor Yellow
Write-Host ""

# Erstelle den Haupt-Registry-Schlüssel mit vollständigem Pfad
$regKeyBase = "HKEY_CLASSES_ROOT"
$protocolName = "rhinogh"
$mainRegPath = "Registry::${regKeyBase}\${protocolName}"

try {
    # Hauptschlüssel erstellen
    if (-not (Test-Path $mainRegPath)) {
        New-Item -Path $mainRegPath -Force -ErrorAction Stop | Out-Null
        Write-Host "Registry-Schlüssel '${regKeyBase}\${protocolName}' erfolgreich erstellt." -ForegroundColor Green
    } else {
        Write-Host "Registry-Schlüssel '${regKeyBase}\${protocolName}' existiert bereits." -ForegroundColor Yellow
    }
    
    # Eigenschaften für den Hauptschlüssel setzen
    Set-ItemProperty -Path $mainRegPath -Name "(Default)" -Value "URL:Rhino GH Direct Loader Protocol" -ErrorAction Stop | Out-Null
    New-ItemProperty -Path $mainRegPath -Name "URL Protocol" -Value "" -PropertyType String -Force -ErrorAction Stop | Out-Null
    Get-ItemProperty -Path $mainRegPath -Name "URL Protocol"
    Write-Host "Eigenschaften für '${regKeyBase}\${protocolName}' erfolgreich gesetzt." -ForegroundColor Green
    
    # Shell und Open Unterordner erstellen
    $shellPath = "Registry::${regKeyBase}\${protocolName}\shell"
    if (-not (Test-Path $shellPath)) {
        New-Item -Path $shellPath -Force -ErrorAction Stop | Out-Null
    }
    
    $openPath = "Registry::${regKeyBase}\${protocolName}\shell\open"
    if (-not (Test-Path $openPath)) {
        New-Item -Path $openPath -Force -ErrorAction Stop | Out-Null
    }
    
    # Command Schlüssel erstellen
    $commandPath = "Registry::${regKeyBase}\${protocolName}\shell\open\command"
    if (-not (Test-Path $commandPath)) {
        New-Item -Path $commandPath -Force -ErrorAction Stop | Out-Null
        Write-Host "Registry-Schlüssel '${regKeyBase}\${protocolName}\shell\open\command' erfolgreich erstellt." -ForegroundColor Green
    } else {
        Write-Host "Registry-Schlüssel '${regKeyBase}\${protocolName}\shell\open\command' existiert bereits." -ForegroundColor Yellow
    }
    
    # ------------------------------------------------------------------------------------------
    # DIREKTER GRASSHOPPER-BEFEHL FÜR RHINO 8
    # ------------------------------------------------------------------------------------------
    
    # Der optimierte Befehl nutzt GrasshopperPlayer zum automatischen Laden
    # _-GrasshopperPlayer = Startet den GrasshopperPlayer ohne Benutzerinteraktion
    # _-MaxViewport = Maximiert das Rhino-Viewport
    # _-WindowHide = Versteckt das Grasshopper-Fenster
    
    # Direkter Befehl für optimale Anzeige
    $directGrasshopperCommand = "`"$rhinoProgramPath`" /nosplash /runscript=`"_-GrasshopperPlayer \`"%1\`" _Enter _-MaxViewport _-WindowHide _Enter`""
    Write-Host "Befehl für Registry-Eintrag: $directGrasshopperCommand" -ForegroundColor Cyan
    
    # Befehl in Registry setzen
    Set-ItemProperty -Path $commandPath -Name "(Default)" -Value $directGrasshopperCommand -ErrorAction Stop | Out-Null
    Write-Host "Registry-Eintrag für Befehl erfolgreich erstellt!" -ForegroundColor Green
    
    Write-Host "Alle Registry-Einträge wurden erfolgreich erstellt." -ForegroundColor Green
} 
catch {
    Write-Host "FEHLER bei der Registry-Erstellung: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Mögliche Ursachen:" -ForegroundColor Yellow
    Write-Host " - Keine ausreichenden Administratorrechte" -ForegroundColor Yellow
    Write-Host " - PowerShell-Einschränkungen für Registry-Zugriff" -ForegroundColor Yellow
    Write-Host " - Der Registry-Pfad war ungültig" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative Installationsmethode:" -ForegroundColor Cyan
    Write-Host "Sie können folgende Informationen in die Windows Registry Editor (regedit.exe) kopieren:" -ForegroundColor Cyan
    Write-Host "--------------------------------------------------" -ForegroundColor White
    Write-Host "Windows Registry Editor Version 5.00" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "[HKEY_CLASSES_ROOT\rhinogh]" -ForegroundColor White
    Write-Host "@=\"URL:Rhino GH Direct Loader Protocol\"" -ForegroundColor White
    Write-Host "\"URL Protocol\"=\"\"" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "[HKEY_CLASSES_ROOT\rhinogh\shell]" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "[HKEY_CLASSES_ROOT\rhinogh\shell\open]" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "[HKEY_CLASSES_ROOT\rhinogh\shell\open\command]" -ForegroundColor White
    Write-Host "@=\"\\\"$($rhinoProgramPath.Replace('\', '\\'))\\\" /nosplash /runscript=\\\"_-Grasshopper B D W L W H D O \\\\\\\"%1\\\\\\\" W H -MaxViewport _Enter\\\"\"" -ForegroundColor White
    Write-Host "--------------------------------------------------" -ForegroundColor White
    Write-Host "Speichern Sie diesen Text in einer Datei mit der Endung .reg und führen Sie sie mit Doppelklick aus." -ForegroundColor Cyan
}

# ------------------------------------------------------------------------------------------
# ERSTELLEN DER .REG-DATEI ALS ALTERNATIVE
# ------------------------------------------------------------------------------------------

# Erstelle .reg-Datei als Fallback-Option
$outputDirectory = Split-Path -Parent $PSCommandPath
$regFilePath = Join-Path -Path $outputDirectory -ChildPath "rhinogh_uri_handler.reg"
try {
    $regFileContent = @"
Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\rhinogh]
@="URL:Rhino GH Direct Loader Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\rhinogh\shell]

[HKEY_CLASSES_ROOT\rhinogh\shell\open]

[HKEY_CLASSES_ROOT\rhinogh\shell\open\command]
@="\"$($rhinoProgramPath.Replace('\', '\\'))\" /nosplash /runscript=\"_-GrasshopperPlayer \\\"%1\\\" _Enter _-MaxViewport _-WindowHide _Enter\""
"@

    $regFileContent | Out-File -FilePath $regFilePath -Encoding unicode
    Write-Host "Registry-Datei erstellt: $regFilePath" -ForegroundColor Green
    Write-Host "Diese Datei kann als Alternative verwendet werden, falls die automatische Installation fehlschlägt." -ForegroundColor Yellow
}
catch {
    Write-Host "FEHLER: Konnte .reg-Datei nicht erstellen: $($_.Exception.Message)" -ForegroundColor Red
}

# ------------------------------------------------------------------------------------------
# ABSCHLUSS UND ANWEISUNGEN
# ------------------------------------------------------------------------------------------

Write-Host ""
Write-Host "Installation der Registry-Einträge abgeschlossen!" -ForegroundColor Green
Write-Host ""
Write-Host "TESTEN:" -ForegroundColor Green
Write-Host "1. Starten Sie Rhino neu (wichtig!)" -ForegroundColor Yellow
Write-Host "2. Öffnen Sie einen Browser und geben Sie ein:" -ForegroundColor Yellow
Write-Host "   rhinogh://C:\\Dev\\hefl\\files\\Grasshopper\\example.gh" -ForegroundColor White
Write-Host "   (oder einen anderen Pfad zu einer .gh-Datei)" -ForegroundColor White
Write-Host ""
Write-Host "ODER" -ForegroundColor Green
Write-Host "1. Starten Sie Ihre Angular-Anwendung" -ForegroundColor Yellow
Write-Host "2. Wählen Sie eine .gh-Datei aus und klicken Sie auf 'In Rhino öffnen'" -ForegroundColor Yellow
Write-Host ""
Write-Host "HINWEIS:" -ForegroundColor Green
Write-Host "Mit diesem neuen Befehl wird:" -ForegroundColor Yellow
Write-Host "- Rhino gestartet" -ForegroundColor White
Write-Host "- Grasshopper geladen" -ForegroundColor White
Write-Host "- Die ausgewählte .gh-Datei geöffnet" -ForegroundColor White
Write-Host "- Das Grasshopper-Fenster minimiert" -ForegroundColor White
Write-Host "- Die Rhino-Ansicht maximiert" -ForegroundColor White
Write-Host ""

Write-Host "Drücken Sie eine beliebige Taste, um das Fenster zu schließen..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
