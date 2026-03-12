/**
 * Script zum Erstellen der Icon-Dateien aus dem vorhandenen rhino_tray.png
 * Erzeugt valides ICNS (macOS), ICO (Windows), zusaetzliche PNG-Varianten,
 * DMG-Hintergrundbild (macOS) und NSIS-Installer-Bilder (Windows)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const png2icons = require('png2icons');

/**
 * Erstellt einen minimalen PNG-Buffer aus rohen RGBA-Pixeldaten
 * @param {number} width - Bildbreite
 * @param {number} height - Bildhoehe
 * @param {Buffer} rgbaData - RGBA-Pixeldaten (width * height * 4 bytes)
 * @returns {Buffer} PNG-Datei als Buffer
 */
function createPngBuffer(width, height, rgbaData) {
  // PNG raw data: filter byte (0 = None) prepended to each row
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // filter: None
    rgbaData.copy(rawData, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(rawData);

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createPngChunk('IHDR', ihdrData);

  // IDAT chunk
  const idat = createPngChunk('IDAT', compressed);

  // IEND chunk
  const iend = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

/**
 * Erstellt einen PNG-Chunk mit CRC
 * @param {string} type - Chunk-Typ (4 Zeichen)
 * @param {Buffer} data - Chunk-Daten
 * @returns {Buffer} Vollstaendiger Chunk
 */
function createPngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuffer, data]);

  // CRC32 berechnen
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < crcInput.length; i++) {
    crc ^= crcInput[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  crc = (crc ^ 0xFFFFFFFF) >>> 0;

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

/**
 * Setzt ein Pixel in einem RGBA-Buffer
 * @param {Buffer} buf - RGBA-Buffer
 * @param {number} width - Bildbreite
 * @param {number} x - X-Position
 * @param {number} y - Y-Position
 * @param {number} r - Rot (0-255)
 * @param {number} g - Gruen (0-255)
 * @param {number} b - Blau (0-255)
 * @param {number} a - Alpha (0-255)
 */
function setPixel(buf, width, x, y, r, g, b, a) {
  const offset = (y * width + x) * 4;
  buf[offset] = r;
  buf[offset + 1] = g;
  buf[offset + 2] = b;
  buf[offset + 3] = a;
}

/**
 * Fuellt ein Rechteck in einem RGBA-Buffer
 * @param {Buffer} buf - RGBA-Buffer
 * @param {number} imgWidth - Bildbreite
 * @param {number} imgHeight - Bildhoehe
 * @param {number} x - X-Position
 * @param {number} y - Y-Position
 * @param {number} w - Rechteckbreite
 * @param {number} h - Rechteckhoehe
 * @param {number} r - Rot
 * @param {number} g - Gruen
 * @param {number} b - Blau
 * @param {number} a - Alpha
 */
function fillRect(buf, imgWidth, imgHeight, x, y, w, h, r, g, b, a) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px >= 0 && px < imgWidth && py >= 0 && py < imgHeight) {
        setPixel(buf, imgWidth, px, py, r, g, b, a);
      }
    }
  }
}

// Simple 5x7 bitmap font for uppercase letters, digits, and common chars
const FONT_GLYPHS = {
  'A': ['01110','10001','10001','11111','10001','10001','10001'],
  'B': ['11110','10001','10001','11110','10001','10001','11110'],
  'C': ['01110','10001','10000','10000','10000','10001','01110'],
  'D': ['11100','10010','10001','10001','10001','10010','11100'],
  'E': ['11111','10000','10000','11110','10000','10000','11111'],
  'F': ['11111','10000','10000','11110','10000','10000','10000'],
  'G': ['01110','10001','10000','10111','10001','10001','01110'],
  'H': ['10001','10001','10001','11111','10001','10001','10001'],
  'I': ['01110','00100','00100','00100','00100','00100','01110'],
  'K': ['10001','10010','10100','11000','10100','10010','10001'],
  'L': ['10000','10000','10000','10000','10000','10000','11111'],
  'M': ['10001','11011','10101','10101','10001','10001','10001'],
  'N': ['10001','11001','10101','10011','10001','10001','10001'],
  'O': ['01110','10001','10001','10001','10001','10001','01110'],
  'P': ['11110','10001','10001','11110','10000','10000','10000'],
  'R': ['11110','10001','10001','11110','10100','10010','10001'],
  'S': ['01110','10001','10000','01110','00001','10001','01110'],
  'T': ['11111','00100','00100','00100','00100','00100','00100'],
  'U': ['10001','10001','10001','10001','10001','10001','01110'],
  'V': ['10001','10001','10001','10001','01010','01010','00100'],
  'W': ['10001','10001','10001','10101','10101','11011','10001'],
  'X': ['10001','10001','01010','00100','01010','10001','10001'],
  'Z': ['11111','00001','00010','00100','01000','10000','11111'],
  'a': ['00000','00000','01110','00001','01111','10001','01111'],
  'b': ['10000','10000','10110','11001','10001','10001','11110'],
  'c': ['00000','00000','01110','10000','10000','10001','01110'],
  'd': ['00001','00001','01101','10011','10001','10001','01111'],
  'e': ['00000','00000','01110','10001','11111','10000','01110'],
  'f': ['00110','01001','01000','11100','01000','01000','01000'],
  'g': ['00000','01111','10001','10001','01111','00001','01110'],
  'h': ['10000','10000','10110','11001','10001','10001','10001'],
  'i': ['00100','00000','01100','00100','00100','00100','01110'],
  'l': ['01100','00100','00100','00100','00100','00100','01110'],
  'n': ['00000','00000','10110','11001','10001','10001','10001'],
  'o': ['00000','00000','01110','10001','10001','10001','01110'],
  'r': ['00000','00000','10110','11001','10000','10000','10000'],
  's': ['00000','00000','01110','10000','01110','00001','11110'],
  't': ['01000','01000','11100','01000','01000','01001','00110'],
  'u': ['00000','00000','10001','10001','10001','10011','01101'],
  'z': ['00000','00000','11111','00010','00100','01000','11111'],
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'],
  '.': ['00000','00000','00000','00000','00000','01100','01100'],
  '/': ['00001','00010','00010','00100','01000','01000','10000'],
  ':': ['00000','01100','01100','00000','01100','01100','00000'],
};

