const log = require('electron-log');
const path = require('node:path');

// Log-Level konfigurieren (kann auch aus einer Konfigurationsdatei kommen)
// log.transports.file.level = 'info'; // Default ist 'info'
// log.transports.console.level = 'debug';

// Log-Format für die Datei
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

// Log-Format für die Konsole (kann anders sein als in der Datei)
// log.transports.console.format = '[{h}:{i}:{s}] [{level}] {text}';

// Log-Dateigröße und Rotation
log.transports.file.maxSize = 5 * 1024 * 1024; // 5 MB
// log.transports.file.archiveLog = (file) => {
//   const info = path.parse(file.path);
//   const archivePath = path.join(info.dir, `${info.name}.${new Date().toISOString().replace(/:/g, '-')}${info.ext}`);
//   try {
//     fs.renameSync(file.path, archivePath);
//   } catch (e) {
//     console.warn('Konnte Log-Datei nicht archivieren', e);
//   }
// };

// Hook für unaufgefangene Fehler, um sie ebenfalls zu loggen
log.catchErrors();

// Man kann auch eigene Transportmechanismen hinzufügen, z.B. um an einen Server zu loggen.

// Sicherstellen, dass der Logger initialisiert ist, wenn das Modul geladen wird.
log.info('Logger initialisiert. Logs werden gespeichert in:', log.transports.file.getFile().path);

module.exports = log; 