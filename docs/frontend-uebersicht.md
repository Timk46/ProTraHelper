# Übersicht Frontend (client_angular)

VORSICHT: AI GENERIERT UND MÖGLICHERWEISE UNVOLLSTÄNDIG / IRREFÜHREND
Dieses Dokument beschreibt die Struktur und die wichtigsten Komponenten des Angular-Frontends im HEFL-Projekt.

## Hauptverzeichnis

- **angular.json**: Zentrale Konfigurationsdatei für das Angular-Projekt (Build, Assets, etc.).
- **package.json**: Enthält Abhängigkeiten, Skripte und Metadaten des Projekts.
- **tailwind.config.js**: Konfiguration für Tailwind CSS.
- **tsconfig*.json**: TypeScript-Konfigurationsdateien für verschiedene Zwecke (App, Tests, Dokumentation).
- **README.md**: Projektbeschreibung und Hinweise.
- **src/**: Quellcode des Frontends.

## src/-Verzeichnis

- **app/**: Enthält die Hauptlogik und Komponenten der Anwendung.
  - **about/**: Statische Infoseiten.
  - **Directives/**: Eigene Angular-Direktiven.
  - **Guards/**: Routenwächter für Authentifizierung und Berechtigungen.
  - **Interceptors/**: HTTP-Interceptors (z.B. für Auth-Header).
  - **Modules/**: Feature-Module für größere Funktionsbereiche.
  - **Pages/**: Seiten-Komponenten (z.B. Graph, Highlight-Navigator).
  - **Services/**: Zentrale Services (z.B. API-Kommunikation, Progress-Logik).
- **assets/**: Statische Dateien wie Bilder, Videos, Schriftarten.
- **declarations/**: TypeScript-Deklarationen (z.B. für externe Bibliotheken).
- **environments/**: Umgebungs-spezifische Konfigurationen (z.B. API-URLs).
- **styles/**: Globale und thematische SCSS/CSS-Dateien.
- **main.ts**: Einstiegspunkt der Angular-Anwendung.
- **index.html**: Haupt-HTML-Datei.
- **manifest.webmanifest**: PWA-Konfiguration.
- **styles.scss**: Zentrale SCSS-Datei.

## Wichtige Komponenten

- **Graph-Visualisierung**: In `Pages/graph` und `Services/graph` (Sprotty-Integration, Fortschrittsanzeige).
- **ProgressService**: Fortschrittsberechnung und Kommunikation mit dem Backend.
- **GraphCommunicationService**: Singleton-Service für automatische Aktualisierung der Graph-Ansicht.

## Hinweise
- Die Struktur folgt Best Practices für Angular-Projekte.
- Die Kommunikation mit dem Backend erfolgt typischerweise über Services.
- Die Fortschrittslogik ist eng mit der Graph-Visualisierung und dem Backend verzahnt.

Weitere Details zur Logik und zu den Datenmodellen finden sich in der Datei `progress-logic.md` im `docs`-Ordner.