/**
 * Zeichnet Text in einen RGBA-Buffer (5x7 Bitmap-Font, skaliert)
 * @param {Buffer} buf - RGBA-Buffer
 * @param {number} imgWidth - Bildbreite
 * @param {string} text - Zu zeichnender Text
 * @param {number} startX - X-Startposition
 * @param {number} startY - Y-Startposition
 * @param {number} scale - Skalierungsfaktor
 * @param {number} r - Rot
 * @param {number} g - Gruen
 * @param {number} b - Blau
 * @param {number} a - Alpha
 */
function drawText(buf, imgWidth, imgHeight, text, startX, startY, scale, r, g, b, a) {
  let cursorX = startX;
  for (let ci = 0; ci < text.length; ci++) {
    const ch = text[ci];
    const glyph = FONT_GLYPHS[ch];
    if (!glyph) {
      cursorX += 4 * scale; // unknown char = space
      continue;
    }
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (glyph[gy][gx] === '1') {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = cursorX + gx * scale + sx;
              const py = startY + gy * scale + sy;
              if (px >= 0 && px < imgWidth && py >= 0 && py < imgHeight) {
                setPixel(buf, imgWidth, px, py, r, g, b, a);
              }
            }
          }
        }
      }
    }
    cursorX += 6 * scale; // 5px glyph + 1px spacing, scaled
  }
}

/**
 * Berechnet die Breite eines Textes in Pixeln
 * @param {string} text - Text
 * @param {number} scale - Skalierungsfaktor
 * @returns {number} Breite in Pixeln
 */
function textWidth(text, scale) {
  return text.length * 6 * scale - scale; // subtract trailing spacing
}

/**
 * Zeichnet einen Pfeil (horizontal) in einen RGBA-Buffer
 * @param {Buffer} buf - RGBA-Buffer
 * @param {number} imgWidth - Bildbreite
 * @param {number} imgHeight - Bildhoehe
 * @param {number} x1 - Start-X
 * @param {number} y - Y-Position (Mitte)
 * @param {number} x2 - End-X
 * @param {number} thickness - Linienstaerke
 * @param {number} r - Rot
 * @param {number} g - Gruen
 * @param {number} b - Blau
 * @param {number} a - Alpha
 */
function drawArrow(buf, imgWidth, imgHeight, x1, y, x2, thickness, r, g, b, a) {
  const halfT = Math.floor(thickness / 2);
  // Shaft
  for (let x = x1; x <= x2; x++) {
    for (let dy = -halfT; dy <= halfT; dy++) {
      const py = y + dy;
      if (py >= 0 && py < imgHeight && x >= 0 && x < imgWidth) {
        setPixel(buf, imgWidth, x, py, r, g, b, a);
      }
    }
  }
  // Arrowhead
  const headSize = thickness * 4;
  for (let i = 0; i < headSize; i++) {
    for (let dy = -i; dy <= i; dy++) {
      const px = x2 - i;
      const py = y + dy;
      if (px >= 0 && px < imgWidth && py >= 0 && py < imgHeight) {
        setPixel(buf, imgWidth, px, py, r, g, b, a);
      }
    }
  }
}

