# ProTra Helper App - Test-Anleitung

## Übersicht
Diese Anleitung erklärt, wie Sie die dynamische Rhino/Grasshopper-Integration der ProTra Helper App testen können.

## Voraussetzungen

### Software
- ✅ **Rhino 8** (installiert unter `C:\Program Files\Rhino 8\System\Rhino.exe`)
- ✅ **Node.js** 18+ für die Entwicklung
- ✅ **Git** für das Klonen des Repositories

### Test-Dateien
- ✅ Mindestens eine `.gh`-Datei (z.B. `server_nestjs/gh-files/sample_model.gh`)
- ✅ Zugriff auf die Angular-Webanwendung (läuft auf Port 4200)

## Schritt 1: Helper-App starten

### Development-Modus
```bash
cd protra-helper-app
npm install
npm start
```

### Production-Build testen
```bash
cd protra-helper-app
npm run dist
# Installiere das generierte Setup in dist/
```

## Schritt 2: Grundfunktionen testen

### 2.1 Tray-Icon prüfen
- ✅ **Erwartung:** Rhino-Icon erscheint im System-Tray
- ✅ **Test:** Rechtsklick auf Tray-Icon → Menü sollte erscheinen
- ✅ **Inhalt:** "API Token anzeigen", "Rhino-Pfad konfigurieren", "Status", "Beenden"

### 2.2 API-Token abrufen
- ✅ **Aktion:** Rechtsklick → "API Token anzeigen" 
- ✅ **Erwartung:** Dialog mit 64-stelligem Hex-Token
- ✅ **Notieren:** Token für Angular-App verwenden

### 2.3 Rhino-Pfad validieren
- ✅ **Automatisch:** App sollte Rhino automatisch erkennen
- ✅ **Manuell:** Falls nicht erkannt → "Rhino-Pfad konfigurieren"
- ✅ **Test:** Status-Dialog sollte gültigen Pfad anzeigen

## Schritt 3: API-Endpoints testen

### 3.1 Status-Endpoint (ohne Authentication)
```bash
curl http://localhost:3001/status
```

**Erwartete Antwort:**
```json
{
  "status": "running",
  "version": "1.0.0",
  "serverTime": "2025-05-27T...",
  "rhinoPathConfigured": true,
  "rhinoPath": "C:\\Program Files\\Rhino 8\\System\\Rhino.exe"
}
```

### 3.2 Launch-Endpoint (mit Authentication)
```bash
curl -X POST http://localhost:3001/launch-rhino \
  -H "Content-Type: application/json" \
  -H "X-Protra-Helper-Token: YOUR_TOKEN_HERE" \
  -d '{"ghFilePath": "C:\\Dev\\hefl\\server_nestjs\\gh-files\\sample_model.gh"}'
```

**Erwartete Antwort bei Erfolg:**
```json
{
  "success": true,
  "message": "Rhino wird gestartet und öffnet sample_model.gh. Das Grasshopper-Fenster wird automatisch minimiert.",
  "processId": 12345,
  "fileName": "sample_model.gh"
}
```

## Schritt 4: Integration mit Angular-App testen

### 4.1 Angular-App vorbereiten
```bash
cd client_angular
ng serve
# App läuft auf http://localhost:4200
```

### 4.2 Rhino-Launcher-Komponente navigieren
- ✅ **URL:** `http://localhost:4200/rhino-launcher`
- ✅ **Erwartung:** Status zeigt "Helferanwendung läuft"

### 4.3 API-Token in Angular konfigurieren
- ✅ **Einfügen:** Token aus Tray-App in das Input-Feld
- ✅ **Speichern:** "Token Speichern" klicken
- ✅ **Bestätigung:** Grüne Snackbar-Nachricht

### 4.4 Datei auswählen und starten
- ✅ **Dropdown:** Grasshopper-Datei aus Liste wählen
- ✅ **Button:** "Öffne [Dateiname] in Rhino" klicken
- ✅ **Erwartung:** Rhino startet automatisch

## Schritt 5: Rhino-Verhalten validieren

### 5.1 Rhino-Start prüfen
- ✅ **Timing:** Rhino sollte innerhalb von 10 Sekunden starten
- ✅ **Splash:** Kein Splash-Screen (wegen `/nosplash`)
- ✅ **Grasshopper:** Plugin lädt automatisch

### 5.2 Grasshopper-Verhalten validieren
- ✅ **Datei:** Die ausgewählte .gh-Datei wird automatisch geöffnet
- ✅ **Fenster:** Grasshopper-Fenster ist minimiert
- ✅ **Rhino:** Viewport ist maximiert und zeigt 3D-Modell

### 5.3 Befehlssequenz verstehen
Der verwendete Befehl im Detail:
```
_-Grasshopper B D W L W H D O "C:\path\to\file.gh" W H _MaxViewport _Enter
```

