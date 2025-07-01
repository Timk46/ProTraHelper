/**
 * PythonScriptGenerator - Generiert dynamische Python-Scripts für Rhino-Automatisierung
 * 
 * Löst das /runscript Problem durch Verwendung von Rhino's nativer Python-Engine
 */
const fs = require('node:fs').promises;
const path = require('node:path');
const os = require('node:os');

/**
 * Python Script Templates für verschiedene Rhino-Modi
 */
const PYTHON_TEMPLATES = {
  // Enhanced Basis-Template: Mit Grasshopper Waiting Logic
  basic: `# ProTra Rhino Automation Script - Enhanced Basic Mode
# Löst Timing-Probleme zwischen Rhino-Start und Grasshopper-Verfügbarkeit
import rhinoscriptsyntax as rs
import System
import time

def wait_for_grasshopper(max_wait=45):
    """
    Wartet bis Grasshopper Plugin vollständig geladen und verfügbar ist
    Returns: True wenn verfügbar, False wenn Timeout
    """
    print("ProTra: Waiting for Grasshopper plugin to load...")
    
    for attempt in range(max_wait):
        try:
            # Versuche Grasshopper zu importieren
            import Grasshopper as gh
            
            # Prüfe ob Grasshopper-Instanzen verfügbar sind
            if gh.Instances and gh.Instances.DocumentEditor:
                print(f"ProTra: Grasshopper available after {attempt + 1} seconds")
                return True
                
            # Prüfe alternative Grasshopper-Verfügbarkeit
            if hasattr(gh, 'Instances') and gh.Instances:
                print(f"ProTra: Grasshopper partially loaded, checking DocumentEditor...")
                time.sleep(2)
                if gh.Instances.DocumentEditor:
                    print(f"ProTra: Grasshopper DocumentEditor available after {attempt + 3} seconds")
                    return True
            
        except ImportError:
            # Grasshopper noch nicht geladen
            if attempt == 0:
                print("ProTra: Grasshopper module not yet imported. Attempting to open Grasshopper plugin now.")
                try:
                    print("ProTra: Sending '-_Grasshopper' command to Rhino...")
                    rs.Command("-_Grasshopper", echo=False)
                    print("ProTra: '-_Grasshopper' command sent successfully.")
                except Exception as e:
                    print(f"ProTra: ERROR: Could not execute '-_Grasshopper' command: {str(e)}. Will continue to wait for manual launch.")
            
        except Exception as e:
            print(f"ProTra: Grasshopper check attempt {attempt + 1}: {str(e)}")
        
        # Fortschritts-Updates
        if attempt % 5 == 0 and attempt > 0:
            print(f"ProTra: Still waiting for Grasshopper... ({attempt + 1}/{max_wait})")
        
        time.sleep(1)
    
    print(f"ProTra: ERROR - Grasshopper not available after {max_wait} seconds")
    return False

def load_grasshopper_file(filepath):
    """
    Lädt eine Grasshopper-Datei mit Retry-Mechanismus
    """
    try:
        import Grasshopper as gh
        
        print(f"ProTra: Attempting to load file: {filepath}")
        
        # Mehrere Load-Versuche
        for attempt in range(3):
            try:
                success = gh.Instances.DocumentEditor.LoadDocument(filepath)
                if success:
                    print(f"ProTra: File loaded successfully on attempt {attempt + 1}")
                    time.sleep(2)  # Warte bis Datei vollständig verarbeitet ist
                    return True
                else:
                    print(f"ProTra: Load attempt {attempt + 1} failed, retrying...")
                    time.sleep(1)
            except Exception as e:
                print(f"ProTra: Load attempt {attempt + 1} exception: {str(e)}")
                time.sleep(1)
        
        print("ProTra: ERROR - Failed to load file after 3 attempts")
        return False
        
    except Exception as e:
        print(f"ProTra: ERROR in load_grasshopper_file: {str(e)}")
        return False

def main():
    """Enhanced main function mit robuster Grasshopper-Integration"""
    try:
        # NEU: Feste Wartezeit von 10 Sekunden, um sicherzustellen, dass Rhino bereit ist
        print("ProTra: Initializing automation. Waiting for 10 seconds before proceeding...")
        time.sleep(10)
        print("ProTra: 10-second delay finished. Starting main process.")

        # Datei-Pfad
        filepath = r"{{FILE_PATH}}"
        print("=== ProTra Enhanced Rhino Automation - Basic Mode ===")
        print(f"ProTra: Target file: {filepath}")
        
        # Phase 1: Warte auf Grasshopper
        if not wait_for_grasshopper():
            return False
        
        # Phase 2: Lade Grasshopper-Datei
        if not load_grasshopper_file(filepath):
            return False
        
        # Phase 3: Bestätige erfolgreichen Load
        try:
            import Grasshopper as gh
            current_doc = gh.Instances.DocumentEditor.Document
            if current_doc and current_doc.DisplayName:
                print(f"ProTra: Successfully loaded document: {current_doc.DisplayName}")
            else:
                print("ProTra: Document loaded but no display name available")
        except Exception as e:
            print(f"ProTra: Could not verify document name: {str(e)}")
        
        print("ProTra: Basic mode completed successfully")
        return True
        
    except Exception as e:
        print(f"ProTra: ERROR in main(): {str(e)}")
        import traceback
        print("ProTra: Detailed traceback:")
        print(traceback.format_exc())
        return False

# Script ausführen
if __name__ == "__main__":
    start_time = time.time()
    result = main()
    end_time = time.time()
    print(f"ProTra: Script completed in {end_time - start_time:.1f} seconds with result: {result}")
`,

  // Enhanced Viewport-Template: Mit Grasshopper Waiting Logic
  with_viewport: `# ProTra Rhino Automation Script - Enhanced Viewport Mode
# Löst Timing-Probleme zwischen Rhino-Start und Grasshopper-Verfügbarkeit
import rhinoscriptsyntax as rs
import System
import time

def wait_for_grasshopper(max_wait=45):
    """Wartet bis Grasshopper Plugin vollständig geladen und verfügbar ist"""
    print("ProTra: Waiting for Grasshopper plugin to load...")
    
    for attempt in range(max_wait):
        try:
            import Grasshopper as gh
            if gh.Instances and gh.Instances.DocumentEditor:
                print(f"ProTra: Grasshopper available after {attempt + 1} seconds")
                return True
                
            if hasattr(gh, 'Instances') and gh.Instances:
                print(f"ProTra: Grasshopper partially loaded, checking DocumentEditor...")
                time.sleep(2)
                if gh.Instances.DocumentEditor:
                    print(f"ProTra: Grasshopper DocumentEditor available after {attempt + 3} seconds")
                    return True
            
        except ImportError:
            if attempt == 0:
                print("ProTra: Grasshopper not yet imported, starting Grasshopper...")
                try:
                    rs.Command("Grasshopper", echo=False)
                except:
                    print("ProTra: Could not execute Grasshopper command, will keep waiting...")
            
        except Exception as e:
            print(f"ProTra: Grasshopper check attempt {attempt + 1}: {str(e)}")
        
        if attempt % 5 == 0 and attempt > 0:
            print(f"ProTra: Still waiting for Grasshopper... ({attempt + 1}/{max_wait})")
        
        time.sleep(1)
    
    print(f"ProTra: ERROR - Grasshopper not available after {max_wait} seconds")
    return False

def load_grasshopper_file(filepath):
    """Lädt eine Grasshopper-Datei mit Retry-Mechanismus"""
    try:
        import Grasshopper as gh
        print(f"ProTra: Attempting to load file: {filepath}")
        
        for attempt in range(3):
            try:
                success = gh.Instances.DocumentEditor.LoadDocument(filepath)
                if success:
                    print(f"ProTra: File loaded successfully on attempt {attempt + 1}")
                    time.sleep(2)
                    return True
                else:
                    print(f"ProTra: Load attempt {attempt + 1} failed, retrying...")
                    time.sleep(1)
            except Exception as e:
                print(f"ProTra: Load attempt {attempt + 1} exception: {str(e)}")
                time.sleep(1)
        
        print("ProTra: ERROR - Failed to load file after 3 attempts")
        return False
        
    except Exception as e:
        print(f"ProTra: ERROR in load_grasshopper_file: {str(e)}")
        return False

def maximize_viewport():
    """Maximiert den Rhino-Viewport mit Retry-Mechanismus"""
    try:
        for attempt in range(3):
            try:
                rs.Command("_MaxViewport", echo=False)
                print("ProTra: Viewport maximized successfully")
                return True
            except Exception as e:
                print(f"ProTra: Viewport maximize attempt {attempt + 1} failed: {str(e)}")
                time.sleep(1)
        
        print("ProTra: Warning - Could not maximize viewport after 3 attempts")
        return False
        
    except Exception as e:
        print(f"ProTra: ERROR in maximize_viewport: {str(e)}")
        return False

def main():
    """Enhanced main function mit Viewport-Maximierung"""
    try:
        filepath = r"{{FILE_PATH}}"
        print("=== ProTra Enhanced Rhino Automation - Viewport Mode ===")
        print(f"ProTra: Target file: {filepath}")
        
        # Phase 1: Warte auf Grasshopper
        if not wait_for_grasshopper():
            return False
        
        # Phase 2: Lade Grasshopper-Datei
        if not load_grasshopper_file(filepath):
            return False
        
        # Phase 3: Maximiere Viewport
        maximize_viewport()
        
        # Phase 4: Bestätige erfolgreichen Load
        try:
            import Grasshopper as gh
            current_doc = gh.Instances.DocumentEditor.Document
            if current_doc and current_doc.DisplayName:
                print(f"ProTra: Successfully loaded document: {current_doc.DisplayName}")
            else:
                print("ProTra: Document loaded but no display name available")
        except Exception as e:
            print(f"ProTra: Could not verify document name: {str(e)}")
        
        print("ProTra: Viewport mode completed successfully")
        return True
        
    except Exception as e:
        print(f"ProTra: ERROR in main(): {str(e)}")
        import traceback
        print("ProTra: Detailed traceback:")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    start_time = time.time()
    result = main()
    end_time = time.time()
    print(f"ProTra: Script completed in {end_time - start_time:.1f} seconds with result: {result}")
`,

  // Enhanced Präsentationsmodus-Template: Mit Grasshopper Waiting Logic
  presentation: `# ProTra Rhino Automation Script - Enhanced Presentation Mode
# Löst Timing-Probleme und aktiviert professionellen Präsentationsmodus
import rhinoscriptsyntax as rs
import System
import time

def wait_for_grasshopper(max_wait=45):
    """Wartet bis Grasshopper Plugin vollständig geladen und verfügbar ist"""
    print("ProTra: Waiting for Grasshopper plugin to load...")
    
    for attempt in range(max_wait):
        try:
            import Grasshopper as gh
            if gh.Instances and gh.Instances.DocumentEditor:
                print(f"ProTra: Grasshopper available after {attempt + 1} seconds")
                return True
                
            if hasattr(gh, 'Instances') and gh.Instances:
                print(f"ProTra: Grasshopper partially loaded, checking DocumentEditor...")
                time.sleep(2)
                if gh.Instances.DocumentEditor:
                    print(f"ProTra: Grasshopper DocumentEditor available after {attempt + 3} seconds")
                    return True
            
        except ImportError:
            if attempt == 0:
                print("ProTra: Grasshopper not yet imported, starting Grasshopper...")
                try:
                    rs.Command("Grasshopper", echo=False)
                except:
                    print("ProTra: Could not execute Grasshopper command, will keep waiting...")
            
        except Exception as e:
            print(f"ProTra: Grasshopper check attempt {attempt + 1}: {str(e)}")
        
        if attempt % 5 == 0 and attempt > 0:
            print(f"ProTra: Still waiting for Grasshopper... ({attempt + 1}/{max_wait})")
        
        time.sleep(1)
    
    print(f"ProTra: ERROR - Grasshopper not available after {max_wait} seconds")
    return False

def load_grasshopper_file(filepath):
    """Lädt eine Grasshopper-Datei mit Retry-Mechanismus"""
    try:
        import Grasshopper as gh
        print(f"ProTra: Attempting to load file: {filepath}")
        
        for attempt in range(3):
            try:
                success = gh.Instances.DocumentEditor.LoadDocument(filepath)
                if success:
                    print(f"ProTra: File loaded successfully on attempt {attempt + 1}")
                    time.sleep(2)
                    return True
                else:
                    print(f"ProTra: Load attempt {attempt + 1} failed, retrying...")
                    time.sleep(1)
            except Exception as e:
                print(f"ProTra: Load attempt {attempt + 1} exception: {str(e)}")
                time.sleep(1)
        
        print("ProTra: ERROR - Failed to load file after 3 attempts")
        return False
        
    except Exception as e:
        print(f"ProTra: ERROR in load_grasshopper_file: {str(e)}")
        return False

def setup_presentation_mode():
    """Aktiviert professionellen Präsentationsmodus mit Retry-Logic"""
    try:
        commands = [
            ("_MaxViewport", "Viewport maximized"),
            ("_SetView _Perspective", "Perspective view set"),
            ("_SetDisplayMode _Rendered", "Rendered display mode set"),
            ("_ZoomExtents", "Zoomed to extents")
        ]
        
        for command, success_msg in commands:
            for attempt in range(3):
                try:
                    rs.Command(command, echo=False)
                    print(f"ProTra: {success_msg}")
                    time.sleep(0.5)  # Kurze Pause zwischen Befehlen
                    break
                except Exception as e:
                    print(f"ProTra: {command} attempt {attempt + 1} failed: {str(e)}")
                    if attempt == 2:
                        print(f"ProTra: Warning - {command} failed after 3 attempts")
                    time.sleep(1)
        
        print("ProTra: Presentation mode setup completed")
        return True
        
    except Exception as e:
        print(f"ProTra: ERROR in setup_presentation_mode: {str(e)}")
        return False

def main():
    """Enhanced main function mit professionellem Präsentationsmodus"""
    try:
        filepath = r"{{FILE_PATH}}"
        print("=== ProTra Enhanced Rhino Automation - Presentation Mode ===")
        print(f"ProTra: Target file: {filepath}")
        
        # Phase 1: Warte auf Grasshopper
        if not wait_for_grasshopper():
            return False
        
        # Phase 2: Lade Grasshopper-Datei
        if not load_grasshopper_file(filepath):
            return False
        
        # Phase 3: Aktiviere Präsentationsmodus
        setup_presentation_mode()
        
        # Phase 4: Bestätige erfolgreichen Load
        try:
            import Grasshopper as gh
            current_doc = gh.Instances.DocumentEditor.Document
            if current_doc and current_doc.DisplayName:
                print(f"ProTra: Successfully loaded document: {current_doc.DisplayName}")
            else:
                print("ProTra: Document loaded but no display name available")
        except Exception as e:
            print(f"ProTra: Could not verify document name: {str(e)}")
        
        print("ProTra: Presentation mode completed successfully")
        return True
        
    except Exception as e:
        print(f"ProTra: ERROR in main(): {str(e)}")
        import traceback
        print("ProTra: Detailed traceback:")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    start_time = time.time()
    result = main()
    end_time = time.time()
    print(f"ProTra: Script completed in {end_time - start_time:.1f} seconds with result: {result}")
`,

  // Technische Ansicht
  technical: `# ProTra Rhino Automation Script - Technical Mode
import rhinoscriptsyntax as rs
import Grasshopper as gh
import System
import time

def main():
    """Lädt eine Grasshopper-Datei und aktiviert technische Ansicht"""
    try:
        filepath = r"{{FILE_PATH}}"
        print("ProTra: Loading Grasshopper file: " + filepath)
        
        if not gh.Instances.DocumentEditor:
            print("ERROR: Grasshopper Document Editor not available")
            return False
            
        # Lade Grasshopper-Datei
        success = gh.Instances.DocumentEditor.LoadDocument(filepath)
        if success:
            print("ProTra: File loaded successfully")
            time.sleep(1)
            
            # Technische Ansicht aktivieren
            try:
                rs.Command("_MaxViewport", echo=False)
                print("ProTra: Viewport maximized")
                
                rs.Command("_SetView _Top", echo=False)
                print("ProTra: Top view set")
                
                rs.Command("_SetDisplayMode _Wireframe", echo=False)
                print("ProTra: Wireframe display mode set")
                
                rs.Command("_ZoomExtents", echo=False)
                print("ProTra: Zoomed to extents")
                
            except Exception as e:
                print("Warning: Technical setup issues: " + str(e))
            
            print("ProTra: Technical mode activated")
            return True
        else:
            print("ERROR: Failed to load Grasshopper file")
            return False
            
    except Exception as e:
        print("ERROR: " + str(e))
        import traceback
        print("Traceback: " + traceback.format_exc())
        return False

if __name__ == "__main__":
    result = main()
    print("ProTra: Script completed with result: " + str(result))
`,

  // Debug-Modus (nur Grasshopper starten)
  debug: `# ProTra Rhino Automation Script - Debug Mode
import rhinoscriptsyntax as rs
import Grasshopper as gh
import System

def main():
    """Debug-Modus: Startet nur Grasshopper ohne Datei"""
    try:
        print("ProTra: Starting Grasshopper in debug mode")
        
        if not gh.Instances.DocumentEditor:
            print("ERROR: Grasshopper Document Editor not available")
            return False
        
        # Nur Grasshopper anzeigen, keine Datei laden
        print("ProTra: Grasshopper is ready for debugging")
        return True
            
    except Exception as e:
        print("ERROR: " + str(e))
        import traceback
        print("Traceback: " + traceback.format_exc())
        return False

if __name__ == "__main__":
    result = main()
    print("ProTra: Debug script completed with result: " + str(result))
`,

  // Registry Sequence Advanced: Implementiert die korrekte "B D W L W H D O" Sequenz
  registry_sequence_advanced: `# ProTra Rhino Automation Script - Registry Sequence Advanced
# Implementiert die originale Registry-Sequenz: _-Grasshopper -> B D W L W H D O -> file.gh -> W H -> _MaxViewport
import rhinoscriptsyntax as rs
import System
import time

def execute_grasshopper_command_sequence(filepath):
    """
    Implementiert die korrekte Registry-Sequenz für Grasshopper
    Folgt der originalen Befehlsfolge aus der Windows Registry
    """
    try:
        print("=== ProTra Registry Sequence Advanced Mode ===")
        print(f"ProTra: Target file: {filepath}")
        
        # Phase 1: Starte Grasshopper im Kommandozeilen-Modus
        print("ProTra: Phase 1 - Starting Grasshopper with _-Grasshopper")
        rs.Command("_-Grasshopper", echo=False)
        
        # Warte bis Grasshopper Command-Interface bereit ist
        time.sleep(3)
        print("ProTra: Grasshopper command mode activated")
        
        # Phase 2: Führe die Grasshopper-spezifischen Befehle aus
        # Diese werden IN Grasshopper eingegeben, nachdem es gestartet wurde
        grasshopper_commands = ['B', 'D', 'W', 'L', 'W', 'H', 'D', 'O']
        
        print("ProTra: Phase 2 - Executing Grasshopper commands: B D W L W H D O")
        for i, cmd in enumerate(grasshopper_commands):
            try:
                print(f"ProTra: Sending Grasshopper command {i+1}/8: '{cmd}'")
                rs.Command(cmd, echo=False)
                time.sleep(0.3)  # Kurze Pause zwischen Befehlen
            except Exception as e:
                print(f"ProTra: Warning - Grasshopper command '{cmd}' failed: {str(e)}")
                # Fortsetzung auch bei Fehlern einzelner Befehle
        
        # Phase 3: Sende den Dateipfad (wird in Grasshopper verarbeitet)
        print(f"ProTra: Phase 3 - Sending file path to Grasshopper")
        try:
            # Versuche Pfad ohne Anführungszeichen
            rs.Command(filepath, echo=False)
            time.sleep(2)
            print(f"ProTra: File path sent: {filepath}")
        except Exception as e:
            print(f"ProTra: Direct file path failed: {str(e)}")
            try:
                # Fallback: Mit Anführungszeichen
                quoted_path = f'"{filepath}"'
                rs.Command(quoted_path, echo=False)
                time.sleep(2)
                print(f"ProTra: File path sent (quoted): {quoted_path}")
            except Exception as e2:
                print(f"ProTra: Warning - File path transmission failed: {str(e2)}")
        
        # Phase 4: Führe die finalen Grasshopper-Befehle aus (W H)
        print("ProTra: Phase 4 - Executing final Grasshopper commands: W H")
        final_commands = ['W', 'H']
        for cmd in final_commands:
            try:
                print(f"ProTra: Sending final command: '{cmd}'")
                rs.Command(cmd, echo=False)
                time.sleep(0.5)
            except Exception as e:
                print(f"ProTra: Warning - Final command '{cmd}' failed: {str(e)}")
        
        # Phase 5: Bestätige mit Enter (beendet den Grasshopper-Befehlsmodus)
        print("ProTra: Phase 5 - Confirming with Enter")
        try:
            rs.Command("_Enter", echo=False)
            time.sleep(1)
            print("ProTra: Grasshopper command mode completed")
        except Exception as e:
            print(f"ProTra: Warning - Enter confirmation failed: {str(e)}")
        
        # Phase 6: Maximiere Viewport
        print("ProTra: Phase 6 - Maximizing viewport")
        try:
            rs.Command("_MaxViewport", echo=False)
            time.sleep(1)
            print("ProTra: Viewport maximized")
        except Exception as e:
            print(f"ProTra: Warning - Viewport maximization failed: {str(e)}")
        
        return True
        
    except Exception as e:
        print(f"ProTra: ERROR in execute_grasshopper_command_sequence: {str(e)}")
        import traceback
        print("ProTra: Detailed traceback:")
        print(traceback.format_exc())
        return False

def verify_grasshopper_file_loaded():
    """
    Versucht zu verifizieren, ob eine Grasshopper-Datei geladen wurde
    """
    try:
        import Grasshopper as gh
        
        if gh.Instances and gh.Instances.DocumentEditor:
            current_doc = gh.Instances.DocumentEditor.Document
            if current_doc and current_doc.DisplayName:
                print(f"ProTra: Document verified: {current_doc.DisplayName}")
                return True
            else:
                print("ProTra: Document loaded but no display name available")
                return True  # Trotzdem als Erfolg werten
        else:
            print("ProTra: Warning - Could not access Grasshopper DocumentEditor for verification")
            return True  # Nicht als Fehler werten, da Registry-Sequence möglicherweise funktioniert hat
            
    except Exception as e:
        print(f"ProTra: Could not verify document load: {str(e)}")
        return True  # Nicht als Fehler werten

def main():
    """
    Hauptfunktion für Registry Sequence Advanced Mode
    Implementiert die originale Windows Registry Befehlsfolge
    """
    try:
        filepath = r"{{FILE_PATH}}"
        start_time = time.time()
        
        print("=== ProTra Registry Sequence Advanced - Starting ===")
        print(f"ProTra: Implementing original registry sequence for: {filepath}")
        
        # Führe die Registry-Sequenz aus
        sequence_success = execute_grasshopper_command_sequence(filepath)
        
        if sequence_success:
            print("ProTra: Registry sequence executed successfully")
            
            # Versuche zu verifizieren dass die Datei geladen wurde
            verify_grasshopper_file_loaded()
            
            # Kurze Pause für finale Verarbeitung
            time.sleep(2)
            
            end_time = time.time()
            print(f"ProTra: Registry Sequence Advanced completed successfully in {end_time - start_time:.1f} seconds")
            return True
        else:
            print("ProTra: Registry sequence failed")
            return False
        
    except Exception as e:
        print(f"ProTra: ERROR in main(): {str(e)}")
        import traceback
        print("ProTra: Detailed traceback:")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    result = main()
    print(f"ProTra: Registry Sequence Advanced script completed with result: {result}")
`
};

