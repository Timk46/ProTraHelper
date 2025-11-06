// preload.js

const { contextBridge, ipcRenderer } = require('electron');

logger.info('preload.js geladen.');

// Beispiel für das Exponieren von APIs an den Renderer-Prozess, falls benötigt.
// Da wir primär eine Tray-Anwendung ohne sichtbares Hauptfenster-UI haben,
// wird dies möglicherweise nicht intensiv genutzt, es sei denn, wir fügen
// später eine Konfigurations-Webseite hinzu.
/*
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  // weitere Funktionen hier...
});
*/

// Hinweis: Für eine reine Tray-Anwendung ohne UI im BrowserWindow ist preload.js
// möglicherweise nicht zwingend erforderlich, es sei denn, man plant, später
// ein Konfigurationsfenster mit Web-Technologien zu erstellen, das sicher mit dem
// Hauptprozess kommunizieren muss. 