/**
 * Erstellt das DMG-Hintergrundbild (540x380) fuer macOS
 * Zeigt App-Icon-Bereich links, Applications rechts, Pfeil dazwischen
 * @param {string} assetsDir - Pfad zum Assets-Verzeichnis
 */
function createDmgBackground(assetsDir) {
  const width = 540;
  const height = 380;
  const rgbaData = Buffer.alloc(width * height * 4);

  // Hintergrund: helles Grau-Gruen (#E8F5E9)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      setPixel(rgbaData, width, x, y, 232, 245, 233, 255);
    }
  }

  // Oberer gruener Balken
  fillRect(rgbaData, width, height, 0, 0, width, 50, 46, 125, 50, 255); // #2E7D32

  // Titel-Text im gruenen Balken
  const titleText = 'ProTra Helfer';
  const titleW = textWidth(titleText, 3);
  drawText(rgbaData, width, height, titleText, Math.floor((width - titleW) / 2), 12, 3, 255, 255, 255, 255);

  // Linke Zone: App-Icon-Platzhalter (bei x:130, y:220 - zentriert auf DMG-Contents-Position)
  // Kreis-aehnliches Quadrat mit abgerundeten Ecken simuliert
  fillRect(rgbaData, width, height, 100, 140, 60, 60, 46, 125, 50, 180); // gruenes Quadrat
  const appLabel = 'App';
  const appLabelW = textWidth(appLabel, 2);
  drawText(rgbaData, width, height, appLabel, 130 - Math.floor(appLabelW / 2), 210, 2, 80, 80, 80, 255);

  // Rechte Zone: Applications-Ordner-Platzhalter (bei x:410, y:220)
  fillRect(rgbaData, width, height, 380, 140, 60, 60, 33, 150, 243, 180); // blaues Quadrat (Ordner-Farbe)
  const appsLabel = 'Apps';
  const appsLabelW = textWidth(appsLabel, 2);
  drawText(rgbaData, width, height, appsLabel, 410 - Math.floor(appsLabelW / 2), 210, 2, 80, 80, 80, 255);

  // Pfeil zwischen App und Applications
  drawArrow(rgbaData, width, height, 185, 170, 355, 3, 46, 125, 50, 220);

  // Installations-Text unter dem Pfeil
  const instrText = 'Hierher ziehen';
  const instrW = textWidth(instrText, 2);
  drawText(rgbaData, width, height, instrText, Math.floor((width - instrW) / 2), 250, 2, 100, 100, 100, 255);

  const instrText2 = 'zum Installieren';
  const instrW2 = textWidth(instrText2, 2);
  drawText(rgbaData, width, height, instrText2, Math.floor((width - instrW2) / 2), 270, 2, 100, 100, 100, 255);

  // Unterer Hinweis-Text
  const hintText = 'hefl.de';
  const hintW = textWidth(hintText, 1);
  drawText(rgbaData, width, height, hintText, Math.floor((width - hintW) / 2), 355, 1, 150, 150, 150, 255);

  const pngBuffer = createPngBuffer(width, height, rgbaData);
  const outputPath = path.join(assetsDir, 'dmg-background.png');
  fs.writeFileSync(outputPath, pngBuffer);
  console.log('DMG-Hintergrundbild erstellt: dmg-background.png (' + pngBuffer.length + ' bytes)');
}

/**
 * Erstellt einen BMP-Buffer aus rohen RGB-Pixeldaten (24-bit, Bottom-Up)
 * @param {number} width - Bildbreite
 * @param {number} height - Bildhoehe
 * @param {Buffer} rgbaData - RGBA-Pixeldaten (top-down)
 * @returns {Buffer} BMP-Datei als Buffer
 */
function createBmpBuffer(width, height, rgbaData) {
  // BMP row size must be aligned to 4 bytes
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize; // 14 (header) + 40 (info header) + pixel data

  const bmp = Buffer.alloc(fileSize);

  // BMP File Header (14 bytes)
  bmp.write('BM', 0);                    // Signature
  bmp.writeUInt32LE(fileSize, 2);         // File size
  bmp.writeUInt32LE(0, 6);               // Reserved
  bmp.writeUInt32LE(54, 10);             // Pixel data offset

  // DIB Header (BITMAPINFOHEADER, 40 bytes)
  bmp.writeUInt32LE(40, 14);             // Header size
  bmp.writeInt32LE(width, 18);           // Width
  bmp.writeInt32LE(height, 22);          // Height (positive = bottom-up)
  bmp.writeUInt16LE(1, 26);             // Color planes
  bmp.writeUInt16LE(24, 28);            // Bits per pixel
  bmp.writeUInt32LE(0, 30);             // Compression (none)
  bmp.writeUInt32LE(pixelDataSize, 34); // Image size
  bmp.writeInt32LE(2835, 38);           // X pixels per meter (~72 DPI)
  bmp.writeInt32LE(2835, 42);           // Y pixels per meter
  bmp.writeUInt32LE(0, 46);             // Colors in palette
  bmp.writeUInt32LE(0, 50);             // Important colors

  // Pixel data (bottom-up, BGR)
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y; // BMP is bottom-up
    for (let x = 0; x < width; x++) {
      const srcOffset = (srcY * width + x) * 4;
      const dstOffset = 54 + y * rowSize + x * 3;
      bmp[dstOffset] = rgbaData[srcOffset + 2];     // B
      bmp[dstOffset + 1] = rgbaData[srcOffset + 1]; // G
      bmp[dstOffset + 2] = rgbaData[srcOffset];     // R
    }
  }

  return bmp;
}

