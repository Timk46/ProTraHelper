# Installation und Verwendung des DirectGHLoader

Diese Anleitung erklärt, wie Sie den DirectGHLoader für Rhino 8 installieren und verwenden können.

## Installation

### Voraussetzungen

- Windows 10 oder 11
- Rhino 8 installiert
- Administratorrechte für die Registry-Installation

### Schritt 1: Registry-Eintrag erstellen

Es gibt zwei Möglichkeiten, den benötigten Registry-Eintrag zu erstellen:

#### Option A: PowerShell-Skript (empfohlen)

1. Navigieren Sie zum Verzeichnis `scripts/DirectGHLoader`
2. Rechtsklick auf `install.ps1`
3. Wählen Sie "Als Administrator ausführen"
4. Folgen Sie den Anweisungen im Skript

#### Option B: .REG-Datei

1. Navigieren Sie zum Verzeichnis `scripts/DirectGHLoader`
2. Doppelklick auf `rhinogh_uri_handler.reg`
3. Bestätigen Sie die Sicherheitswarnung

### Schritt 2: Rhino neu starten

Starten Sie Rhino neu, damit die Änderungen wirksam werden.

## Testen

### Methode 1: Direkter URL-Test

1. Öffnen Sie einen Webbrowser
2. Geben Sie in die Adressleiste ein: `rhinogh://C:\Dev\hefl\files\Grasshopper\example.gh`
   (oder einen anderen Pfad zu einer gültigen .gh-Datei)
3. Drücken Sie Enter
4. Rhino sollte starten, die Datei laden und das Grasshopper-Fenster minimiert anzeigen

### Methode 2: Test über die Angular-Anwendung

1. Starten Sie die Angular-Anwendung
2. Navigieren Sie zur Rhino-Launcher-Komponente
3. Wählen Sie eine .gh-Datei aus der Dropdown-Liste
4. Klicken Sie auf den "Open ... in Rhino"-Button
5. Rhino sollte starten und die ausgewählte Datei laden

## Was ist neu?

Die neue Implementation verbessert die Benutzerfreundlichkeit durch:

1. **Direkter Start**: Kein Python-Skript mehr als Zwischenschritt
2. **Automatische Minimierung**: Das Grasshopper-Fenster wird automatisch minimiert
3. **Maximierter Viewport**: Rhino zeigt das 3D-Modell direkt in maximaler Größe an

## Fehlerbehebung

Wenn etwas nicht wie erwartet funktioniert:

1. Überprüfen Sie, ob der Registry-Eintrag korrekt erstellt wurde
   - Öffnen Sie regedit.exe und navigieren Sie zu `HKEY_CLASSES_ROOT\rhinogh`
   - Überprüfen Sie den Command-Eintrag

2. Stellen Sie sicher, dass Rhino 8 ordnungsgemäß installiert ist
   - Standard-Pfad: `C:\Program Files\Rhino 8\System\Rhino.exe`

3. Überprüfen Sie die Pfade zu Ihren .gh-Dateien
   - Sie müssen absolut sein (beginnen mit Laufwerksbuchstaben)
   - Korrektes Format: `C:\Pfad\zur\datei.gh`
