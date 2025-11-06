# ProTra Rhino Command System - Dokumentation

## 📋 **Übersicht**

Das ProTra Rhino Command System ermöglicht es, verschiedene .gh-Dateien mit spezifischen Rhino-Befehlen zu starten. Basierend auf dem Dateinamen wird automatisch der passende Befehl ausgewählt.

## 🔧 **Implementierung**

### **1. Backend-Konfiguration**

#### **Datei:** `src/rhino-automator/rhino-command-config.js`

**Verfügbare Befehlsvorlagen:**
- `standard`: Standard-Verhalten (bisherig)
- `minimized`: Grasshopper minimiert
- `fullscreen`: Vollbild mit 4-View
- `perspective`: Perspective View mit Rendering
- `technical`: Technische Ansicht (Top/Wireframe)
- `presentation`: Präsentationsmodus (versteckt UI)
- `debug`: Debug-Modus mit Ghosted Display

**File-Mapping Beispiele:**
```javascript
const FILE_COMMAND_MAPPING = {
  'example.gh': 'presentation',        // Spezifische Datei
  'demo.gh': 'fullscreen',            // Spezifische Datei
  'presentation_*': 'presentation',     // Pattern: beginnt mit "presentation_"
  'cad_*': 'technical',               // Pattern: beginnt mit "cad_"
  '*render*': 'perspective',          // Pattern: enthält "render"
  '*': 'standard'                     // Fallback für alle anderen
};
```

### **2. Befehlslogik**

#### **Priorität:**
1. **Exakte Dateiname-Matches** (z.B. `example.gh`)
2. **Pattern-Matches** (z.B. `presentation_*.gh`)
3. **Fallback** zum Standard-Befehl

#### **Sicherheit:**
- Automatische Befehlsvalidierung
- Blacklist gefährlicher Befehle
- Fallback bei unsicheren Befehlen

### **3. Frontend-Integration**

#### **Automatische Anzeige:**
- Nach erfolgreichem Rhino-Start werden Command-Details angezeigt
- Copy-to-Clipboard Funktionalität
- Prozess-ID und Timestamp werden angezeigt

## 🎯 **Verwendung**

### **Schritt 1: Befehlsvorlage definieren**

```javascript
// In rhino-command-config.js neue Vorlage hinzufügen
const COMMAND_TEMPLATES = {
  mein_custom_befehl: "_-Grasshopper B D W L W H D O \"{filePath}\" W H _SetView _Front _Enter"
};
```

### **Schritt 2: File-Mapping erstellen**

```javascript
// In rhino-command-config.js Mapping hinzufügen
const FILE_COMMAND_MAPPING = {
  'meine_datei.gh': 'mein_custom_befehl',
  'projekt_*': 'mein_custom_befehl',
  // ... andere Mappings
};
```

### **Schritt 3: Helper-App neu starten**

Die Änderungen werden beim nächsten Start der Helper-App aktiv.

## 🔍 **Beispiele**

### **Beispiel 1: Präsentations-Setup**
```javascript
// Für alle Dateien die mit "presentation_" beginnen
'presentation_*': 'presentation'

// Verwendet folgenden Befehl:
"_-Grasshopper B D W L W H D O \"{filePath}\" W H _Hide _MaxViewport _SetDisplayMode _Rendered _SetView _Perspective _Enter"
```

### **Beispiel 2: CAD-Arbeit**
```javascript
// Für alle Dateien die mit "cad_" beginnen
'cad_*': 'technical'

// Verwendet folgenden Befehl:
"_-Grasshopper B D W L W H D O \"{filePath}\" W H _MaxViewport _SetView _Top _SetDisplayMode _Wireframe _Zoom _Extents _Enter"
```

### **Beispiel 3: Ihre ursprüngliche Registry-Lösung**
```javascript
// Standard-Befehl (identisch zu Ihrer Registry-Lösung)
'*': 'standard'

// Verwendet folgenden Befehl:
"_-Grasshopper B D W L W H D O \"{filePath}\" W H _MaxViewport _Enter"
```

## 🛠️ **Erweiterte Konfiguration**

### **Custom Environment Variables:**
```javascript
const RHINO_CONFIG = {
  environmentVars: {
    'RHINO_NO_CRASH_DIALOG': '1',
    'RHINO_DISABLE_UPDATE_CHECK': '1',
    'MY_CUSTOM_VAR': 'value'
  }
};
```

### **Timeout-Einstellungen:**
```javascript
const RHINO_CONFIG = {
  launchTimeout: 30000,  // 30 Sekunden
  maxInstances: 5
};
```

## 🎨 **Frontend-Features**

### **Command-Details anzeigen:**
- Nach erfolgreichem Rhino-Start
- Expansion Panel mit Befehlsdetails
- Copy-to-Clipboard Funktionalität
- Prozess-Informationen

### **Automatische Funktionen:**
- Benutzer sehen den verwendeten Befehl
- Keine Benutzerinteraktion erforderlich
- Transparenz über ausgeführte Befehle

## 🔧 **Debugging**

### **Logs prüfen:**
```javascript
// Helper-App Console zeigt:
console.log('Verwende Befehl für example.gh: _-Grasshopper B D W L...');
```

### **Frontend-Debugging:**
```javascript
// Browser Console zeigt:
console.log('Launch Response:', response);
// Enthält: commandUsed, processId, success, message
```

## 📝 **Best Practices**

### **1. Dateinamen-Konventionen:**
```
presentation_architektur_demo.gh    -> Präsentationsmodus
cad_grundriss_bearbeitung.gh        -> Technische Ansicht
render_visualisierung_final.gh      -> Perspective Rendering
tutorial_grundlagen.gh              -> Standard-Modus
```

### **2. Befehlsvalidierung:**
- Nur sichere Rhino-Befehle verwenden
- Keine Systemkommandos einbetten
- Pfade werden automatisch escaped

### **3. Performance:**
- Pattern-Matching ist schnell
- Caching für häufig verwendete Befehle
- Prozess-Tracking verhindert Duplikate

## 🚀 **Erweiterte Anwendungsfälle**

### **Workflow-Integration:**
1. Student lädt `presentation_final.gh`
2. System wählt automatisch "presentation" Template
3. Rhino startet mit optimalen Präsentationseinstellungen
4. UI wird ausgeblendet, Rendering-Modus aktiviert

### **Lehrumgebung:**
1. Dozent bereitet verschiedene .gh-Dateien vor
2. Jede Datei erhält spezifische Rhino-Konfiguration
3. Studenten können sich auf Inhalt konzentrieren
4. Keine manuelle Rhino-Konfiguration erforderlich

## ⚠️ **Wichtige Hinweise**

1. **Keine Benutzerinteraktion:** Befehlsauswahl erfolgt vollautomatisch
2. **Serverseitige Konfiguration:** Nur Administratoren können Befehle ändern
3. **Sicherheit:** Alle Befehle werden validiert
4. **Fallback:** Bei Fehlern wird Standard-Befehl verwendet
5. **Logging:** Alle Aktionen werden protokolliert

## 📊 **Monitoring**

### **Status-Informationen:**
- Verwendete Befehle werden geloggt
- Prozess-IDs werden verfolgt
- Frontend zeigt Command-Details
- Fehler werden automatisch behandelt

Das System ist jetzt vollständig einsatzbereit und bietet maximale Flexibilität bei gleichzeitiger Benutzerfreundlichkeit!
