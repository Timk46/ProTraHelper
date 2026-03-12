# ProTra Helfer

Desktop-Helferanwendung fuer die [ProTra-Webanwendung](https://protra.hefl.de) zur Rhino/Grasshopper-Integration.

## Was macht die App?

ProTra Helfer laeuft als System-Tray-Anwendung und ermoeglicht die nahtlose Integration zwischen der ProTra-Lernplattform im Browser und Rhino/Grasshopper auf dem lokalen Rechner:

- Automatisches Oeffnen von Grasshopper-Dateien aus der Webanwendung
- Sichere Kopplung (Pairing) mit der Webanwendung via JWT
- Unterstuetzung fuer `rhinogh://` Protokoll-Links
- Automatischer Start beim Systemstart (macOS)

## Installation

Aktuelle Installer gibt es unter [Releases](../../releases):

| Plattform | Datei |
|-----------|-------|
| Windows | `ProTra Helfer-Setup-x.x.x.exe` |
| macOS (Apple Silicon) | `ProTra Helfer-x.x.x-mac-arm64.pkg` |
| macOS (Intel) | `ProTra Helfer-x.x.x-mac-x64.pkg` |
| Linux | `ProTra Helfer-x.x.x.AppImage` |

### Hinweise

- **Windows**: Falls SmartScreen eine Warnung zeigt, auf "Weitere Informationen" > "Trotzdem ausfuehren" klicken. Signierte Releases zeigen keine Warnung.
- **macOS**: Rechtsklick auf die .pkg-Datei > "Oeffnen" > "Oeffnen" bestaetigen (Gatekeeper-Workaround fuer unsignierte Builds).

## Entwicklung

```bash
npm ci
npm start        # App starten
npm test         # Tests ausfuehren
npm run dist     # Installer bauen
```

### Builds

```bash
npm run build:installer        # Windows .exe
npm run build:mac              # macOS .pkg (x64)
npm run build:mac:arm64        # macOS .pkg (arm64)
npm run dist:linux             # Linux AppImage + .deb
```

### Release erstellen

```bash
npm version patch   # oder minor/major
git push --tags     # Triggert GitHub Actions Release-Workflow
```

## Architektur

- **Electron** Tray-Anwendung (kein sichtbares Fenster)
- **Express.js** Server auf `localhost:3001` fuer Kommunikation mit der Webanwendung
- **JWT-basiertes Pairing** mit dem HEFL-Backend
- **COM-Automatisierung** (Windows) fuer Rhino-Steuerung

## Lizenz

MIT
