const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const BUNDLE_ID = 'com.hefl.protra.helperapp';

class MacOSSetup {
  /**
   * @param {object} logger - Logger-Instanz (electron-log kompatibel)
   */
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Erstellt/aktualisiert LaunchAgent-Plist fuer Auto-Start bei Login.
   * Idempotent - sicher bei jedem App-Start aufzurufen.
   * @param {string} appPath - Pfad zum .app Bundle
   */
  ensureLaunchAgent(appPath) {
    if (process.platform !== 'darwin') return;

    // Nur wenn App korrekt in /Applications installiert ist
    // (verhindert fehlerhafte Plist bei macOS App Translocation)
    if (!appPath.startsWith('/Applications/')) {
      this.logger.warn(`App nicht in /Applications (${appPath}), ueberspringe LaunchAgent.`);
      return;
    }

    const launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
    const plistPath = path.join(launchAgentsDir, `${BUNDLE_ID}.plist`);

    if (!fs.existsSync(launchAgentsDir)) {
      fs.mkdirSync(launchAgentsDir, { recursive: true });
    }

    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${BUNDLE_ID}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/open</string>
        <string>-a</string>
        <string>${appPath}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>
`;

    // Nur schreiben wenn noetig (Content-Vergleich)
    const needsWrite = !fs.existsSync(plistPath) ||
      fs.readFileSync(plistPath, 'utf8') !== plistContent;

    if (needsWrite) {
      fs.writeFileSync(plistPath, plistContent, 'utf8');
      this.logger.info(`LaunchAgent geschrieben: ${plistPath}`);
      try {
        execSync(`launchctl load "${plistPath}" 2>/dev/null`, { stdio: 'ignore' });
        this.logger.info('LaunchAgent geladen.');
      } catch {
        // Nicht kritisch - laedt beim naechsten Login
        this.logger.info('LaunchAgent konnte nicht sofort geladen werden (laedt beim naechsten Login).');
      }
    } else {
      this.logger.info('LaunchAgent ist aktuell, kein Update noetig.');
    }
  }

  /**
   * Loest den .app Bundle-Pfad aus process.execPath.
   * @returns {string|null} Pfad zum .app Bundle oder null im Development-Mode
   */
  getAppBundlePath() {
    if (process.platform !== 'darwin') return null;
    const match = process.execPath.match(/^(.+\.app)\//);
    return match ? match[1] : null;
  }
}

module.exports = MacOSSetup;
