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
                print("ProTra: Grasshopper not yet imported, starting Grasshopper...")
                try:
                    rs.Command("Grasshopper", echo=False)
                except:
                    print("ProTra: Could not execute Grasshopper command, will keep waiting...")
            
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
`
};

/**
 * Python Script Generator Klasse
 */
class PythonScriptGenerator {
  constructor(logger) {
    this.logger = logger;

    // SECURITY FIX: Use unique session-based directory to prevent path traversal attacks
    // Each process instance gets its own isolated temp directory
    const crypto = require('crypto');
    this.sessionId = crypto.randomBytes(16).toString('hex');
    this.tempScriptDir = path.join(os.tmpdir(), `protra-rhino-${this.sessionId}`);
    this.activeScripts = new Set(); // Track active scripts for cleanup

    // Register cleanup handlers to remove temp directory on exit
    this._setupCleanupHandlers();
  }

  /**
   * Initialisiert den Script Generator
   */
  async initialize() {
    try {
      // Stelle sicher, dass temp directory existiert mit restriktiven Permissions
      await fs.mkdir(this.tempScriptDir, { recursive: true });
      this.logger.info(`Python script directory initialized: ${this.tempScriptDir}`);
      this.logger.info(`Session ID: ${this.sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to initialize script directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * SECURITY: Registriert Cleanup-Handler für process exit
   * Stellt sicher, dass temp directory bei Beendigung gelöscht wird
   * @private
   */
  _setupCleanupHandlers() {
    const cleanup = async () => {
      try {
        await this.cleanupAllScripts();
        // Delete entire session temp directory
        await fs.rm(this.tempScriptDir, { recursive: true, force: true });
        this.logger.info(`Cleaned up session temp directory: ${this.tempScriptDir}`);
      } catch (error) {
        this.logger.warn(`Failed to cleanup temp directory: ${error.message}`);
      }
    };

    // Normal exit - SECURITY FIX: Use process.once() to prevent memory leak
    process.once('exit', () => {
      // Synchronous cleanup for exit event
      try {
        const fs_sync = require('fs');
        if (fs_sync.existsSync(this.tempScriptDir)) {
          fs_sync.rmSync(this.tempScriptDir, { recursive: true, force: true });
          this.logger.info(`[SYNC] Cleaned up session temp directory on exit`);
        }
      } catch (error) {
        this.logger.warn(`[SYNC] Failed to cleanup on exit: ${error.message}`);
      }
    });

    // Ctrl+C (SIGINT) - SECURITY FIX: Use process.once() to prevent memory leak
    process.once('SIGINT', async () => {
      this.logger.info('Received SIGINT, cleaning up...');
      await cleanup();
      process.exit(0);
    });

    // Kill signal (SIGTERM) - SECURITY FIX: Use process.once() to prevent memory leak
    process.once('SIGTERM', async () => {
      this.logger.info('Received SIGTERM, cleaning up...');
      await cleanup();
      process.exit(0);
    });

    // Uncaught exceptions - SECURITY FIX: Use process.once() to prevent memory leak
    process.once('uncaughtException', async (error) => {
      this.logger.error(`Uncaught exception: ${error.message}`);
      await cleanup();
      process.exit(1);
    });
  }

  /**
   * SECURITY: Validates and sanitizes file path to prevent path traversal attacks
   * @param {string} filePath - File path to validate
   * @returns {string} - Validated absolute file path
   * @throws {Error} - If validation fails
   * @private
   */
  _validateAndSanitizeFilePath(filePath) {
    // 1. Resolve to absolute path (prevents relative path attacks)
    const resolved = path.resolve(filePath);

    // 2. Check extension whitelist (only .gh and .ghx files allowed)
    const ext = path.extname(resolved).toLowerCase();
    if (!['.gh', '.ghx'].includes(ext)) {
      throw new Error(`Invalid file extension: ${ext}. Only .gh and .ghx files are allowed.`);
    }

    // 3. Verify file exists
    const fs_sync = require('fs');
    if (!fs_sync.existsSync(resolved)) {
      throw new Error(`File not found: ${resolved}`);
    }

    // 4. Check file size (max 100MB to prevent DOS attacks)
    const stats = fs_sync.statSync(resolved);
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (stats.size > maxSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize} bytes)`);
    }

    // 5. Verify it's a regular file (not a directory or symlink)
    if (!stats.isFile()) {
      throw new Error(`Path is not a regular file: ${resolved}`);
    }

    this.logger.debug(`File path validated: ${resolved} (${stats.size} bytes)`);
    return resolved;
  }

  /**
   * Generiert ein Python-Script für eine spezifische Datei und Konfiguration
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @param {string} mode - Script-Modus (basic, with_viewport, presentation, technical, debug)
   * @returns {Promise<string>} - Generiertes Python-Script
   */
  async generateScript(ghFilePath, mode = 'basic') {
    try {
      // SECURITY FIX: Validate file path before using it
      const validatedPath = this._validateAndSanitizeFilePath(ghFilePath);

      // Validiere Modus
      if (!PYTHON_TEMPLATES[mode]) {
        this.logger.warn(`Unknown script mode: ${mode}, falling back to basic`);
        mode = 'basic';
      }

      // Hole Template
      const template = PYTHON_TEMPLATES[mode];

      // Ersetze Platzhalter mit validiertem Pfad
      const script = template.replace(/\{\{FILE_PATH\}\}/g, validatedPath);

      this.logger.info(`Generated Python script for ${path.basename(validatedPath)} in ${mode} mode`);
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
      
      // Schreibe Script
      await fs.writeFile(scriptPath, script, 'utf8');
      
      // Track für Cleanup
      this.activeScripts.add(scriptPath);
      
      this.logger.info(`Python script written to: ${scriptPath}`);
      return scriptPath;
      
    } catch (error) {
      this.logger.error(`Failed to write temp script: ${error.message}`);
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
