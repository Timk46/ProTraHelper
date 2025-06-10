/**
 * Script zum Erstellen der fehlenden Icon-Dateien aus dem vorhandenen rhino_tray.png
 * Erstellt Placeholder-Icons bis echte Icons verfügbar sind
 */

const fs = require('fs');
const path = require('path');

// SVG-Template für Icon-Generierung (als Placeholder)
const createSvgIcon = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2E7D32"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-size="${size/4}" fill="white" font-weight="bold">
    ProTra
  </text>
  <circle cx="${size*0.8}" cy="${size*0.2}" r="${size*0.1}" fill="#4CAF50"/>
</svg>
`;

// ICO-Placeholder für Windows (Base64-encoded minimal ICO)
const createIcoPlaceholder = () => {
  return Buffer.from('AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAA////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////ADE+VcAxPlXAMT5VwDE+VcAxPlXAMT5VwDE+VcAxPlXAMT5VwDE+VcD///8A////AP///wD///8A////ADE+VcD///8A////AP///wD///8A////AP///wD///8A////AP///wAxPlXA////AP///wD///8A////ADE+VcD///8A6urq/+rq6v/q6ur/6urq/+rq6v/q6ur/6urq/+rq6v////8AMT5VwP///wD///8A////ADE+VcD///8A6urq//////////////////////////////////////+GhoyAhoaM/////wAxPlXA////AP///wD///8AMT5VwP///wDq6ur//////////////////////////////+jo6P9mZmb/ZmZm/////wAxPlXA////AP///wD///8AMT5VwP///wDq6ur//////////////////////////////3d3d/8AAAD/AAAA/////wAxPlXA////AP///wD///8AMT5VwP///wDq6ur//////////////////////////////3Z2dv8AAAD/AAAA/////wAxPlXA////AP///wD///8AMT5VwP///wDq6ur//////////////////////////////+Li4v9TU1P/U1NT/////wAxPlXA////AP///wD///8AMT5VwP///wDq6ur/////////////////////////////////29vb/9vb2//////AMT5VwP///wD///8A////ADE+VcD///8A6urq/////////////////////////////////+rq6v/q6ur/////ADE+VcD///8A////AP///wAxPlXA////AP///wD///8A////AP///wD///8A////AP///wD///8AMT5VwP///wD///8A////ADE+VcAxPlXAMT5VwDE+VcAxPlXAMT5VwDE+VcAxPlXAMT5VwDE+VcAxPlXA////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==', 'base64');
};

// ICNS-Placeholder für macOS (Base64-encoded minimal ICNS)
const createIcnsPlaceholder = () => {
  return Buffer.from('aWNucwAAAAAAAAAbAQAAaWNzOAAAABsAAAABACJlbmRz', 'base64');
};

// PNG-Icon für Linux erstellen (minimal PNG)
const createPngIcon = (size) => {
  // Minimal 1x1 PNG als Placeholder
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
};

/**
 * Icons erstellen
 */
function createIcons() {
  const assetsDir = path.join(__dirname, 'assets');
  
  console.log('🎨 Erstelle Placeholder-Icons für ProTra Helper-App...');

  try {
    // Windows ICO
    const icoPath = path.join(assetsDir, 'icon.ico');
    fs.writeFileSync(icoPath, createIcoPlaceholder());
    console.log('✅ Windows Icon erstellt: icon.ico');

    // macOS ICNS
    const icnsPath = path.join(assetsDir, 'icon.icns');
    fs.writeFileSync(icnsPath, createIcnsPlaceholder());
    console.log('✅ macOS Icon erstellt: icon.icns');

    // Linux PNG (verschiedene Größen)
    const pngPath = path.join(assetsDir, 'icon.png');
    fs.writeFileSync(pngPath, createPngIcon(512));
    console.log('✅ Linux Icon erstellt: icon.png');

    // SVG-Version für Entwicklung
    const svgPath = path.join(assetsDir, 'icon.svg');
    fs.writeFileSync(svgPath, createSvgIcon(512));
    console.log('✅ SVG Icon erstellt: icon.svg');

    console.log('\n🎉 Alle Placeholder-Icons wurden erfolgreich erstellt!');
    console.log('💡 Tipp: Ersetze diese später durch professionelle Icons.');

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Icons:', error.message);
    process.exit(1);
  }
}

// Script ausführen wenn direkt aufgerufen
if (require.main === module) {
  createIcons();
}

module.exports = { createIcons };
