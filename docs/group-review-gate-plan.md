# Implementierungsplan: Group Review Session Management

## 1. Zielsetzung

Ziel ist die Erstellung einer neuen Dozentenansicht, die es ermöglicht, für `GroupReviewGate`-Aufgaben, die mit `UploadQuestion`-Aufgaben verknüpft sind, automatisch Peer-Review-Sessions zu erstellen. Die Ansicht soll eine klare Übersicht über den Abgabestatus der Studierenden bieten und die gezielte Erstellung von Sessions für ausgewählte Gates ermöglichen.

## 2. Architektur-Überblick

Die Implementierung folgt der bestehenden HEFL-Architektur:

- **Backend (NestJS)**: Ein neues Modul im `lecturers-view` Bereich wird die Geschäftslogik kapseln und neue API-Endpunkte bereitstellen.
- **Frontend (Angular)**: Eine neue "smarte" Komponente wird unter `lecturersView/management` erstellt, die die Daten anzeigt und Benutzerinteraktionen verarbeitet.
- **Datenbank (Prisma)**: Es werden keine Schema-Änderungen benötigt. Die Logik wird durch komplexe Queries auf den bestehenden Modellen `GroupReviewGate`, `UploadQuestion`, `UserAnswer`, `UserUploadAnswer`, `EvaluationSession` und `EvaluationSubmission` realisiert.

---

## Phase 1: Backend-Implementierung (`server_nestjs`)

### Schritt 1.1: DTOs erstellen (`shared/dtos`)

Wir benötigen neue DTOs für die Kommunikation zwischen Frontend und Backend.

- [ ] **Neue Datei `group-review-gate.dto.ts` erstellen:**

  ```typescript
  // DTO für die Listenansicht im Frontend
  export interface GroupReviewGateStatusDTO {
    gateId: number;
    gateName: string;
    linkedQuestionId: number;
    linkedQuestionName: string;
    conceptId: number;
    conceptName: string;
    totalStudents: number;
    submittedStudents: number;
  }

  // DTO für die Anfrage zur Session-Erstellung
  export interface CreateGroupReviewSessionsDTO {
    gateIds: number[];
    sessionTitle: string;
    reviewDeadline: Date;
  }

  // DTO für die Antwort nach der Erstellung
  export interface CreateGroupReviewSessionsResultDTO {
    createdSessions: number;
    createdSubmissions: number;
    errors: string[];
  }
  ```

- [ ] **`index.ts` in `shared/dtos/` aktualisieren**, um die neuen DTOs zu exportieren.

### Schritt 1.2: Neues Backend-Modul erstellen

- [ ] **Neuen Ordner erstellen**: `server_nestjs/src/lecturers-view/group-review-session/`
- [ ] **Dateien erstellen**:
  - `group-review-session.module.ts`
  - `group-review-session.controller.ts`
  - `group-review-session.service.ts`
- [ ] **Modul in `app.module.ts` importieren**.

### Schritt 1.3: Service-Logik implementieren (`group-review-session.service.ts`)

- [ ] **`getGroupReviewGateStatuses()` Methode implementieren:**

  - Diese Methode ist das Herzstück und erfordert eine komplexe Prisma-Query.
  - **Logik**:
    1.  Finde alle `GroupReviewGate`-Einträge.
    2.  Für jeden Eintrag, lade die zugehörige `Question` (für den Namen und die `conceptNodeId`).
    3.  Lade den `ConceptNode`, um den Konzeptnamen zu erhalten.
    4.  Finde die verknüpfte `UploadQuestion` über die `linkedQuestionId`.
    5.  Ermittle die Gesamtzahl der Studierenden im Kurs/Modul des `ConceptNode` (z.B. über `UserSubject` oder eine andere Logik).
    6.  Zähle die Anzahl der `UserUploadAnswer`-Einträge für die `linkedQuestionId`, um die Anzahl der Abgaben zu erhalten.
    7.  Mappe die Ergebnisse auf das `GroupReviewGateStatusDTO`.

