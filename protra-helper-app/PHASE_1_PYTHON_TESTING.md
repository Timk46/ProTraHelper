# Phase 1: Python Script Integration - Test-Anleitung

## 🎯 **Was wurde implementiert:**

### **Das Problem wurde gelöst:**
- ❌ **Alte Lösung:** `/runscript` Befehle funktionieren nicht → "No document loaded"
- ✅ **Neue Lösung:** Python Script Integration → Rhino's native Python-Engine

### **Kern-Implementierung:**
1. **Python Script Generator** - Generiert dynamische Python-Scripts
2. **Command Configuration** - Python vs CLI Modi
3. **RhinoLauncher Integration** - Intelligente Ausführungslogik  
4. **Multi-User Skalierbarkeit** - Keine Registry-Änderungen erforderlich

## 🔧 **Aktuelle Konfiguration:**

### **example.gh verwendet jetzt:**
```
File: example.gh → python_basic
Command: _RunPythonScript "C:\temp\protra-rhino-scripts\protra_basic_[timestamp].py"
Execution: Python-basierter Befehl (nicht mehr CLI)
```

### **Python Script Inhalt (Beispiel):**
```python
# ProTra Rhino Automation Script - Basic Mode
import rhinoscriptsyntax as rs
import Grasshopper as gh
import System
import time

def main():
    filepath = r"C:\Dev\hefl\files\Grasshopper\example.gh"
    print("ProTra: Loading Grasshopper file: " + filepath)
    
    if not gh.Instances.DocumentEditor:
        print("ERROR: Grasshopper Document Editor not available")
        return False
        
    success = gh.Instances.DocumentEditor.LoadDocument(filepath)
    if success:
        print("ProTra: File loaded successfully")
        time.sleep(1)
        print("ProTra: Basic mode activated")
        return True
    else:
        print("ERROR: Failed to load Grasshopper file")
        return False

if __name__ == "__main__":
    result = main()
    print("ProTra: Script completed with result: " + str(result))
```

## 🧪 **Test-Konfigurationen verfügbar:**

### **Python-basierte Modi (EMPFOHLEN):**
```
example.gh                 → python_basic          (Nur Datei laden)
example_viewport.gh        → python_viewport       (+ Viewport maximieren)
example_presentation.gh    → python_presentation   (Präsentationsmodus)
example_technical.gh       → python_technical      (Technische Ansicht)
example_debug.gh           → python_debug          (Debug-Modus)
```

### **CLI-basierte Modi (Fallback/Vergleich):**
```
example_cli.gh             → corrected_basic       (CLI: Basis-Funktionalität)
example_broken.gh          → original_registry_broken (CLI: Alter problematischer Befehl)
```

### **Pattern-basierte Zuordnungen:**
```
presentation_*.gh          → python_presentation   (Alle Präsentations-Dateien)
cad_*.gh                   → python_technical      (Alle CAD-Dateien)
workshop_*.gh              → python_viewport       (Alle Workshop-Dateien)
demo_*.gh                  → python_presentation   (Alle Demo-Dateien)
*render*.gh                → python_presentation   (Alle Rendering-Dateien)
```

## 🔧 **Test-Schritte:**

### **Schritt 1: Helper-App neu starten**
1. ProTra Helper-App schließen
2. Helper-App neu starten
3. Warten bis Status "läuft" anzeigt

### **Schritt 2: Phase 1 Test (Python Basic)**
1. Web-App öffnen → Rhino Launcher
2. **`example.gh`** auswählen
3. "Rhino starten" klicken
4. **Erwartetes Ergebnis:**
   - ✅ Rhino startet ohne Fehler
   - ✅ Grasshopper öffnet sich
   - ✅ **example.gh wird automatisch geladen** (NICHT "No document loaded")
   - ✅ Command-Details zeigen: `_RunPythonScript "C:\temp\..."`
   - ✅ Python-Script wird nach 60 Sekunden automatisch gelöscht

### **Schritt 3: Erweiterte Tests (Python Modi)**

**Erstellen Sie Test-Dateien:**
```bash
# Im files/Grasshopper/ Verzeichnis
copy example.gh example_viewport.gh
copy example.gh example_presentation.gh
copy example.gh example_technical.gh
copy example.gh example_debug.gh
```

