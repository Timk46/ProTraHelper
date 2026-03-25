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

Siehe [Installationshinweise](docs/code-signing-setup.md) fuer plattformspezifische Details und [Code Signing Policy](CODE_SIGNING_POLICY.md) fuer Signierung und Datenschutz.

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

## Setup (einmalig)

### Repo aus Monorepo extrahieren

Dieses Repo wurde aus dem HEFL-Monorepo extrahiert:

```bash
git clone <hefl-monorepo-url> hefl-helper-extract
cd hefl-helper-extract
git filter-repo --subdirectory-filter protra-helper-app
git remote set-url origin https://github.com/hefl/protra-helper-app.git
git push -u origin main
```

### Code Signing (SignPath.io)

Windows-Installer werden ueber [SignPath.io](https://signpath.io/open-source) signiert (kostenlos fuer Open Source).

**Einrichtung:**
1. Antrag auf [signpath.io/open-source](https://signpath.io/open-source) stellen (Voraussetzung: oeffentliches Repo, OSI-Lizenz)
2. Nach Genehmigung folgende GitHub Repository Vars/Secrets setzen:

| Typ | Name | Beschreibung |
|-----|------|-------------|
| Variable | `SIGNPATH_ORGANIZATION_ID` | SignPath Organisation-ID |
| Variable | `SIGNPATH_PROJECT_SLUG` | Projekt-Slug in SignPath |
| Variable | `SIGNPATH_SIGNING_POLICY_SLUG` | Signing-Policy-Slug |
| Secret | `SIGNPATH_API_TOKEN` | API-Token fuer SignPath |

Der `release.yml` Workflow erkennt automatisch ob SignPath konfiguriert ist. Ohne Konfiguration werden unsignierte Installer released.

**macOS**: Aktuell unsigned. Apple Developer Program ($99/Jahr) kann spaeter nachgeruestet werden.

### HEFL-Backend Anbindung

Das HEFL-Backend synchronisiert Installer automatisch von GitHub Releases. Folgende Environment-Variablen koennen im Backend (`server_nestjs/.env`) gesetzt werden:

| Variable | Default | Beschreibung |
|----------|---------|-------------|
| `HELPER_APP_GITHUB_REPO` | `hefl/protra-helper-app` | GitHub Repo-Slug |
| `HELPER_APP_GITHUB_TOKEN` | _(leer)_ | Optional: GitHub Token fuer hoehere API Rate-Limits |
| `HELPER_APP_REFRESH_INTERVAL_MS` | `1800000` | Sync-Intervall in ms (Standard: 30 Min) |
| `HELPER_APP_INSTALLER_PATH` | `./helper-app-installers` | Lokales Verzeichnis fuer Installer-Cache |

**Endpunkte** (oeffentlich, kein Auth noetig):
- `GET /helper-app/download` — Installer-Download (Platform-Autoerkennung via User-Agent)
- `GET /helper-app/info` — Verfuegbare Versionen und Plattformen

### Monorepo aufraeumen

Nach erfolgreicher Extraktion und Verifikation im HEFL-Monorepo entfernen:
- `protra-helper-app/` (gesamtes Verzeichnis)
- `.github/workflows/build-helper-app.yml` (alter Build-Workflow)

`server_nestjs/helper-app-installers/` bleibt bestehen (wird automatisch vom Backend befuellt).

## Lizenz

MIT
