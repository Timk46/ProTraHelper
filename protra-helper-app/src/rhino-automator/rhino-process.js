const fs = require('node:fs').promises; // Promises API für fs
const fsSync = require('node:fs'); // Sync API für schnelle Checks
const path = require('node:path');
const { spawn } = require('node:child_process');

class RhinoProcess {
  constructor(logger, tempDir) {
    this.logger = logger;
    this.tempDir = tempDir; // z.B. app.getPath('temp')
    this.scriptTemplatePath = path.join(__dirname, 'rhino_start_script.py.template');
    this.activeRhinoProcess = null;
  }

  async _generateScript(ghFilePath) {
    try {
      const templateContent = await fs.readFile(this.scriptTemplatePath, 'utf-8');
      const scriptContent = templateContent.replace(
        '%%GH_FILE_PATH%%',
        ghFilePath.replace(/\\/g, '/') // Ersetze Backslashes durch Slashes für Python String Literal
      );
      
      // Eindeutigen Namen für die temporäre Skriptdatei generieren
      const timestamp = new Date().getTime();
      const tempScriptName = `protra_gh_script_${timestamp}.py`;
      const tempScriptPath = path.join(this.tempDir, tempScriptName);

      await fs.writeFile(tempScriptPath, scriptContent, 'utf-8');
      this.logger.info(`Temporäres Rhino-Python-Skript erfolgreich generiert: ${tempScriptPath}`);
      return tempScriptPath;
    } catch (error) {
      this.logger.error('Fehler beim Generieren des temporären Python-Skripts:', error);
      throw error; // Fehler weitergeben, damit er im aufrufenden Kontext behandelt wird
    }
  }

  async _cleanupScript(scriptPath) {
    if (!scriptPath) return;
    try {
      await fs.unlink(scriptPath);
      this.logger.info(`Temporäres Python-Skript erfolgreich gelöscht: ${scriptPath}`);
    } catch (error) {
      // Logge nur einen Fehler, wenn die Datei noch existiert (um race conditions beim Löschen zu vermeiden)
      if (fsSync.existsSync(scriptPath)) {
        this.logger.error(`Fehler beim Löschen des temporären Python-Skripts ${scriptPath}:`, error);
      }
    }
  }

  // Hauptmethode zum Starten von Rhino
  async launchRhinoWithGrasshopper(rhinoExecutablePath, ghFilePath) {
    if (this.activeRhinoProcess) {
        this.logger.warn('Ein Rhino-Prozess wird bereits ausgeführt oder wurde nicht korrekt beendet. Neuer Startversuch wird abgelehnt oder alter Prozess terminiert.');
        // Optional: Alten Prozess versuchen zu beenden
        // this.activeRhinoProcess.kill(); 
        // return { success: false, message: 'Ein anderer Rhino-Prozess ist bereits aktiv.' };
    }

    let tempScriptPath = null;
    try {
      tempScriptPath = await this._generateScript(ghFilePath);

      const rhinoArgs = [
        '/nosplash', // Rhino ohne Splash-Screen starten
        `/runscript="-${tempScriptPath}"`, // Skript ausführen, '-' vor dem Pfad kann Befehlsdialoge im Skript unterdrücken
      ];
      
      this.logger.info(`Starte Rhino: "${rhinoExecutablePath}" mit Argumenten: ${rhinoArgs.join(' ')}`);

      // child_process.spawn
      // detached: true und stdio: 'ignore' kann helfen, den Prozess unabhängig von der Helfer-App laufen zu lassen,
      // aber dann verlieren wir stdout/stderr. Für Debugging ist es besser, dies zu empfangen.
      const rhinoProcess = spawn(rhinoExecutablePath, rhinoArgs, {
        detached: false, // Prozess läuft nicht weiter, wenn Elternprozess beendet wird
        stdio: ['ignore', 'pipe', 'pipe'], // stdin ignorieren, stdout und stderr auffangen
        windowsHide: false, // Rhino-Fenster nicht verstecken (kann für Debugging nützlich sein, es zu sehen)
      });
      this.activeRhinoProcess = rhinoProcess;

      // Buffer für stdout und stderr Ausgaben
      let scriptOutput = '';
      let scriptErrorOutput = '';

      rhinoProcess.stdout.on('data', (data) => {
        const output = data.toString();
        scriptOutput += output;
        this.logger.info(`[Rhino stdout]: ${output.trim()}`);
      });

      rhinoProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        scriptErrorOutput += errorOutput;
        this.logger.error(`[Rhino stderr]: ${errorOutput.trim()}`);
      });

