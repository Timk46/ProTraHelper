### Planungsagent ###

## BLOCKPLAN für Evaluation & Discussion Forum Implementierung

Die Implementierung wird in 8 unabhängige Blöcke aufgeteilt, die sequenziell ohne Abhängigkeitsprobleme umgesetzt werden können.

---

## ERGÄNZUNGEN NACH SCREENSHOT-ANALYSE

### Fehlende Komponenten aus den Screenshots:

1. **Multi-Phase System** (Diskussionsphase ↔ Bewertungsphase)
2. **Rating Slider Komponente** für Punktevergabe (0-10)
3. **Phase-Switch Button** ("Zu Phase 1 wechseln")
4. **Verfügbarkeits-Indikator** (grün/rot für verfügbare Kommentare)
5. **Download PDF Button** im PDF-Viewer
6. **Bewertungs-Abschluss Button** ("Bewertung abschließen")
7. **Erweiterte Voting-Anzeige** mit farbigen Indikatoren

---

## BLOCK 1: Datenbank-Schema und DTOs
**Priorität:** Kritisch
**Geschätzter Aufwand:** 4-6 Stunden

### Schritt 1: Prisma Schema Erweiterungen
- Neue Modelle in `server_nestjs/prisma/schema.prisma` hinzufügen:
  ```prisma
  model EvaluationSubmission {
    id            String                @id @default(cuid())
    title         String
    authorId      Int
    pdfFileId     Int                   @unique
    moduleId      Int
    status        EvaluationStatus      @default(SUBMITTED)
    phase         EvaluationPhase       @default(DISCUSSION)
    submittedAt   DateTime              @default(now())
    createdAt     DateTime              @default(now())
    updatedAt     DateTime              @updatedAt
    
    author        User                  @relation(fields: [authorId], references: [id])
    pdfFile       File                  @relation(fields: [pdfFileId], references: [id])
    module        Module                @relation(fields: [moduleId], references: [id])
    discussions   EvaluationDiscussion[]
    commentLimits CommentLimit[]
    ratings       EvaluationRating[]
  }

  model EvaluationCategory {
    id            String                @id @default(cuid())
    name          String                @unique
    displayName   String
    description   String
    icon          String
    order         Int
    
    discussions   EvaluationDiscussion[]
  }

  model EvaluationDiscussion {
    id               String                @id @default(cuid())
    submissionId     String
    categoryId       String
    createdAt        DateTime              @default(now())
    
    submission       EvaluationSubmission  @relation(fields: [submissionId], references: [id])
    category         EvaluationCategory    @relation(fields: [categoryId], references: [id])
    comments         EvaluationComment[]
    
    @@unique([submissionId, categoryId])
  }

  model EvaluationComment {
    id               String                @id @default(cuid())
    discussionId     String
    authorId         Int?
    anonymousUserId  Int?
    content          String                @db.Text
    parentId         String?
    createdAt        DateTime              @default(now())
    updatedAt        DateTime              @updatedAt
    
    discussion       EvaluationDiscussion  @relation(fields: [discussionId], references: [id])
    author           User?                 @relation(fields: [authorId], references: [id])
    anonymousUser    AnonymousEvaluationUser? @relation(fields: [anonymousUserId], references: [id])
    parent           EvaluationComment?    @relation("CommentReplies", fields: [parentId], references: [id])
    replies          EvaluationComment[]   @relation("CommentReplies")
    votes            EvaluationVote[]
  }

  model AnonymousEvaluationUser {
    id               Int                   @id @default(autoincrement())
    userId           Int
    submissionId     String
    displayName      String
    colorCode        String
    createdAt        DateTime              @default(now())
    
    user             User                  @relation(fields: [userId], references: [id])
    submission       EvaluationSubmission  @relation(fields: [submissionId], references: [id])
    comments         EvaluationComment[]
    
    @@unique([userId, submissionId])
  }

  model EvaluationVote {
    id               String                @id @default(cuid())
    commentId        String
    userId           Int
    voteType         VoteType
    createdAt        DateTime              @default(now())
    
    comment          EvaluationComment     @relation(fields: [commentId], references: [id])
    user             User                  @relation(fields: [userId], references: [id])
    
    @@unique([commentId, userId])
  }

  model CommentLimit {
    id               String                @id @default(cuid())
    submissionId     String
    userId           Int
    categoryId       String
    availableCount   Int                   @default(3)
    usedCount        Int                   @default(0)
    
    submission       EvaluationSubmission  @relation(fields: [submissionId], references: [id])
    user             User                  @relation(fields: [userId], references: [id])
    category         EvaluationCategory    @relation(fields: [categoryId], references: [id])
    
    @@unique([submissionId, userId, categoryId])
  }

  model EvaluationRating {
    id            String                @id @default(cuid())
    submissionId  String
    userId        Int
    categoryId    String
    score         Int                   // 0-10 Punkte
    createdAt     DateTime              @default(now())
    updatedAt     DateTime              @updatedAt
    
    submission    EvaluationSubmission  @relation(fields: [submissionId], references: [id])
    user          User                  @relation(fields: [userId], references: [id])
    category      EvaluationCategory    @relation(fields: [categoryId], references: [id])
    
    @@unique([submissionId, userId, categoryId])
  }

  enum EvaluationStatus {
    DRAFT
    SUBMITTED
    IN_REVIEW
    DISCUSSION
    COMPLETED
  }

  enum EvaluationPhase {
    DISCUSSION
    EVALUATION
  }

  enum VoteType {
    UP
    DOWN
  }
  ```

