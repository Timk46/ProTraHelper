# Option A - Korrigierte /runscript Syntax - Test-Anleitung

## 🎯 **Was wurde implementiert:**

### **Problem behoben:**
- ❌ **Alter Befehl:** `-Grasshopper B D W L W H D O {filePath} W H _MaxViewport _Enter`
- ✅ **Neuer Befehl:** `_-Grasshopper _DocumentOpen "{filePath}" _Enter`

### **Hauptunterschiede:**
1. **`B D W L W H D O`** entfernt - diese sind **nicht CLI-kompatibel**
2. **`_DocumentOpen`** hinzugefügt - echter Rhino-Befehl
3. **`_` Präfixe** für internationale Kompatibilität
4. **Anführungszeichen** um Dateipfad für Leerzeichen

## 🧪 **Test-Konfiguration:**

### **Verfügbare Test-Dateien:**
```
example.gh              → corrected_basic           (Phase 1: Nur Datei laden)
example_viewport.gh     → corrected_with_viewport   (Phase 2: + Viewport maximieren)
example_broken.gh       → original_registry_broken  (Alter problematischer Befehl)
```

### **Erwartete Befehle:**
```bash
# example.gh (Phase 1 - Basis):
"C:\Program Files\Rhino 8\System\Rhino.exe" /nosplash /runscript="_-Grasshopper _DocumentOpen \"C:\Dev\hefl\files\Grasshopper\example.gh\" _Enter"

# example_viewport.gh (Phase 2 - Mit Viewport):
"C:\Program Files\Rhino 8\System\Rhino.exe" /nosplash /runscript="_-Grasshopper _DocumentOpen \"C:\Dev\hefl\files\Grasshopper\example_viewport.gh\" _Enter _MaxViewport _Enter"

# example_broken.gh (Zum Vergleich - alter problematischer Befehl):
"C:\Program Files\Rhino 8\System\Rhino.exe" /nosplash /runscript="-Grasshopper B D W L W H D O C:\Dev\hefl\files\Grasshopper\example_broken.gh W H _MaxViewport _Enter"
```

## 🔧 **Test-Schritte:**

### **Schritt 1: Helper-App neu starten**
1. ProTra Helper-App schließen
2. Helper-App neu starten
3. Warten bis Status "läuft" anzeigt

### **Schritt 2: Phase 1 Test (Basis-Funktionalität)**
1. Web-App öffnen → Rhino Launcher
2. **`example.gh`** auswählen
3. "Rhino starten" klicken
4. **Erwartetes Ergebnis:**
   - ✅ Rhino startet
   - ✅ Grasshopper öffnet sich
   - ✅ **example.gh wird automatisch geladen** (NICHT "No document loaded")
   - ✅ Command-Details zeigen: `_-Grasshopper _DocumentOpen "C:\Dev\hefl\files\Grasshopper\example.gh" _Enter`

### **Schritt 3: Phase 2 Test (Mit Viewport-Maximierung)**
1. Erstellen Sie eine Kopie von `example.gh` und nennen Sie sie `example_viewport.gh`
2. In Web-App **`example_viewport.gh`** auswählen
3. "Rhino starten" klicken
4. **Erwartetes Ergebnis:**
   - ✅ Datei wird geladen UND
   - ✅ Viewport wird maximiert
   - ✅ Command-Details zeigen: `_-Grasshopper _DocumentOpen "..." _Enter _MaxViewport _Enter`

### **Schritt 4: Vergleichstest (Alter problematischer Befehl)**
1. Erstellen Sie eine Kopie von `example.gh` und nennen Sie sie `example_broken.gh`
2. In Web-App **`example_broken.gh`** auswählen
3. "Rhino starten" klicken
4. **Erwartetes Ergebnis:**
   - ✅ Rhino startet
   - ❌ Datei wird NICHT geladen (wie vorher)
   - ✅ Command-Details zeigen den problematischen Befehl

## 📊 **Erfolgs-Kriterien:**

### **Phase 1 erfolgreich, wenn:**
- [ ] Rhino startet ohne Fehler
- [ ] Grasshopper öffnet sich
- [ ] **Die .gh-Datei wird automatisch geladen** (nicht "No document loaded")
- [ ] Frontend zeigt korrekten Befehl an

### **Phase 2 erfolgreich, wenn:**
- [ ] Alle Phase 1 Kriterien erfüllt
- [ ] Viewport wird automatisch maximiert
- [ ] Befehlsverkettung funktioniert

## 🐛 **Debugging:**

### **Falls Datei nicht geladen wird:**
1. Prüfen Sie die Helper-App Console auf Fehlermeldungen
2. Testen Sie den Befehl manuell in Rhino:
   ```
   _-Grasshopper
   _DocumentOpen "C:\Dev\hefl\files\Grasshopper\example.gh"
   _Enter
   ```

### **Falls Befehlsverkettung nicht funktioniert:**
- Das ist normal - Rhino kann komplexe Befehlsketten nicht immer ausführen
- Phase 1 (nur Datei laden) ist das Hauptziel

### **Console-Logs prüfen:**
```
Helper-App Console zeigt:
"Verwende Befehl für example.gh: _-Grasshopper _DocumentOpen ..."
"Rhino erfolgreich gestartet (PID: xxxxx) für Datei: example.gh"
```

## 🎯 **Nächste Schritte bei Erfolg:**

### **Wenn Phase 1 funktioniert:**
1. Alle anderen .gh-Dateien auf `corrected_basic` umstellen
2. Testen mit verschiedenen Dateien
3. Produktionseinsatz

### **Wenn Phase 2 funktioniert:**
1. Erweiterte Befehle implementieren (SetView, DisplayMode, etc.)
2. Benutzerdefinierte Workflows erstellen

### **Bei Problemen:**
1. Fallback zu einfachsten Befehlen
2. Alternative Implementierung (Python-Script, RhinoScript)
3. COM-Interface für direkte Rhino-Steuerung

Die **Hauptverbesserung** sollte sofort sichtbar sein: **Die .gh-Datei wird geladen** statt "No document loaded"!