- `_-Grasshopper` - Startet Grasshopper im Skript-Modus
- `B D W L` - Batch mode, Display, Window, Load
- `W H` - Window Hide (minimiert Grasshopper)
- `D O` - Document Open
- `"C:\path\to\file.gh"` - Pfad zur .gh-Datei
- `W H` - Nochmals Window Hide
- `_MaxViewport` - Maximiert Rhino-Viewport
- `_Enter` - Bestätigt alle Befehle

## Schritt 6: Fehleranalyse

### 6.1 Log-Dateien prüfen
**Helper-App Logs:**
- Windows: `%USERPROFILE%\AppData\Roaming\protra-helper-app\logs\`
- macOS: `~/Library/Logs/protra-helper-app/`

**Typische Log-Einträge bei Erfolg:**
```
[INFO] Rhino erfolgreich gestartet (PID: 12345) für Datei: sample_model.gh
[INFO] Grasshopper-Datei validiert: C:\...\sample_model.gh (45KB)
```

### 6.2 Häufige Probleme

#### Problem: "Rhino-Pfad nicht konfiguriert"
- ✅ **Lösung:** Tray → "Rhino-Pfad konfigurieren"
- ✅ **Pfad:** `C:\Program Files\Rhino 8\System\Rhino.exe`

#### Problem: "Authentifizierungstoken fehlt"
- ✅ **Lösung:** API-Token aus Tray-App kopieren
- ✅ **Format:** 64-stelliger Hex-String

#### Problem: "Datei nicht gefunden"
- ✅ **Prüfung:** Absoluter Pfad zur .gh-Datei korrekt?
- ✅ **Berechtigung:** Datei von Helper-App lesbar?

#### Problem: Rhino startet, aber Grasshopper minimiert nicht
- ✅ **Ursache:** Rhino-Version oder Befehlssyntax
- ✅ **Debug:** Log-Dateien auf Rhino-Ausgaben prüfen

## Schritt 7: Performance-Tests

### 7.1 Startup-Zeit messen
- ✅ **Ziel:** Rhino-Start < 15 Sekunden
- ✅ **Messung:** Von Button-Klick bis sichtbares 3D-Modell

### 7.2 Mehrfach-Tests
- ✅ **Test:** 5 verschiedene .gh-Dateien nacheinander
- ✅ **Erwartung:** Konsistentes Verhalten
- ✅ **Memory:** Keine Memory-Leaks in Helper-App

### 7.3 Concurrent-Tests
- ✅ **Test:** Mehrere Angular-Clients gleichzeitig
- ✅ **Limit:** Helper-App sollte parallele Requests handhaben

## Schritt 8: Produktions-Deployment testen

### 8.1 Installer testen
```bash
npm run dist
# Installiere das Setup
# Teste alle Funktionen erneut
```

### 8.2 Auto-Start validieren
- ✅ **Windows:** App startet automatisch nach Neustart
- ✅ **Tray:** Icon erscheint ohne Benutzerinteraktion

### 8.3 Cleanup-Tests
- ✅ **Deinstallation:** Vollständige Entfernung möglich
- ✅ **Registry:** Keine Rückstände in Windows Registry

## Schritt 9: Benutzer-Akzeptanz-Tests

### 9.1 Einfachheit
- ✅ **Studenten:** Können ohne Anleitung .gh-Dateien öffnen
- ✅ **Ein-Klick:** Maximal 3 Klicks vom Datei-Auswahl bis Rhino

### 9.2 Zuverlässigkeit
- ✅ **Erfolgsrate:** > 95% erfolgreiche Starts
- ✅ **Fallback:** Klare Fehlermeldungen bei Problemen

## Erfolgs-Kriterien

### ✅ Grundfunktionen
- [x] Helper-App startet und zeigt Tray-Icon
- [x] API-Token wird generiert und angezeigt
- [x] Rhino-Pfad wird automatisch erkannt
- [x] Express-Server läuft auf Port 3001

### ✅ API-Integration
- [x] Status-Endpoint antwortet korrekt
- [x] Launch-Endpoint erfordert Authentication
- [x] Grasshopper-Dateien werden validiert
- [x] Rhino-Prozesse werden korrekt gestartet

### ✅ Angular-Integration
- [x] API-Token kann konfiguriert werden
- [x] Datei-Liste wird geladen
- [x] Button startet Rhino erfolgreich
- [x] Benutzer-Feedback wird angezeigt

### ✅ Rhino-Verhalten
- [x] Datei wird automatisch geladen
- [x] Grasshopper wird minimiert
- [x] Rhino-Viewport ist maximiert
- [x] 3D-Modell ist sofort sichtbar

## Support und Debugging

Bei Problemen prüfen Sie:
1. **Logs:** Helper-App und Angular Console
2. **Netzwerk:** Port 3001 erreichbar?
3. **Berechtigung:** Admin-Rechte für Rhino-Start?
4. **Pfade:** Absolute Pfade zu .gh-Dateien korrekt?

Für weitere Hilfe: Logs aus Helper-App und Angular DevTools sammeln.
