# Übersicht Backend (server_nestjs)

VORSICHT: AI GENERIERT UND MÖGLICHERWEISE UNVOLLSTÄNDIG / IRREFÜHREND
Dieses Dokument beschreibt die Struktur und die wichtigsten Komponenten des NestJS-Backends im HEFL-Projekt.

## Hauptverzeichnis

- **nest-cli.json**: Konfiguration für das NestJS-Projekt.
- **package.json**: Enthält Abhängigkeiten, Skripte und Metadaten des Projekts.
- **tsconfig*.json**: TypeScript-Konfigurationsdateien für verschiedene Zwecke (Build, Tests, Dokumentation).
- **jest.config.js**: Konfiguration für Unit- und Integrationstests.
- **.env***: Umgebungsvariablen für verschiedene Zwecke (z.B. Auth, Test).
- **README.md**: Projektbeschreibung und Hinweise.
- **prisma/**: Prisma-ORM-Konfiguration und Datenbankschema.
- **src/**: Quellcode des Backends.

## src/-Verzeichnis

- **admin/**: Verwaltung und Administration von Modulen und Inhalten.
- **ai/**: KI-bezogene Funktionalitäten (z.B. Feedback-Generierung).
- **auth/**: Authentifizierung und Autorisierung (JWT, Strategien, Token-Refresh).
- **code-game/**: Logik für Coding-Games und deren Auswertung.
- **common/**: Gemeinsame Hilfsfunktionen, Dekoratoren, Pipes, etc.
- **content/**: Verwaltung und Bereitstellung von Lerninhalten.
- **content-linker/**: Verknüpfung von Inhalten und Konzepten.
- **discussion/**: Diskussionsforen und Kommentare.
- **EventLog/**: Logging von Nutzeraktionen und Systemereignissen.
- **files/**: Datei-Uploads und -Verwaltung.
- **graph/**: Endpunkte und Logik für den Wissensgraphen.
- **graph-solution-evaluation/**: Bewertung von Graph-Lösungen (z.B. Algorithmen).
- **highlight-concepts/**: Hervorhebung und Markierung von Konzepten.
- **mcqcreation/**: Erstellung und Verwaltung von Multiple-Choice-Fragen.
- **notification/**: Benachrichtigungen (z.B. WebSocket-Gateway).
- **prisma/**: Prisma-Service für Datenbankzugriffe.
- **question-data/**: Verwaltung und Auswertung verschiedener Fragetypen.
- **tutor-kai/**: Tutorielle und KI-gestützte Unterstützung.
- **umlearn/**: Kommunikation mit externen Lernplattformen.
- **users/**: Nutzerverwaltung und -authentifizierung.
- **main.ts**: Einstiegspunkt der NestJS-Anwendung.

## Wichtige Komponenten

- **UserConceptService**: Kernlogik für Fortschrittsberechnung und Level-Vergabe.
- **GraphController/Service**: Bereitstellung und Aktualisierung des Wissensgraphen.
- **PrismaService**: Zentrale Datenbankschnittstelle.
- **NotificationGateway**: WebSocket-basierte Benachrichtigungen.

## Hinweise
- Die Struktur folgt Best Practices für modulare NestJS-Projekte.
- Die Datenbankanbindung erfolgt über Prisma ORM.
- Die Fortschritts- und Graphlogik ist eng mit dem Angular-Frontend verzahnt.

Weitere Details zur Logik und zu den Datenmodellen finden sich in der Datei `progress-logic.md` im `docs`-Ordner.
