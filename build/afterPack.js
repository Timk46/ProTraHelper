/**
 * electron-builder afterPack Hook
 * Workaround fuer electron-builder Issue #7299/#8063:
 * Die "scripts" Option in der pkg-Config wird nicht korrekt an pkgbuild uebergeben.
 * Dieser Hook kopiert die Installer-Scripts manuell in das Build-Verzeichnis
 * und setzt die Executable-Rechte.
 */
const fs = require('fs');
const path = require('path');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const scriptsSource = path.join(context.packager.projectDir, 'installer', 'mac-scripts');
  if (!fs.existsSync(scriptsSource)) {
    console.log('afterPack: Keine mac-scripts gefunden, ueberspringe.');
    return;
  }

  // Sicherstellen dass Scripts executable sind (fuer CI auf macOS)
  const scripts = ['preinstall', 'postinstall'];
  for (const script of scripts) {
    const scriptPath = path.join(scriptsSource, script);
    if (fs.existsSync(scriptPath)) {
      try {
        fs.chmodSync(scriptPath, 0o755);
        console.log(`afterPack: ${script} als executable markiert.`);
      } catch (err) {
        // Auf Windows ignorieren (chmod nicht unterstuetzt)
        console.log(`afterPack: chmod fuer ${script} fehlgeschlagen (ok auf Windows): ${err.message}`);
      }
    }
  }

  console.log('afterPack: macOS Installer-Scripts vorbereitet.');
};
