/**
 * Script zum Erstellen der Icon-Dateien aus dem vorhandenen rhino_tray.png
 * Erzeugt valides ICNS (macOS), ICO (Windows), und zusätzliche PNG-Varianten
 */

const fs = require('fs');
const path = require('path');
const png2icons = require('png2icons');

/**
 * Icons aus rhino_tray.png erstellen
 */
function createIcons() {
  const assetsDir = path.join(__dirname, 'assets');
  const sourcePng = path.join(assetsDir, 'rhino_tray.png');

  console.log('Erstelle Icons fuer ProTra Helper-App...');

  if (!fs.existsSync(sourcePng)) {
    console.error('Quell-Icon nicht gefunden: ' + sourcePng);
    process.exit(1);
  }

  const sourceBuffer = fs.readFileSync(sourcePng);

  try {
    // macOS ICNS - valides Format via png2icons
    const icnsBuffer = png2icons.createICNS(sourceBuffer, png2icons.BILINEAR, 0);
    if (icnsBuffer) {
      fs.writeFileSync(path.join(assetsDir, 'icon.icns'), icnsBuffer);
      console.log('macOS Icon erstellt: icon.icns (' + icnsBuffer.length + ' bytes)');
    } else {
      console.error('ICNS-Erstellung fehlgeschlagen');
      process.exit(1);
    }

    // Windows ICO - valides Format via png2icons
    const icoBuffer = png2icons.createICO(sourceBuffer, png2icons.BILINEAR, 0, true);
    if (icoBuffer) {
      fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);
      console.log('Windows Icon erstellt: icon.ico (' + icoBuffer.length + ' bytes)');

      // Tray-ICO fuer Windows (tray.js sucht nach rhino_tray.ico)
      fs.writeFileSync(path.join(assetsDir, 'rhino_tray.ico'), icoBuffer);
      console.log('Windows Tray-Icon erstellt: rhino_tray.ico (' + icoBuffer.length + ' bytes)');
    } else {
      console.error('ICO-Erstellung fehlgeschlagen');
      process.exit(1);
    }

    // Linux PNG (Kopie des Source-Icons)
    fs.copyFileSync(sourcePng, path.join(assetsDir, 'icon.png'));
    console.log('Linux Icon erstellt: icon.png');

    // Fehlende Icons: icon-error.png und icon-fallback.png (Kopie von rhino_tray.png als Basis)
    fs.copyFileSync(sourcePng, path.join(assetsDir, 'icon-error.png'));
    console.log('Error-Icon erstellt: icon-error.png');

    fs.copyFileSync(sourcePng, path.join(assetsDir, 'icon-fallback.png'));
    console.log('Fallback-Icon erstellt: icon-fallback.png');

    // macOS Template-Icon: rhino_trayTemplate.png
    // Electron erkennt das 'Template'-Suffix automatisch fuer Dark/Light-Mode
    fs.copyFileSync(sourcePng, path.join(assetsDir, 'rhino_trayTemplate.png'));
    console.log('macOS Template-Icon erstellt: rhino_trayTemplate.png');

    // macOS Template-Icon @2x fuer Retina-Displays
    fs.copyFileSync(sourcePng, path.join(assetsDir, 'rhino_trayTemplate@2x.png'));
    console.log('macOS Template-Icon @2x erstellt: rhino_trayTemplate@2x.png');

    console.log('\nAlle Icons wurden erfolgreich erstellt!');
    console.log('Tipp: Ersetze icon-error.png spaeter durch ein rotes/oranges Varianten-Icon.');

  } catch (error) {
    console.error('Fehler beim Erstellen der Icons:', error.message);
    process.exit(1);
  }
}

// Script ausfuehren wenn direkt aufgerufen
if (require.main === module) {
  createIcons();
}

module.exports = { createIcons };
