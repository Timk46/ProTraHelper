/**
 * Rhino Command Configuration
 * 
 * Definiert benutzerdefinierte Rhino-Befehle für spezifische .gh-Dateien
 * Diese Konfiguration ist nur serverseitig verfügbar und kann nicht von Benutzern geändert werden.
 */

/**
 * Befehlsvorlagen für Rhino/Grasshopper
 * 
 * PHASE 1: Python Script Integration (EMPFOHLEN - löst /runscript Probleme)
 * LEGACY: CLI-basierte Befehle (problematisch, aber als Fallback verfügbar)
 */
const COMMAND_TEMPLATES = {
  // === PHASE 2: COM Automation (EMPFOHLEN - löst /runscript Probleme definitiv) ===
  
  // COM-basierte Modi - verwenden direkte COM-Interface Kommunikation
  com_basic: "COM:basic",                          // COM: Nur Datei laden
  com_viewport: "COM:with_viewport",               // COM: Mit Viewport-Maximierung  
  com_presentation: "COM:presentation",            // COM: Präsentationsmodus
  com_technical: "COM:technical",                  // COM: Technische Ansicht
  com_registry_sequence: "COM:registry_sequence",  // COM: Original Registry-Befehlssequenz mit B D W L W H D O
  
  // === PHASE 1: Python Script Integration (Fallback) ===
  
  // Python-basierte Modi - verwenden Rhino's native Python-Engine
  python_basic: "PYTHON:basic",                    // Nur Datei laden
  python_viewport: "PYTHON:with_viewport",         // Mit Viewport-Maximierung  
  python_presentation: "PYTHON:presentation",      // Präsentationsmodus
  python_technical: "PYTHON:technical",            // Technische Ansicht
  python_debug: "PYTHON:debug",                    // Debug-Modus
  
  // === LEGACY: CLI-basierte Befehle (Fallback) ===
  
  // Option A - Korrigierte /runscript Syntax (CLI-kompatibel, aber limitiert)
  corrected_basic: "_-Grasshopper _DocumentOpen \"{filePath}\" _Enter",
  corrected_with_viewport: "_-Grasshopper _DocumentOpen \"{filePath}\" _Enter _MaxViewport _Enter",
  corrected_separated: "_-Grasshopper _DocumentOpen \"{filePath}\" _Enter",
  
  // Ursprünglicher Registry-Befehl (PROBLEMATISCH - B D W L W H D O sind nicht CLI-kompatibel)
  original_registry_broken: "_-Grasshopper B D W L W H D O {filePath} W H _MaxViewport _Enter",
  
  // Standard-Befehl (bewährt, aber limitiert)
  standard: "_-Grasshopper _DocumentOpen \"{filePath}\" _Enter",
  
  // Einfache CLI-Varianten
  minimized: "_-Grasshopper _DocumentOpen \"{filePath}\" _Enter",
  fullscreen: "_-Grasshopper _DocumentOpen \"{filePath}\" _Enter _MaxViewport _Enter",
  perspective: "_-Grasshopper _DocumentOpen \"{filePath}\" _Enter",
  technical: "_-Grasshopper _DocumentOpen \"{filePath}\" _Enter",
  presentation: "_-Grasshopper _DocumentOpen \"{filePath}\" _Enter",
  debug: "_-Grasshopper _DocumentOpen \"{filePath}\" _Enter",
  
  // Test-Befehle für Debugging
  test_simple: "_-Grasshopper _Enter",
  test_complex: "_-Grasshopper _DocumentOpen \"{filePath}\" _Enter _MaxViewport _Enter"
};

/**
 * File-spezifisches Command Mapping
 * 
 * Definiert, welche .gh-Datei welchen Befehl verwenden soll.
 * Key: Dateiname (ohne Pfad) oder Dateiname-Pattern
 * Value: Template-Name oder benutzerdefinierter Befehl
 */
const FILE_COMMAND_MAPPING = {
  // === PHASE 2: COM Automation Tests (löst /runscript Probleme definitiv) ===
  
  // Haupttests mit COM-Integration (löst Timing-Probleme)
  'example.gh': 'com_registry_sequence',      // COM: Original Registry-Befehlssequenz mit B D W L W H D O
  'example_viewport.gh': 'com_viewport',      // COM: Mit Viewport-Maximierung
  'example_presentation.gh': 'com_presentation',  // COM: Präsentationsmodus
  'example_technical.gh': 'com_technical',    // COM: Technische Ansicht
  
  // Fallback Python-Tests
  'example_python.gh': 'python_basic',        // Python: Nur Datei laden (Fallback)
  'example_debug.gh': 'python_debug',         // Python: Debug-Modus
  
  // Vergleichstests (CLI-basiert, problematisch)
  'example_cli.gh': 'corrected_basic',        // CLI: Basis-Funktionalität
  'example_broken.gh': 'original_registry_broken',  // CLI: Alter problematischer Befehl
  
  // === Produktive Konfiguration ===
  
  // Pattern-basierte Python-Zuordnungen (empfohlener Ansatz)
  'presentation_*': 'python_presentation',    // Python: Präsentations-Dateien
  'cad_*': 'python_technical',               // Python: CAD-Dateien
  'workshop_*': 'python_viewport',           // Python: Workshop-Dateien
  'demo_*': 'python_presentation',           // Python: Demo-Dateien
  '*render*': 'python_presentation',         // Python: Rendering-Dateien
  
  // Fallback-Modi (CLI-basiert als Backup)
  'demo.gh': 'fullscreen',                   // CLI: Legacy fullscreen
  'tutorial.gh': 'standard',                 // CLI: Legacy standard
  'test.gh': 'test_simple',                  // CLI: Legacy simple test
  
  // Fallback für alle anderen Dateien (COM Automation als Standard - zuverlässiger auf Remote Clients)
  '*': 'com_basic'
};