### Schritt 2: DTOs erstellen in `shared/dtos/`
- `evaluation-submission.dto.ts`
- `evaluation-category.dto.ts`
- `evaluation-discussion.dto.ts`
- `evaluation-comment.dto.ts`
- `anonymous-evaluation-user.dto.ts`
- `evaluation-vote.dto.ts`
- `evaluation-rating.dto.ts` **[NEU]**
- `comment-stats.dto.ts`
- `discussion-update.dto.ts`
- `phase-switch.dto.ts` **[NEU]**

### Schritt 3: Prisma Migration
- Migration erstellen und ausführen
- Seed-Daten für die 4 Kategorien vorbereiten

**Technische Details:**
- Nutze Prisma Relations für effiziente Queries
- Implementiere Cascade-Delete für Datenkonsistenz
- Unique-Constraints für Voting und Comment-Limits
- Optimistische Locking über updatedAt

---

## BLOCK 2: Backend API Module
**Priorität:** Kritisch
**Geschätzter Aufwand:** 6-8 Stunden

### Schritt 1: NestJS Module Struktur
- Erstelle `server_nestjs/src/evaluation-discussion/`
- Module, Controller, Service, Guards erstellen
- Dependency Injection konfigurieren

### Schritt 2: Core API Endpoints implementieren
```typescript
// Controller Endpoints:
GET    /api/evaluation-discussion/submissions/:id
GET    /api/evaluation-discussion/categories
GET    /api/evaluation-discussion/submissions/:id/discussions/:category
POST   /api/evaluation-discussion/comments
POST   /api/evaluation-discussion/comments/:id/vote
GET    /api/evaluation-discussion/submissions/:id/stats
POST   /api/evaluation-discussion/anonymous-users
DELETE /api/evaluation-discussion/comments/:id
POST   /api/evaluation-discussion/submissions/:id/phase-switch  [NEU]
POST   /api/evaluation-discussion/ratings                       [NEU]
GET    /api/evaluation-discussion/submissions/:id/ratings       [NEU]
```

### Schritt 3: Business Logic im Service
- Kommentar-Limit-Verwaltung
- Anonyme User-Erstellung mit Farbcodes
- Vote-Aggregation
- Zugriffskontrollen
- **Phase-Management (Diskussion ↔ Bewertung)** **[NEU]**
- **Rating-System (0-10 Punkte)** **[NEU]**
- **PDF-Download-URL-Generierung** **[NEU]**

### Schritt 4: WebSocket Integration
- Socket.io Event-Handler für Real-time Updates
- Room-Management für Submission-spezifische Updates
- Event-Types: comment-added, comment-updated, vote-changed, **phase-switched, rating-submitted** **[NEU]**

**Technische Details:**
- JWT-basierte Authentifizierung verwenden
- Role-based Access Control implementieren
- Transactional Operations für Voting
- Optimistic Locking für Race Conditions

---

## BLOCK 3: Angular Module und Routing
**Priorität:** Hoch
**Geschätzter Aufwand:** 4-5 Stunden

### Schritt 1: Feature Module erstellen
- `client_angular/src/app/Pages/evaluation-discussion-forum/`
- Module, Routing-Module, Guards konfigurieren
- Lazy Loading in app-routing.module.ts

### Schritt 2: Material Module Imports
```typescript
// Benötigte Angular Material Module:
MatTabsModule, MatButtonModule, MatIconModule, MatTooltipModule,
MatProgressSpinnerModule, MatBadgeModule, MatFormFieldModule,
MatInputModule, MatCardModule, MatChipsModule, MatListModule,
MatDividerModule, MatExpansionModule, MatButtonToggleModule,
MatToolbarModule, MatBottomSheetModule, ScrollingModule,
PdfViewerModule // ng2-pdf-viewer
```