/**
 * Erstellt die NSIS-Installer-Bilder (Header 150x57, Sidebar 164x314)
 * @param {string} assetsDir - Pfad zum Assets-Verzeichnis
 */
function createInstallerImages(assetsDir) {
  // Installer Header (150x57) - appears top-right during installation
  const headerW = 150;
  const headerH = 57;
  const headerData = Buffer.alloc(headerW * headerH * 4);

  // White background
  for (let y = 0; y < headerH; y++) {
    for (let x = 0; x < headerW; x++) {
      setPixel(headerData, headerW, x, y, 255, 255, 255, 255);
    }
  }

  // Green accent bar at bottom
  fillRect(headerData, headerW, headerH, 0, headerH - 4, headerW, 4, 46, 125, 50, 255);

  // "ProTra" text
  const headerText = 'ProTra';
  const htW = textWidth(headerText, 2);
  drawText(headerData, headerW, headerH, headerText, Math.floor((headerW - htW) / 2), 10, 2, 46, 125, 50, 255);

  // "Helfer" text below
  const subText = 'Helfer';
  const stW = textWidth(subText, 2);
  drawText(headerData, headerW, headerH, subText, Math.floor((headerW - stW) / 2), 30, 2, 100, 100, 100, 255);

  const headerBmp = createBmpBuffer(headerW, headerH, headerData);
  fs.writeFileSync(path.join(assetsDir, 'installer-header.bmp'), headerBmp);
  console.log('NSIS Installer Header erstellt: installer-header.bmp (' + headerBmp.length + ' bytes)');

  // Installer Sidebar (164x314) - appears on welcome/finish pages
  const sideW = 164;
  const sideH = 314;
  const sideData = Buffer.alloc(sideW * sideH * 4);

  // Green gradient background
  for (let y = 0; y < sideH; y++) {
    const ratio = y / sideH;
    // From darker green (#1B5E20) to lighter green (#4CAF50)
    const r = Math.round(27 + ratio * (76 - 27));
    const g = Math.round(94 + ratio * (175 - 94));
    const b = Math.round(32 + ratio * (80 - 32));
    for (let x = 0; x < sideW; x++) {
      setPixel(sideData, sideW, x, y, r, g, b, 255);
    }
  }

  // "ProTra" text (vertical center area)
  const sideTitle = 'ProTra';
  const sideTitleW = textWidth(sideTitle, 3);
  drawText(sideData, sideW, sideH, sideTitle, Math.floor((sideW - sideTitleW) / 2), 100, 3, 255, 255, 255, 255);

  // "Helfer" text below
  const sideSubtitle = 'Helfer';
  const sideSubW = textWidth(sideSubtitle, 3);
  drawText(sideData, sideW, sideH, sideSubtitle, Math.floor((sideW - sideSubW) / 2), 135, 3, 200, 230, 200, 255);

  // Decorative line
  fillRect(sideData, sideW, sideH, 20, 175, sideW - 40, 2, 255, 255, 255, 120);

  // Version hint area
  const versionText = 'hefl.de';
  const vtW = textWidth(versionText, 1);
  drawText(sideData, sideW, sideH, versionText, Math.floor((sideW - vtW) / 2), 290, 1, 200, 230, 200, 200);

  const sideBmp = createBmpBuffer(sideW, sideH, sideData);
  fs.writeFileSync(path.join(assetsDir, 'installer-sidebar.bmp'), sideBmp);
  console.log('NSIS Installer Sidebar erstellt: installer-sidebar.bmp (' + sideBmp.length + ' bytes)');
}

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

    // DMG-Hintergrundbild fuer macOS
    console.log('\nErstelle Installer-Bilder...');
    createDmgBackground(assetsDir);

    // NSIS-Installer-Bilder fuer Windows
    createInstallerImages(assetsDir);

    console.log('\nAlle Icons und Installer-Bilder wurden erfolgreich erstellt!');
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

module.exports = { createIcons, createDmgBackground, createInstallerImages };