/**
 * Erweiterte Konfigurationsoptionen
 */
const RHINO_CONFIG = {
  // Timeout für Rhino-Start (Millisekunden)
  launchTimeout: 30000,
  
  // Maximale Anzahl paralleler Rhino-Instanzen
  maxInstances: 5,
  
  // Debug-Modus aktivieren
  debugMode: false,
  
  // Custom Environment Variables für Rhino
  environmentVars: {
    'RHINO_NO_CRASH_DIALOG': '1',
    'RHINO_DISABLE_UPDATE_CHECK': '1'
  }
};

class RhinoCommandConfig {
  /**
   * Ermittelt den passenden Befehl für eine .gh-Datei
   * @param {string} ghFilePath - Vollständiger Pfad zur .gh-Datei
   * @returns {string} - Der zu verwendende Rhino-Befehl
   */
  static getCommandForFile(ghFilePath) {
    const fileName = this._getFileName(ghFilePath);
    
    // Prüfe exakte Dateiname-Matches
    if (FILE_COMMAND_MAPPING[fileName]) {
      return this._resolveCommand(FILE_COMMAND_MAPPING[fileName], ghFilePath);
    }
    
    // Prüfe Pattern-Matches
    for (const [pattern, commandTemplate] of Object.entries(FILE_COMMAND_MAPPING)) {
      if (this._matchesPattern(fileName, pattern)) {
        return this._resolveCommand(commandTemplate, ghFilePath);
      }
    }
    
    // Fallback zum Standard-Befehl
    return this._resolveCommand('standard', ghFilePath);
  }
  
  /**
   * Extrahiert den Dateinamen aus dem vollständigen Pfad
   * @param {string} filePath - Vollständiger Dateipfad
   * @returns {string} - Nur der Dateiname
   */
  static _getFileName(filePath) {
    return filePath.split(/[/\\]/).pop();
  }
  
  /**
   * Prüft ob ein Dateiname einem Pattern entspricht
   * @param {string} fileName - Der zu prüfende Dateiname
   * @param {string} pattern - Das Pattern (mit * als Wildcard)
   * @returns {boolean} - True wenn Pattern matched
   */
  static _matchesPattern(fileName, pattern) {
    if (pattern === '*') return true;
    
    // Einfache Pattern-Matching-Logik
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(fileName);
  }
  
  /**
   * Löst einen Command-Template auf
   * @param {string} commandTemplate - Template-Name oder direkter Befehl
   * @param {string} ghFilePath - Pfad zur .gh-Datei
   * @returns {string} - Der finale Rhino-Befehl
   */
  static _resolveCommand(commandTemplate, ghFilePath) {
    // Prüfe ob es ein bekanntes Template ist
    if (COMMAND_TEMPLATES[commandTemplate]) {
      return COMMAND_TEMPLATES[commandTemplate].replace('{filePath}', ghFilePath);
    }
    
    // Wenn es kein Template ist, verwende es als direkten Befehl
    return commandTemplate.replace('{filePath}', ghFilePath);
  }
  
  /**
   * Gibt alle verfügbaren Templates zurück
   * @returns {Object} - Verfügbare Command-Templates
   */
  static getAvailableTemplates() {
    return { ...COMMAND_TEMPLATES };
  }
  
  /**
   * Gibt die aktuelle File-Command-Mapping zurück
   * @returns {Object} - Aktuelles Mapping
   */
  static getFileMapping() {
    return { ...FILE_COMMAND_MAPPING };
  }
  
  /**
   * Gibt die Rhino-Konfiguration zurück
   * @returns {Object} - Rhino-Konfiguration
   */
  static getRhinoConfig() {
    return { ...RHINO_CONFIG };
  }
  
  /**
   * Erweiterte Befehlsvalidierung
   * @param {string} command - Zu validierender Befehl
   * @returns {boolean} - True wenn Befehl sicher ist
   */
  static validateCommand(command) {
    // Blacklist gefährlicher Befehle
    const dangerousCommands = [
      'cmd', 'powershell', 'del', 'rm', 'format', 'shutdown',
      'reboot', 'taskkill', 'net', 'reg', 'sc', 'wmic'
    ];
    
    const lowerCommand = command.toLowerCase();
    return !dangerousCommands.some(dangerous => lowerCommand.includes(dangerous));
  }
}

module.exports = {
  RhinoCommandConfig,
  COMMAND_TEMPLATES,
  FILE_COMMAND_MAPPING,
  RHINO_CONFIG
};
