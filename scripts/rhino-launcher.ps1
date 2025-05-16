# PowerShell script to launch Rhino, load Grasshopper, and open a specific .gh file.
# Called by the rhino:// protocol handler.

param(
    # The full rhino:// URI passed by the protocol handler (e.g., rhino://open?file=C:%5Cpath%5Cto%5Cfile.gh)
    [string]$Uri
)

# --- Configuration ---
# Adjust this path if your Rhino installation is different
$rhinoExecutablePath = "C:\Program Files\Rhino 8\System\Rhino.exe" 
# --- End Configuration ---

# Function to decode the file path from the URI query parameter
function Get-FilePathFromUri {
    param([string]$Url)
    try {
        $uriObject = [System.Uri]$Url
        $query = $uriObject.Query
        # Simple parsing assuming format is ?file=...
        if ($query -like '?file=*') {
            $encodedPath = $query.Substring(6) # Get everything after "?file="
            # Decode the URL-encoded path
            $decodedPath = [System.Net.WebUtility]::UrlDecode($encodedPath)
            return $decodedPath
        } else {
            Write-Error "URI query format not recognized. Expected '?file=...'"
            return $null
        }
    } catch {
        Write-Error "Error parsing URI '$Url': $_"
        return $null
    }
}

# --- Main Script Logic ---
Write-Host "Received URI: $Uri"
$filePath = Get-FilePathFromUri -Url $Uri

if (-not $filePath) {
    Write-Error "Could not extract file path from URI. Exiting."
    # Optional: Show a message box to the user
    # [System.Windows.Forms.MessageBox]::Show("Could not extract file path from the link.", "Rhino Launcher Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    exit 1
}

Write-Host "Extracted file path: $filePath"

if (-not (Test-Path $rhinoExecutablePath)) {
    Write-Error "Rhino executable not found at '$rhinoExecutablePath'. Please check the path in the script."
    # Optional: Show a message box
    # [System.Windows.Forms.MessageBox]::Show("Rhino installation not found at the specified path: $rhinoExecutablePath", "Rhino Launcher Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    exit 1
}

if (-not (Test-Path $filePath)) {
    Write-Error "The specified Grasshopper file does not exist: '$filePath'."
    # Optional: Show a message box
    # [System.Windows.Forms.MessageBox]::Show("The Grasshopper file could not be found: $filePath", "Rhino Launcher Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    exit 1
}

# --- Vereinfachter direkter Ansatz ohne Batch-Datei ---
# Dieser Ansatz verwendet eine direkte Methode zum Starten von Rhino
# mit dem GrasshopperPlayer-Befehl und minimaler Komplexität.

# Definiere Pfad für die Log-Datei
$tempDir = $env:TEMP
if (-not $tempDir) { $tempDir = "C:\temp" } # Fallback
$logFilePath = Join-Path -Path $tempDir -ChildPath "rhino_launcher_log_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

# Starte das Logging
try {
    $logMessages = @()
    $logMessages += "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Rhino Launcher gestartet"
    $logMessages += "Rhino Executable: $rhinoExecutablePath"
    $logMessages += "Grasshopper Datei: $filePath"
    $logMessages += "Log-Datei: $logFilePath"
    
    # Schreibe die Log-Nachrichten in die Datei
    $logMessages | Out-File -FilePath $logFilePath -Encoding UTF8
    
    Write-Host "Rhino Launcher gestartet. Logdatei: $logFilePath"
    
    # Überprüfe, ob die Dateien existieren
    if (-not (Test-Path $rhinoExecutablePath)) {
        $errorMessage = "FEHLER: Rhino wurde nicht gefunden unter: $rhinoExecutablePath"
        $errorMessage | Out-File -FilePath $logFilePath -Append
        Write-Error $errorMessage
        exit 1
    }
    
    if (-not (Test-Path $filePath)) {
        $errorMessage = "FEHLER: Die Grasshopper-Datei wurde nicht gefunden unter: $filePath"
        $errorMessage | Out-File -FilePath $logFilePath -Append
        Write-Error $errorMessage
        exit 1
    }
    
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Starte Rhino..." | Out-File -FilePath $logFilePath -Append
    Write-Host "Starte Rhino mit der Grasshopper-Datei: $filePath"
    
    # Vorbereiten der Kommandozeilenargumente für Rhino
    # Wir verwenden den _-GrasshopperOpenFile Befehl direkt
    $rhinoArgs = @(
        "/nosplash",
        "/notemplate",
        "/runscript=`"_-GrasshopperPlayer `"$filePath`" _Enter`""
    )
    
    # Logge die Befehle
    "Rhino Argumente: $($rhinoArgs -join ' ')" | Out-File -FilePath $logFilePath -Append
    
    # Starte Rhino mit den Argumenten
    $process = Start-Process -FilePath $rhinoExecutablePath -ArgumentList $rhinoArgs -PassThru
    
    if ($process) {
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Rhino gestartet mit Prozess-ID: $($process.Id)" | Out-File -FilePath $logFilePath -Append
        Write-Host "Rhino wurde erfolgreich gestartet mit Prozess-ID: $($process.Id)"
    } else {
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - WARNUNG: Konnte Prozess-ID nicht ermitteln" | Out-File -FilePath $logFilePath -Append
        Write-Host "Rhino wurde gestartet, aber die Prozess-ID konnte nicht ermittelt werden"
    }
    
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Rhino-Launcher erfolgreich beendet" | Out-File -FilePath $logFilePath -Append
    Write-Host "Rhino-Launcher erfolgreich beendet. Log-Datei: $logFilePath"
    
} catch {
    $errorMessage = "FEHLER: $($_.Exception.Message)"
    if ($logFilePath) {
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $errorMessage" | Out-File -FilePath $logFilePath -Append
        "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Stack Trace: $($_.ScriptStackTrace)" | Out-File -FilePath $logFilePath -Append
    }
    Write-Error $errorMessage
}

# Das PowerShell-Fenster schließt sich nun automatisch.
