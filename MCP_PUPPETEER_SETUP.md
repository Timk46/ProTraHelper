# Puppeteer MCP Server Setup - HEFL Project

## Übersicht

Dieser Guide beschreibt die Einrichtung und Verwendung des Puppeteer MCP (Model Context Protocol) Servers für das HEFL-Projekt. Der MCP Server ermöglicht es Claude Code, Browser-Automatisierung durchzuführen, Screenshots zu erstellen und mit Webseiten zu interagieren.

## Installation und Konfiguration

### 1. Konfigurationsdatei

Die Datei `.mcp.json` wurde im Projekt-Root erstellt:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": [
        "-y",
        "puppeteer-mcp-server"
      ],
      "env": {}
    }
  }
}
```

### 2. Systemvoraussetzungen

- **Node.js**: Version 20+ (aktuell installiert: v18.19.1 - Update empfohlen)
- **NPM**: Aktuelle Version
- **Chrome/Chromium**: Wird automatisch von Puppeteer installiert

### 3. Alternative Konfigurationen

Falls Node.js-Versionsprobleme auftreten:

#### Option A: Docker (empfohlen für Produktion)
```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm", "--init",
        "-e", "DOCKER_CONTAINER=true",
        "mcp/puppeteer"
      ],
      "env": {}
    }
  }
}
```

#### Option B: Alternative MCP Server
```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@hisma/server-puppeteer"],
      "env": {}
    }
  }
}
```

## Test-Verfahren

### 1. Claude Code neu starten

Nach der Konfiguration muss Claude Code neu gestartet werden, um die MCP-Konfiguration zu laden.

### 2. MCP Server Verfügbarkeit prüfen

In Claude Code sollten folgende Tools verfügbar sein:
- `puppeteer_navigate` - Navigation zu URLs
- `puppeteer_screenshot` - Screenshots erstellen
- `puppeteer_click` - Elemente anklicken
- `puppeteer_fill` - Formulare ausfüllen
- `puppeteer_evaluate` - JavaScript ausführen

### 3. Basis-Tests

#### Test 1: Einfacher Screenshot
```
Erstelle einen Screenshot von https://localhost:4200 (unsere Angular-App)
```

#### Test 2: Navigation und Interaktion
```
1. Navigiere zu unserer lokalen HEFL-App
2. Mache einen Screenshot der Startseite
3. Klicke auf den Login-Button
4. Mache einen Screenshot der Login-Seite
```

#### Test 3: Formular-Interaktion
```
1. Fülle das Login-Formular aus
2. Klicke auf "Anmelden"
3. Überprüfe die Weiterleitung
```

### 4. Erweiterte Tests

#### E-Learning Content Testing
```
1. Navigiere zu einem Content-Modul
2. Teste die Interaktivität (MCQ, Code-Editor)
3. Screenshot der verschiedenen Content-Typen
```

## Fehlerbehebung

### Problem: "Command not found" oder Timeout-Fehler

**Lösung 1**: Node.js auf Version 20+ aktualisieren
```bash
# Mit nvm (empfohlen)
nvm install 20
nvm use 20

# Oder direkt von nodejs.org downloaden
```

**Lösung 2**: Debug-Modus aktivieren
```bash
claude --mcp-debug
```

**Lösung 3**: Alternative MCP Server verwenden (siehe Konfiguration oben)

### Problem: Browser-Rechte oder Display-Probleme in WSL

**Lösung**: Docker-basierte Konfiguration verwenden:
```bash
# Docker Desktop mit WSL2-Integration aktivieren
# Siehe: https://docs.docker.com/go/wsl2/
```

### Problem: NPM Package deprecated

Die originalen `@modelcontextprotocol/server-puppeteer` Packages sind deprecated. Aktuelle Alternativen:
- `puppeteer-mcp-server` (v0.7.2)
- `@hisma/server-puppeteer` (v0.6.5)

## Verwendungsmöglichkeiten für HEFL

### 1. Frontend-Testing
- Automatisierte Screenshots der Angular-App
- UI-Regression Testing
- Responsive Design Testing

### 2. E-Learning Content Testing
- Test der interaktiven Elemente
- Screenshot-basierte Dokumentation
- Accessibility Testing

### 3. Integration Testing
- End-to-End User Flows
- Authentication Flow Testing
- Content Creation Workflows

### 4. Development Support
- Live-Screenshots während Entwicklung
- Visual Debugging
- Component Testing

## Sicherheitshinweise

- MCP Server haben Zugriff auf Browser-Funktionen
- Keine sensiblen Daten in Screenshots
- Lokal limitierter Zugriff (nur localhost und definierte URLs)
- Regelmäßige Updates der MCP Server Packages

## Team-Integration

Die `.mcp.json` ist im Git-Repository eingecheckt, so dass alle Teammitglieder den gleichen MCP Server verwenden können. Jeder Entwickler muss:

1. Claude Code neu starten nach Git Pull
2. Bei Problemen: `claude --mcp-debug` verwenden
3. Node.js Version überprüfen und ggf. aktualisieren

## Nächste Schritte

1. Node.js auf Version 20+ aktualisieren
2. Tests durchführen (siehe Test-Verfahren)
3. Bei Problemen: Alternative Konfigurationen ausprobieren
4. Dokumentation bei Bedarf erweitern