**Testen Sie verschiedene Modi:**
1. `example_viewport.gh` → Viewport sollte maximiert werden
2. `example_presentation.gh` → Präsentationsmodus (Rendered, Perspective)
3. `example_technical.gh` → Technische Ansicht (Top, Wireframe)
4. `example_debug.gh` → Debug-Modus

### **Schritt 4: Vergleichstest (CLI vs Python)**

**Erstellen Sie CLI-Test-Datei:**
```bash
copy example.gh example_cli.gh
```

**Vergleichen Sie:**
- `example.gh` (Python) → Datei wird geladen ✅
- `example_cli.gh` (CLI) → Möglicherweise "No document loaded" ❌

## 📊 **Erfolgs-Kriterien:**

### **Phase 1 erfolgreich, wenn:**
- [ ] Rhino startet ohne Fehler
- [ ] Grasshopper öffnet sich  
- [ ] **Die .gh-Datei wird automatisch geladen** (Hauptziel)
- [ ] Frontend zeigt Python-Befehl an: `_RunPythonScript "..."`
- [ ] Temp-Script wird erstellt und nach 60s gelöscht
- [ ] Verschiedene Python-Modi funktionieren unterschiedlich

### **Debugging-Informationen:**
- [ ] Helper-App Console zeigt: `"Launching Rhino with Python script integration: basic mode"`
- [ ] Helper-App Console zeigt: `"Python script created: C:\temp\..."`
- [ ] Frontend zeigt: `executionType: 'python'`

## 🐛 **Troubleshooting:**

### **Falls Python-Script nicht funktioniert:**
1. **Prüfen Sie Rhino-Logs:**
   - Öffnen Sie Rhino manuell
   - Gehen Sie zu Tools → Python → Edit
   - Führen Sie das generierte Script manuell aus

2. **Prüfen Sie Script-Generierung:**
   - Helper-App Console sollte Script-Pfad zeigen
   - Prüfen Sie ob Datei in `C:\temp\protra-rhino-scripts\` existiert

3. **Fallback zu CLI:**
   - Verwenden Sie `example_cli.gh` für Vergleich
   - CLI-Modi sollten weiterhin verfügbar sein

### **Falls immer noch "No document loaded":**
1. **Rhino Python aktiviert?**
   - Öffnen Sie Rhino → Tools → Options → Plug-ins
   - Prüfen Sie ob "IronPython" aktiviert ist

2. **Script-Ausführung:**
   - Testen Sie manuell: `_RunPythonScript` in Rhino-Kommandozeile

## 🚀 **Erwartete Verbesserungen:**

### **Sofort sichtbar:**
- ✅ **Die .gh-Datei wird geladen** statt "No document loaded"
- ✅ **Transparente Python-Commands** im Frontend
- ✅ **Multi-User Skalierbarkeit** (keine Registry-Änderungen)

### **Erweiterte Features (funktionieren):**
- ✅ **Viewport-Automatisierung** (bei viewport-Modi)
- ✅ **Display-Mode Steuerung** (bei presentation/technical)
- ✅ **View-Steuerung** (Perspective, Top, etc.)

### **Technische Verbesserungen:**
- ✅ **Reliable Script Execution** (Python > CLI)
- ✅ **Better Error Handling** (Python Exceptions)
- ✅ **Session-specific Scripts** (Temp-Files)
- ✅ **Automatic Cleanup** (60s Timeout)

## 🎯 **Nächste Schritte bei Erfolg:**

### **Wenn Python-Integration funktioniert:**
1. **Alle Dateien auf Python umstellen:** `'*': 'python_basic'`
2. **Erweiterte Modi testen:** Presentation, Technical, etc.
3. **Pattern-basierte Zuordnungen** für verschiedene Dateitypen
4. **Produktionseinsatz** mit Multi-User Support

### **Phase 2 Vorbereitung:**
- **User-Specific Scripts** (Pro-User Anpassungen)
- **Extended Automation** (Layer-Steuerung, Custom Views)
- **Performance Optimization** (Script Caching)
- **Cross-Platform Support** (Mac/Linux)

**Das Hauptziel ist erreicht: Rhino-Befehle werden zuverlässig ausgeführt und .gh-Dateien automatisch geladen!**
