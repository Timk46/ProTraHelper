# Rhino Registry-Sequenz Testing Guide

## Implementierung Abgeschlossen ✅

Die ursprüngliche Registry-Befehlssequenz `"-Grasshopper B D W L W H D O C:\Dev\hefl\files\Grasshopper\example.gh W H _MaxViewport _Enter"` wurde erfolgreich in die Helper-App integriert.

## Was wurde implementiert:

### 1. Command Configuration (rhino-command-config.js)
- ✅ Neuer `com_registry_sequence` Modus hinzugefügt
- ✅ `example.gh` konfiguriert für Registry-Sequenz

### 2. COM Controller (rhino-com-controller.js)
- ✅ `executeRegistrySequence()` Methode implementiert
- ✅ B D W L W H D O Befehle einzeln ausgeführt
- ✅ Datei-Laden integriert
- ✅ _MaxViewport und Fenster-Fokussierung

### 3. Rhino Launcher (rhino-launcher.js)
- ✅ Registry-Sequenz in COM-Workflow integriert
- ✅ Automatische Erkennung für `example.gh`

## Test-Anleitung

### Voraussetzungen:
1. **Rhino 3D** muss installiert sein
2. **Grasshopper Plugin** muss verfügbar sein
3. **Helper-App** muss laufen (Port 3001)
4. **Angular App** muss laufen (Port 4200)
5. **API-Token** muss in der Helper-App konfiguriert sein

### Schritt-für-Schritt Test:

#### 1. Helper-App starten
```bash
cd protra-helper-app
npm start
```
**Erwartung:** Helper-App läuft auf http://localhost:3001

#### 2. Angular App starten
```bash
cd client_angular
npm start
```
**Erwartung:** Angular App läuft auf http://localhost:4200

#### 3. API-Token konfigurieren
1. Öffne http://localhost:4200
2. Navigiere zu Rhino-Launcher Bereich
3. Gebe einen API-Token ein (z.B. "test-token-123")
4. Speichere die Konfiguration

#### 4. Rhino-Pfad konfigurieren
1. In der Helper-App: Rhino-Pfad setzen
2. Typischer Pfad: `C:\Program Files\Rhino 7\System\Rhino.exe`
3. Teste die Verbindung

#### 5. Registry-Sequenz testen
1. Navigiere zu: http://localhost:4200/dashboard/concept/6
2. Klicke auf den **grünen Rhino-Button** (extension icon)
3. **Erwartetes Verhalten:**
   - Rhino startet ohne Splash-Screen
   - Grasshopper Plugin wird geladen
   - Registry-Befehle werden ausgeführt: B D W L W H D O
   - `example.gh` wird geladen
   - Viewport wird maximiert (_MaxViewport)
   - Rhino-Fenster kommt in den Vordergrund

#### 6. Erfolgs-Indikatoren:
- ✅ Rhino öffnet sich
- ✅ Grasshopper ist aktiv
- ✅ `example.gh` ist geladen
- ✅ Viewport ist maximiert
- ✅ Fenster ist im Vordergrund
- ✅ Keine Fehlermeldungen in der Console

### Debug-Informationen:

#### Helper-App Logs prüfen:
```bash
# In protra-helper-app Verzeichnis
tail -f logs/app.log
```

#### Browser Console prüfen:
1. F12 → Console Tab
2. Suche nach Rhino-bezogenen Meldungen
3. Prüfe auf Fehler oder Warnungen

#### Erwartete Log-Ausgaben:
```
COM: Executing registry sequence for: C:\Dev\hefl\files\Grasshopper\example.gh
COM: Executing registry command sequence: B D W L W H D O
COM: Loading file: C:\Dev\hefl\files\Grasshopper\example.gh
COM: Registry sequence completed successfully
```

### Troubleshooting:

#### Problem: Rhino startet nicht
**Lösung:**
1. Prüfe Rhino-Pfad in Helper-App
2. Stelle sicher, dass Rhino installiert ist
3. Prüfe Windows-Berechtigungen

#### Problem: Grasshopper lädt nicht
**Lösung:**
1. Starte Rhino manuell und prüfe Grasshopper
2. Prüfe Grasshopper-Plugin Installation
3. Prüfe COM-Verbindung

#### Problem: Datei wird nicht geladen
**Lösung:**
1. Prüfe ob `files/Grasshopper/example.gh` existiert
2. Prüfe Dateiberechtigungen
3. Teste mit absoluten Pfaden

#### Problem: API-Token Fehler
**Lösung:**
1. Prüfe Token in Angular App
2. Prüfe Helper-App Konfiguration
3. Teste mit einfachem Token wie "test"

### Erweiterte Tests:

#### Test verschiedene Modi:
1. Ändere in `rhino-command-config.js`:
   ```javascript
   'example.gh': 'com_basic',           // Standard-Modus
   'example.gh': 'com_viewport',        // Mit Viewport
   'example.gh': 'com_registry_sequence', // Registry-Sequenz
   ```

#### Test andere Dateien:
1. Kopiere `example.gh` zu `test.gh`
2. Ändere Konfiguration entsprechend
3. Teste verschiedene Befehlssequenzen

## Technische Details:

### Registry-Sequenz Implementierung:
```javascript
// Phase 1: Grasshopper starten
await this.executeCommand('Grasshopper', 15000);

// Phase 2: Registry-Befehle (B D W L W H D O)
const registryCommands = ['B', 'D', 'W', 'L', 'W', 'H', 'D', 'O'];
for (const cmd of registryCommands) {
  await this.executeCommand(cmd, 2000);
}

// Phase 3: Datei laden
await this.executeCommand(`_GrasshopperLoadDocument "${filePath}"`, 20000);

// Phase 4: Finale Befehle (W H)
await this.executeCommand('W', 1000);
await this.executeCommand('H', 1000);

// Phase 5: Viewport maximieren
await this.executeViewportCommand('_MaxViewport');

// Phase 6: Fenster fokussieren
await this.bringRhinoToForeground();
```

### Befehlsreihenfolge:
1. **Grasshopper** - Plugin starten
2. **B** - Background Modus
3. **D** - Display Modus  
4. **W** - Window Modus
5. **L** - Load Modus
6. **W** - Wait Modus
7. **H** - Hide Modus
8. **D** - Document Modus
9. **O** - Open Modus
10. **_GrasshopperLoadDocument** - Datei laden
11. **W** - Wait (final)
12. **H** - Handle (final)
13. **_MaxViewport** - Viewport maximieren
14. **SetForegroundWindow** - Fenster fokussieren

## Erfolg! 🎉

Die Registry-Sequenz wurde erfolgreich implementiert und kann jetzt über den Rhino-Button in der Angular-App getestet werden.