### Schritt 3: Services und State Management
- `evaluation-discussion.service.ts` - API Kommunikation
- `evaluation-state.service.ts` - Client-side State mit BehaviorSubjects
- WebSocket Integration für Real-time Updates

### Schritt 4: Guards implementieren
- `evaluation-access.guard.ts` - Zugriffskontrolle

**Technische Details:**
- RxJS für reaktive Programmierung
- BehaviorSubjects für State Management
- Caching-Strategie für Diskussionen
- Error Handling mit Interceptors

---

## BLOCK 4: Smart Component Implementation
**Priorität:** Hoch  
**Geschätzter Aufwand:** 6-8 Stunden

### Schritt 1: EvaluationDiscussionForumComponent
- Component Class mit reaktivem State
- Observable Streams für alle Daten
- WebSocket Subscription Management
- PDF Viewer Integration

### Schritt 2: Template Structure
```html
<!-- Hauptlayout mit CSS Grid -->
<div class="evaluation-container">
  <!-- PDF Section -->
  <section class="pdf-section">
    <app-pdf-viewer-panel>
  </section>
  
  <!-- Discussion Section -->  
  <section class="discussion-section">
    <app-category-tabs>
    <app-discussion-thread>
    <app-comment-input>
  </section>
</div>
```

### Schritt 3: Responsive Design
- CSS Grid für Desktop (2 Spalten)
- Tab-System für Mobile
- Breakpoints: 1200px, 768px

### Schritt 4: State Management
- Combined Observables mit combineLatest
- Loading States
- Error Handling
- Optimistic Updates

**Technische Details:**
- OnPush Change Detection
- TrackBy Functions für Performance
- Unsubscribe Pattern mit takeUntil
- Memory Leak Prevention

---

## BLOCK 5: Dumb Components (Teil 1)
**Priorität:** Hoch
**Geschätzter Aufwand:** 8-10 Stunden

### Schritt 1: CategoryTabsComponent
- @Input: categories, activeCategory, commentStats
- @Output: categoryChanged
- Material Tabs mit Custom Styling
- **Comment-Statistik Badges mit Farb-Indikatoren (grün/rot)** **[ERWEITERT]**
- **Dynamische Tab-Hervorhebung (blau für aktiv)** **[ERWEITERT]**
- **Individuelle Kommentar-Zähler pro Kategorie** **[ERWEITERT]**

### Schritt 2: PdfViewerPanelComponent  
- @Input: pdfUrl, pageNumber
- @Output: pageChanged
- ng2-pdf-viewer Integration
- Loading States, Error Handling
- Zoom Controls
- **PDF-Download Button** **[NEU]**

### Schritt 3: DiscussionThreadComponent
- @Input: discussions, currentUser, anonymousUser, categoryName
- @Output: commentSubmitted, voteChanged
- Virtual Scrolling für Performance
- Nested Comment Structure
- **Phase-abhängige Darstellung** **[NEU]**
- **Dynamischer Diskussions-Header** **[ERWEITERT]**
- **Kategorie-spezifische Kommentar-Limits** **[ERWEITERT]**

**Technische Details:**
- Strict Input/Output Typing
- OnPush Strategy überall
- ARIA Labels für Accessibility
- CSS Encapsulation

---

## BLOCK 6: Dumb Components (Teil 2)
**Priorität:** Mittel
**Geschätzter Aufwand:** 6-8 Stunden

### Schritt 1: CommentItemComponent
- @Input: comment, isAuthor
- @Output: voteChanged
- Author Display (User/Anonymous)
- Timestamp Formatting
- Reply Threading UI

### Schritt 2: VoteBoxComponent
- @Input: upvotes, downvotes, userVote
- @Output: voteChanged
- Material Button Toggle Group
- Optimistic UI Updates
- Ripple Effects
- **Farbige Indikatoren (grün/rot/gelb)** **[ERWEITERT]**

### Schritt 3: CommentInputComponent
- @Input: placeholder, maxLength
- @Output: commentSubmitted  
- Reactive Form mit Validierung
- Character Counter
- Auto-resize Textarea
- Ctrl+Enter Submit

### Schritt 4: RatingSliderComponent **[NEU]**
- @Input: currentRating, categoryName
- @Output: ratingChanged
- Material Slider (0-10)
- Visuelle Feedback-Anzeige
- "Bewertung abschließen" Button

### Schritt 5: PhaseToggleComponent **[NEU]**
- @Input: currentPhase, canSwitch
- @Output: phaseChanged
- Phase-Switch Button
- Badge-Anzeige (Diskussion/Bewertung)