      return new Promise((resolve, reject) => {
        rhinoProcess.on('close', (code) => {
          this.logger.info(`Rhino-Prozess beendet mit Code: ${code}.`);
          this.activeRhinoProcess = null;
          this._cleanupScript(tempScriptPath); // Skript nach Beendigung des Prozesses aufräumen

          if (code === 0) {
            if (scriptErrorOutput.includes('[RhinoScript ERROR]') || scriptOutput.toLowerCase().includes('fehler')) {
                 this.logger.warn(`Rhino-Prozess mit Code 0 beendet, aber Fehler im Skript-Output gefunden. Output: ${scriptOutput}, Error: ${scriptErrorOutput}`);
                 resolve({ success: true, message: `Rhino gestartet, aber mögliche Fehler im Skript: ${scriptErrorOutput || scriptOutput}`.substring(0,500) });
            } else {
                resolve({ success: true, message: 'Rhino-Prozess erfolgreich gestartet und Skript ausgeführt.' });
            }
          } else {
            this.logger.error(`Rhino-Prozess mit Fehlercode ${code} beendet. Output: ${scriptOutput}, Error: ${scriptErrorOutput}`);
            resolve({ success: false, message: `Rhino-Prozess mit Fehlercode ${code} beendet. ${scriptErrorOutput || scriptOutput}`.substring(0,500) });
          }
        });

        rhinoProcess.on('error', (err) => {
          this.logger.error('Fehler beim Starten des Rhino-Prozesses (spawn error):', err);
          this.activeRhinoProcess = null;
          this._cleanupScript(tempScriptPath); // Auch hier aufräumen
          reject({ success: false, message: `Fehler beim Starten von Rhino: ${err.message}` });
        });

        // Ein Timeout, falls Rhino startet, aber das Skript hängt und der Prozess sich nie beendet.
        // Dies ist eine zusätzliche Sicherheitsmaßnahme.
        // setTimeout(() => {
        //     if (this.activeRhinoProcess && !this.activeRhinoProcess.killed) {
        //         this.logger.warn('Timeout beim Warten auf Rhino-Prozess. Versuche ihn zu beenden.');
        //         this.activeRhinoProcess.kill('SIGTERM'); // Versuche sanftes Beenden
        //         // Nach einer weiteren kurzen Verzögerung SIGKILL, falls immer noch aktiv
        //         setTimeout(() => {
        //             if (this.activeRhinoProcess && !this.activeRhinoProcess.killed) {
        //                 this.activeRhinoProcess.kill('SIGKILL');
        //             }
        //         }, 2000);
        //         reject({ success: false, message: 'Timeout beim Warten auf den Rhino-Prozess.' });
        //     }
        // }, 120000); // z.B. 2 Minuten Timeout

      });

    } catch (error) {
      this.logger.error('Unerwarteter Fehler in launchRhinoWithGrasshopper:', error);
      if (tempScriptPath) {
        await this._cleanupScript(tempScriptPath); // Sicherstellen, dass das Skript auch bei vorherigen Fehlern gelöscht wird
      }
      // Den Fehler an den Aufrufer (Express-Route) weitergeben, damit dieser einen 500er senden kann
      throw error;
    }
  }
}

module.exports = RhinoProcess; 