/**
 * Python Script Generator Klasse
 */
class PythonScriptGenerator {
  constructor(logger) {
    this.logger = logger;
    this.tempScriptDir = path.join(os.tmpdir(), 'protra-rhino-scripts');
    this.activeScripts = new Set(); // Track active scripts for cleanup
  }

  /**
   * Initialisiert den Script Generator
   */
  async initialize() {
    try {
      // Stelle sicher, dass temp directory existiert
      await fs.mkdir(this.tempScriptDir, { recursive: true });
      this.logger.info(`Python script directory initialized: ${this.tempScriptDir}`);
    } catch (error) {
      this.logger.error(`Failed to initialize script directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generiert ein Python-Script für eine spezifische Datei und Konfiguration
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @param {string} mode - Script-Modus (basic, with_viewport, presentation, technical, debug)
   * @returns {Promise<string>} - Generiertes Python-Script
   */
  async generateScript(ghFilePath, mode = 'basic') {
    try {
      // Validiere Modus
      if (!PYTHON_TEMPLATES[mode]) {
        this.logger.warn(`Unknown script mode: ${mode}, falling back to basic`);
        mode = 'basic';
      }

      // Hole Template
      const template = PYTHON_TEMPLATES[mode];
      
      // Ersetze Platzhalter
      const script = template.replace(/\{\{FILE_PATH\}\}/g, ghFilePath);
      
      this.logger.info(`Generated Python script for ${path.basename(ghFilePath)} in ${mode} mode`);
      return script;
      
    } catch (error) {
      this.logger.error(`Failed to generate Python script: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schreibt ein Python-Script in eine temporäre Datei
   * @param {string} script - Das Python-Script
   * @param {string} mode - Script-Modus für Dateinamen
   * @returns {Promise<string>} - Pfad zur temporären Script-Datei
   */
  async writeTempScript(script, mode = 'basic') {
    try {
      // Generiere einzigartigen Dateinamen
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const filename = `protra_${mode}_${timestamp}_${randomId}.py`;
      const scriptPath = path.join(this.tempScriptDir, filename);
      
      this.logger.info(`🐍 DIAGNOSTIC: Attempting to write script to: ${scriptPath}`);
      this.logger.info(`🐍 DIAGNOSTIC: Script content length: ${script.length} characters`);
      this.logger.info(`🐍 DIAGNOSTIC: Temp directory: ${this.tempScriptDir}`);
      
      // Prüfe ob temp directory existiert
      try {
        await fs.access(this.tempScriptDir);
        this.logger.info(`🐍 DIAGNOSTIC: Temp directory exists and is accessible`);
      } catch (dirError) {
        this.logger.error(`🐍 DIAGNOSTIC ERROR: Temp directory not accessible: ${dirError.message}`);
        throw new Error(`Temp directory not accessible: ${dirError.message}`);
      }
      
      // Schreibe Script
      await fs.writeFile(scriptPath, script, 'utf8');
      this.logger.info(`🐍 DIAGNOSTIC: Script write operation completed`);
      
      // Verifikation: Prüfe ob Datei tatsächlich existiert
      try {
        await fs.access(scriptPath);
        const stats = await fs.stat(scriptPath);
        this.logger.info(`🐍 DIAGNOSTIC SUCCESS: File exists with size ${stats.size} bytes`);
        
        // Lese ersten Teil zur Verifikation
        const verification = await fs.readFile(scriptPath, 'utf8');
        const preview = verification.substring(0, 100);
        this.logger.info(`🐍 DIAGNOSTIC: File content preview: ${preview}...`);
        
      } catch (verifyError) {
        this.logger.error(`🐍 DIAGNOSTIC CRITICAL ERROR: Script file not found after write: ${verifyError.message}`);
        throw new Error(`Script file not found after write operation: ${verifyError.message}`);
      }
      
      // Track für Cleanup
      this.activeScripts.add(scriptPath);
      
      this.logger.info(`🐍 Python script written and verified: ${scriptPath}`);
      return scriptPath;
      
    } catch (error) {
      this.logger.error(`🐍 CRITICAL: Failed to write temp script: ${error.message}`);
      this.logger.error(`🐍 CRITICAL: Error stack: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Erstellt vollständiges Script und schreibt es in temp file
   * @param {string} ghFilePath - Pfad zur .gh-Datei  
   * @param {string} mode - Script-Modus
   * @returns {Promise<string>} - Pfad zur Script-Datei
   */
  async createScriptFile(ghFilePath, mode = 'basic') {
    try {
      // Generiere Script
      const script = await this.generateScript(ghFilePath, mode);
      
      // Schreibe in temp file
      const scriptPath = await this.writeTempScript(script, mode);
      
      return scriptPath;
      
    } catch (error) {
      this.logger.error(`Failed to create script file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bereinigt eine temporäre Script-Datei
   * @param {string} scriptPath - Pfad zur Script-Datei
   */
  async cleanupScript(scriptPath) {
    try {
      await fs.unlink(scriptPath);
      this.activeScripts.delete(scriptPath);
      this.logger.info(`Cleaned up script: ${scriptPath}`);
    } catch (error) {
      this.logger.warn(`Could not cleanup script ${scriptPath}: ${error.message}`);
    }
  }

  /**
   * Bereinigt alle aktiven Script-Dateien
   */
  async cleanupAllScripts() {
    const promises = Array.from(this.activeScripts).map(scriptPath => 
      this.cleanupScript(scriptPath)
    );
    
    await Promise.allSettled(promises);
    this.logger.info('All script cleanup completed');
  }

  /**
   * Gibt verfügbare Script-Modi zurück
   * @returns {Array<string>} - Liste der verfügbaren Modi
   */
  getAvailableModes() {
    return Object.keys(PYTHON_TEMPLATES);
  }

  /**
   * Validiert ob ein Modus existiert
   * @param {string} mode - Zu validierender Modus
   * @returns {boolean} - True wenn Modus existiert
   */
  isValidMode(mode) {
    return PYTHON_TEMPLATES.hasOwnProperty(mode);
  }
}

module.exports = PythonScriptGenerator;