- [ ] **`createSessionsForGates()` Methode implementieren:**
  - Diese Methode muss transaktional sein, um Datenkonsistenz zu gewährleisten (`prisma.$transaction`).
  - **Logik**:
    1.  Nimm ein `CreateGroupReviewSessionsDTO` entgegen.
    2.  Iteriere über die `gateIds`.
    3.  Für jede `gateId`:
        a. Erstelle eine neue `EvaluationSession` mit dem Titel und der Deadline.
        b. Finde die `linkedQuestionId` des Gates.
        c. Finde alle `UserUploadAnswer`s, die zu dieser `linkedQuestionId` gehören.
        d. Für jede **neuste** `UserUploadAnswer` eines Benutzers, erstelle einen `EvaluationSubmission`-Eintrag und verknüpfe ihn mit der neuen `EvaluationSession`, dem `User` und der `File`-ID aus der `UserUploadAnswer`.
    4.  Gib ein `CreateGroupReviewSessionsResultDTO` mit einer Zusammenfassung der erstellten Entitäten zurück.

### Schritt 1.4: Controller implementieren (`group-review-session.controller.ts`)

- [ ] **Endpunkte erstellen**:
  - `GET /api/lecturers/group-review-gates`: Ruft `getGroupReviewGateStatuses()` vom Service auf.
  - `POST /api/lecturers/group-review-sessions`: Ruft `createSessionsForGates()` vom Service auf.
- [ ] **Guards anwenden**: Schütze die Endpunkte mit `@UseGuards(JwtAuthGuard, RolesGuard)` und `@roles('LECTURER', 'ADMIN')`.

---

## Phase 2: Frontend-Implementierung (`client_angular`)

### Schritt 2.1: Neue Seite und Routing

- [ ] **Neue Komponente erstellen**: `client_angular/src/app/Pages/lecturersView/management/group-review-session/`
- [ ] **Routing anpassen** in `management-routing.module.ts`:

  ```typescript
  const routes: Routes = [
    {
      path: "grouping",
      component: UserGroupingComponent,
    },
    {
      path: "group-review-sessions", // NEU
      component: GroupReviewSessionComponent, // NEU
    },
  ];
  ```

### Schritt 2.2: Neuer Frontend-Service

- [ ] **Neue Service-Datei erstellen**: `client_angular/src/app/Services/lecturer/group-review-session.service.ts`
- [ ] **Methoden implementieren**:
  - `getGroupReviewGateStatuses(): Observable<GroupReviewGateStatusDTO[]>`
  - `createSessions(dto: CreateGroupReviewSessionsDTO): Observable<CreateGroupReviewSessionsResultDTO>`

### Schritt 2.3: UI der Komponente (`group-review-session.component.html`)

- [ ] **Layout erstellen**, inspiriert von `user-grouping.component.html`.
- [ ] **Tabelle implementieren** (`mat-table`) zur Anzeige der `GroupReviewGateStatusDTO`-Liste.
  - **Spalten**: Checkbox, Gate-Name, Konzept-Name, Abgabestatus (z.B. "15 / 20").
- [ ] **Aktionsleiste hinzufügen**:
  - Eingabefeld für den `sessionTitle`.
  - `mat-datepicker` für die `reviewDeadline`.
  - Button "Sessions erstellen", der nur aktiv ist, wenn mindestens ein Gate ausgewählt ist.
- [ ] **Loading-Spinner und Error-States** für eine gute UX implementieren.

### Schritt 2.4: Logik der Komponente (`group-review-session.component.ts`)

- [ ] **Daten laden**: Im `ngOnInit`, den neuen Service aufrufen, um die Liste der Gates zu laden.
- [ ] **Selektion verwalten**: Eine `SelectionModel` von Angular Material verwenden, um die ausgewählten Gates zu verwalten.
- [ ] **`createSessions()`-Methode implementieren**:
  1.  Sammelt die IDs der ausgewählten Gates.
  2.  Liest Titel und Deadline aus den Formularfeldern.
  3.  Erstellt das `CreateGroupReviewSessionsDTO`.
  4.  Ruft die entsprechende Methode im Frontend-Service auf.
  5.  Zeigt eine `MatSnackBar` mit dem Ergebnis (`CreateGroupReviewSessionsResultDTO`) an.
  6.  Lädt die Liste neu, um den Status zu aktualisieren.

---

## Phase 3: Testing & Finalisierung

- [ ] **Backend Unit Tests**: Für den neuen Service die Kernlogik testen (Statusberechnung, Session-Erstellung).
- [ ] **Frontend Unit Tests**: Für die neue Komponente die Selektionslogik und die Interaktion mit dem Service testen.
- [ ] **E2E-Tests (Playwright)**: Einen vollständigen Flow testen: Seite laden, Gates auswählen, Sessions erstellen und das Ergebnis überprüfen.
- [ ] **Dokumentation**: Die neue Funktionalität im Dozenten-Handbuch dokumentieren.