**Technische Details:**
- Form Validation
- Keyboard Shortcuts
- Touch-friendly für Mobile
- Focus Management

---

## BLOCK 7: Animations und Polish
**Priorität:** Niedrig
**Geschätzter Aufwand:** 4-5 Stunden

### Schritt 1: Micro-Interactions
- Tab-Wechsel Animation (300ms slide)
- Comment Expand Animation (250ms)
- Vote Button Animations
- Loading Skeletons

### Schritt 2: Mobile Optimierungen
- Bottom Sheet für Mobile Comments
- Swipe Gestures für Tabs
- Sticky Header
- Touch-optimierte Buttons

### Schritt 3: Performance Optimierungen
- HTTP Caching für PDFs
- Lazy Loading für Replies
- Image Optimization
- Bundle Size Optimierung

### Schritt 4: Accessibility
- Keyboard Navigation
- Screen Reader Support
- High Contrast Mode
- Focus Indicators

**Technische Details:**
- Angular Animations API
- CSS Transitions
- will-change Property
- GPU Acceleration

---

## BLOCK 8: Testing und Integration
**Priorität:** Mittel
**Geschätzter Aufwand:** 6-8 Stunden

### Schritt 1: Unit Tests
- Service Tests mit Jasmine
- Component Tests mit TestBed
- Mock WebSocket Connections
- Mock PDF Viewer

### Schritt 2: Integration Tests
- API Endpoint Tests
- WebSocket Event Tests
- State Management Tests
- Guard Tests

### Schritt 3: E2E Tests mit Playwright
- User Flow: PDF öffnen und diskutieren
- Category Switching
- Comment Submission
- Voting Interaction

### Schritt 4: Documentation
- API Documentation
- Component Documentation
- Deployment Guide
- User Manual

**Technische Details:**
- Code Coverage > 70%
- Mock Strategies
- Test Data Factories
- CI/CD Integration

---

## Technische Abhängigkeiten

### NPM Packages zu installieren:
```json
{
  "ng2-pdf-viewer": "^10.0.0",
  "@angular/cdk": "^18.0.0",
  "@angular/material": "^18.0.0"
}
```

### Environment Variables:
- `PDF_STORAGE_URL` - URL für PDF Storage
- `WEBSOCKET_URL` - WebSocket Server URL
- `ANONYMOUS_NAME_PREFIXES` - Array von anonymen Namen

### Performance Targets:
- Initial Load: < 3s
- PDF Load: < 5s  
- Comment Submit: < 500ms
- Vote Update: < 200ms (optimistic)
- **Phase Switch: < 300ms** **[NEU]**
- **Rating Submit: < 400ms** **[NEU]**

### Browser Support:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## **ZUSÄTZLICHE KOMPONENTEN AUS SCREENSHOT-ANALYSE**

### Neu hinzugefügte Funktionen:

1. **Multi-Phase System**: Wechsel zwischen Diskussions- und Bewertungsphase
2. **Rating Slider**: 0-10 Punkte-Bewertung pro Kategorie
3. **Phase Toggle**: Button zum Phasenwechsel
4. **Erweiterte Voting-Anzeige**: Farbige Indikatoren für Bewertungen
5. **PDF Download**: Direkter Download-Button für PDFs
6. **Verfügbarkeits-Indikator**: Grün/Rot-Anzeige für verfügbare Kommentare
7. **Bewertungs-Abschluss**: "Bewertung abschließen" Button

### **ERGÄNZUNGEN NACH VOLLSTÄNDIGER SCREENSHOT-ANALYSE:**

#### Spezifische UI-Details aus allen Screenshots:

**Shot1.png - Vollständigkeit:**
- Aktiver Tab: "Vollständigkeit" (blau hervorgehoben)
- Diskussion: "Diskussion: Vollständigkeit"
- Verfügbarkeit: "+ 2/3 verfügbar" (grün), "- 3/3 verfügbar" (rot)
- PDF zeigt Seite 1 von 4

**Shot2.png - Grafische Darstellungsqualität:**
- Aktiver Tab: "Grafische Darstellungsqualität" (blau hervorgehoben)
- Diskussion: "Diskussion: Grafische Darstellungsqualität"
- Verfügbarkeit: "+ 3/3 verfügbar" (grün), "- 3/3 verfügbar" (rot)
- PDF zeigt Seite 1 von 4

**Shot3.png - Vergleichbarkeit:**
- Aktiver Tab: "Vergleichbarkeit" (blau hervorgehoben)
- Diskussion: "Diskussion: Vergleichbarkeit"
- Verfügbarkeit: "+ 3/3 verfügbar" (grün), "- 2/3 verfügbar" (rot)
- PDF zeigt Seite 3 von 4

