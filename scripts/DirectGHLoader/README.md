# DirectGHLoader - Rhino Grasshopper Direkt-Starter

Diese Komponente ermöglicht es, Grasshopper-Dateien (`.gh`) direkt aus der Webanwendung in Rhino 8 zu öffnen, mit automatischer Minimierung des Grasshopper-Fensters und Maximierung des Rhino-Viewports.

## Funktionalität

1. Nutzer wählt eine `.gh`-Datei in der Webanwendung aus
2. Nach Klick auf "In Rhino öffnen" wird Rhino gestartet
3. Grasshopper wird automatisch geladen und öffnet die ausgewählte Datei
4. Das Grasshopper-Fenster wird minimiert
5. Der Rhino-Viewport wird maximiert, sodass das 3D-Modell direkt zu sehen ist

## Installation

### Methode 1: PowerShell-Skript (Empfohlen)

1. Öffnen Sie den Windows Explorer und navigieren Sie zu diesem Verzeichnis
2. Rechtsklick auf `install.ps1` → **Als Administrator ausführen**
3. Folgen Sie den Anweisungen im Skript

### Methode 2: Registry-Datei (Alternative)

1. Öffnen Sie den Windows Explorer und navigieren Sie zu diesem Verzeichnis
2. Doppelklick auf `rhinogh_uri_handler.reg`
3. Bestätigen Sie die Sicherheitswarnung mit "Ja" oder "OK"

## Technische Details

Der DirectGHLoader verwendet einen direkten Grasshopper-Befehl ohne Umwege über Python-Skripte:

```powershell
"C:\Program Files\Rhino 8\System\Rhino.exe" /nosplash /runscript="_-Grasshopper B D W L W H D O \"%1\" W H -MaxViewport _Enter"
```

Die Befehlssequenz bedeutet:
- `_-Grasshopper` - Startet Grasshopper im Skript-Modus
- `B D W L` - Batch mode, Display, Window, Load
- `W H` - Window Hide (minimiert Grasshopper)
- `D O` - Document Open (Dokument öffnen)
- `%1` - Platzhalter für den Dateipfad
- `-MaxViewport` - Maximiert die Rhino-Ansicht

## Testen

1. Starten Sie Rhino neu (wichtig!)
2. Öffnen Sie einen Browser und geben Sie ein:
   ```
   rhinogh://C:\Pfad\zu\einer\datei.gh
   ```
3. Rhino sollte starten und die Datei automatisch öffnen, mit minimiertem Grasshopper

## Fehlerbehebung

- **Rhino öffnet sich nicht**: Überprüfen Sie, ob der Registry-Eintrag korrekt erstellt wurde
- **Grasshopper minimiert nicht**: Prüfen Sie, ob der richtige Befehl installiert ist
- **Datei wird nicht gefunden**: Stellen Sie sicher, dass der Pfad korrekt ist und keine Sonderzeichen enthält

## Kompatibilität

Diese Version ist optimiert für:
- **Rhino 8** (8.0 oder höher)
- **Windows 10/11**

Für Rhino 7 muss möglicherweise der Befehl angepasst werden.