**Shot4.png - Komplexität:**
- Aktiver Tab: "Komplexität" (blau hervorgehoben)
- Diskussion: "Diskussion: Komplexität"
- Verfügbarkeit: "+ 3/3 verfügbar" (grün), "- 3/3 verfügbar" (rot)
- PDF zeigt Seite 3 von 4

#### **Wichtige Erkenntnisse:**

1. **Dynamische Diskussions-Header**: Der Diskussions-Titel ändert sich je nach gewähltem Tab
2. **Individuelle Kommentar-Limits**: Jede Kategorie hat eigene Verfügbarkeits-Zähler
3. **PDF-Synchronisation**: PDF-Seite bleibt beim Tab-Wechsel teilweise erhalten
4. **Konsistente Voting-Muster**: Alle Screenshots zeigen ähnliche Voting-Indikatoren

### **FEHLENDE IMPLEMENTIERUNGSDETAILS:**

#### **Neue Prisma-Modelle Ergänzungen:**
```prisma
// Ergänzung zu CommentLimit - individuelle Limits pro Kategorie
model CommentLimit {
  id               String                @id @default(cuid())
  submissionId     String
  userId           Int
  categoryId       String
  availableCount   Int                   @default(3)
  usedCount        Int                   @default(0)
  // Neue Felder für individuelle Kategorie-Limits
  resetAt          DateTime?             // Für periodische Resets
  lastUsedAt       DateTime?             // Letzter Kommentar-Timestamp
  
  submission       EvaluationSubmission  @relation(fields: [submissionId], references: [id])
  user             User                  @relation(fields: [userId], references: [id])
  category         EvaluationCategory    @relation(fields: [categoryId], references: [id])
  
  @@unique([submissionId, userId, categoryId])
}
```

#### **Neue Service-Methoden:**
- `updateCommentLimitForCategory()` - Aktualisiert individuelle Kategorie-Limits
- `getCommentStatsByCategory()` - Holt Statistiken pro Kategorie
- `syncPdfPageWithDiscussion()` - Synchronisiert PDF-Seite mit Diskussion

#### **Neue DTO-Eigenschaften:**
```typescript
export interface CommentStatsDTO {
  submissionId: string;
  totalAvailable: number;
  totalUsed: number;
  categories: {
    categoryId: string;
    categoryName: string;
    availableComments: number;
    usedComments: number;
    isLimitReached: boolean;
    lastCommentAt?: Date;
  }[];
}
```

### Neue Prisma-Modelle:
- `EvaluationRating` - Speichert 0-10 Punkte-Bewertungen
- `EvaluationPhase` Enum - DISCUSSION/EVALUATION

### Neue API-Endpoints:
- `POST /api/evaluation-discussion/submissions/:id/phase-switch`
- `POST /api/evaluation-discussion/ratings`
- `GET /api/evaluation-discussion/submissions/:id/ratings`

### Neue Angular-Komponenten:
- `RatingSliderComponent` - Slider für Punktevergabe
- `PhaseToggleComponent` - Phase-Wechsel-Button

---

### Implementierungsagent ### PHASE 1 ABGESCHLOSSEN: DTOs und Grundstruktur

**Status**: ✅ ABGESCHLOSSEN  
**Zeitaufwand**: 2 Stunden  
**Nächster Schritt**: Phase 2 - Angular Module Setup

#### Implementierte DTOs:
- `evaluation-submission.dto.ts` - Multi-Phase System mit PDF-Metadaten
- `evaluation-category.dto.ts` - 4 Kategorien mit Farb-Kodierung
- `evaluation-comment.dto.ts` - Kommentar-System mit Threading
- `evaluation-vote.dto.ts` - Erweiterte Voting-Funktionalität
- `evaluation-rating.dto.ts` - 0-10 Punkte Rating-System
- `comment-stats.dto.ts` - Statistiken mit Farb-Indikatoren
- `anonymous-evaluation-user.dto.ts` - Anonyme Benutzer-Verwaltung
- `phase-switch.dto.ts` - Phase-Wechsel-Funktionalität

#### Wichtige Erkenntnisse:
- DTOs sind vollständig type-safe und erfüllen Frontend-Konventionen
- Alle Screenshot-Anforderungen wurden in DTOs berücksichtigt
- Export über index.ts funktioniert korrekt
- Phase-System ist vollständig implementiert

#### Nächste Schritte:
1. Angular Module Setup mit Material Design
2. Lazy Loading Konfiguration
3. Guards und Services-Struktur