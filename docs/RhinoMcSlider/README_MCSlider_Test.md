# MCSlider Komponente Test-Dokumentation

## Überblick
Diese Dokumentation beschreibt die Testeinrichtung und -durchführung für die MCSlider-Komponente in HEFL.

## Testdaten-Setup

### Automatische Einrichtung
```bash
# MCSlider Testdaten erstellen
cd server_nestjs
npx ts-node prisma/seed/seedMCSlider.ts
```

### Manuelle Einrichtung
1. Navigiere zu `server_nestjs/prisma/seed/`
2. Führe das Seed-Script aus: `npx ts-node seedMCSlider.ts`
3. Prüfe die Konsolen-Ausgabe auf Erfolg

## Erstellte Testdaten

### ConceptNode
- **Name**: "MCSlider Tests"
- **Beschreibung**: Konzept für MCSlider-Komponenten Tests
- **ID**: Automatisch generiert

### ContentNode
- **Name**: "MCSlider Test Bereich"
- **Beschreibung**: Testbereich für MCSlider-Komponente
- **Position**: 1

### Testfragen

#### 1. Geografie Hauptstädte (Mehrfachauswahl)
- **Typ**: MCSlider
- **Punktzahl**: 3
- **Optionen**: 5 (3 richtig, 2 falsch)
- **Richtige Antworten**: 
  - Berlin - Deutschland
  - Paris - Frankreich
  - Rom - Italien

#### 2. Mathematik Grundlagen (Mehrfachauswahl)
- **Typ**: MCSlider
- **Punktzahl**: 2
- **Optionen**: 4 (3 richtig, 1 falsch)
- **Richtige Antworten**: 
  - 2 + 2 = 4
  - 5 * 3 = 15
  - 7 - 3 = 4

#### 3. Naturwissenschaften (Mehrfachauswahl)
- **Typ**: MCSlider
- **Punktzahl**: 4
- **Optionen**: 5 (3 richtig, 2 falsch)
- **Richtige Antworten**: 
  - Wasser gefriert bei 0°C
  - Licht breitet sich mit ca. 300.000 km/s aus
  - Ein Jahr hat 365 Tage

#### 4. Einfachauswahl Test (Einfachauswahl)
- **Typ**: MCSlider
- **Punktzahl**: 1
- **Optionen**: 4 (1 richtig, 3 falsch)
- **Richtige Antwort**: Berlin

## Test-Durchführung

### 1. Frontend-Test
1. Starte den Angular-Entwicklungsserver: `npm start`
2. Navigiere zu `/dashboard/content-list`
3. Suche nach "MCSlider Test Bereich"
4. Klicke auf MCSlider-Fragen (erkennbar am Carousel-Icon)

### 2. Funktionstest

#### Navigation
- [ ] Vorherige/Nächste Frage Buttons funktionieren
- [ ] Fortschritts-Dots sind klickbar
- [ ] Tastatur-Navigation funktioniert

#### Fragen-Anzeige
- [ ] Fragentext wird korrekt dargestellt
- [ ] Optionen werden angezeigt
- [ ] Single/Multiple Choice wird korrekt unterschieden
- [ ] Punktzahl wird angezeigt

#### Antwort-Auswahl
- [ ] Optionen können ausgewählt werden
- [ ] Mehrfachauswahl funktioniert bei MC-Fragen
- [ ] Einfachauswahl funktioniert bei SC-Fragen
- [ ] Optionen können deselektiert werden

#### Antwort-Submission
- [ ] Einzelne Frage kann abgeschickt werden
- [ ] Alle Fragen können auf einmal abgeschickt werden
- [ ] Feedback wird korrekt angezeigt
- [ ] Punktzahl wird richtig berechnet

#### Feedback-System
- [ ] Korrekte Antworten werden grün markiert
- [ ] Falsche Antworten werden rot markiert
- [ ] Fortschrittsbalken funktioniert
- [ ] Gesamt-Feedback wird angezeigt

### 3. Fehlerbehebung

#### Häufige Probleme

**Problem**: MCSlider-Fragen werden nicht angezeigt
**Lösung**: 
1. Prüfe, ob Testdaten erfolgreich erstellt wurden
2. Kontrolliere die Konsole auf Fehler
3. Überprüfe, ob QuestionDataService korrekt implementiert ist

**Problem**: Dialog öffnet sich nicht
**Lösung**: 
1. Prüfe content-list-item.component.ts Implementierung
2. Kontrolliere MCSlider-Typ-Erkennung
3. Überprüfe Dialog-Service-Integration

**Problem**: Optionen werden nicht geladen
**Lösung**: 
1. Prüfe MCQuestion/MCOption-Tabellen in der Datenbank
2. Kontrolliere API-Endpoints
3. Überprüfe Service-Implementierung

## Datenbank-Verifizierung

### Prüfung der erstellten Daten
```sql
-- Prüfe ConceptNode
SELECT * FROM "ConceptNode" WHERE name = 'MCSlider Tests';

-- Prüfe ContentNode
SELECT * FROM "ContentNode" WHERE name = 'MCSlider Test Bereich';

-- Prüfe Questions
SELECT * FROM "Question" WHERE type = 'MCSlider';

-- Prüfe MCQuestions
SELECT q.text, mcq.* FROM "Question" q
JOIN "MCQuestion" mcq ON q.id = mcq."questionId"
WHERE q.type = 'MCSlider';

-- Prüfe MCOptions
SELECT q.text as question_text, opt.text as option_text, opt.is_correct
FROM "Question" q
JOIN "MCQuestion" mcq ON q.id = mcq."questionId"
JOIN "MCQuestionOption" mqo ON mcq.id = mqo."mcQuestionId"
JOIN "MCOption" opt ON mqo."mcOptionId" = opt.id
WHERE q.type = 'MCSlider';
```

## Cleanup

### Testdaten entfernen
Das Seed-Script führt automatisch ein Cleanup durch, bevor neue Daten erstellt werden.

### Manuelles Cleanup
```sql
-- Achtung: Nur ausführen wenn du sicher bist!
-- Entfernt alle MCSlider-Testdaten

-- Finde ContentNode ID
SELECT id FROM "ContentNode" WHERE name = 'MCSlider Test Bereich';

-- Entferne in dieser Reihenfolge:
-- 1. ContentViews
-- 2. ContentElements
-- 3. MCQuestionOptions
-- 4. MCOptions
-- 5. MCQuestions
-- 6. Questions
-- 7. Training
-- 8. ContentNode
-- 9. ConceptNode
```

## Erwartete Ergebnisse

### Erfolgreiche Tests
- MCSlider-Komponente lädt ohne Fehler
- Alle 4 Testfragen sind verfügbar
- Navigation funktioniert flüssig
- Antwort-Submission funktioniert
- Feedback ist korrekt und vollständig

### Performance-Benchmarks
- Ladezeit: < 2 Sekunden
- Navigationszeit zwischen Fragen: < 100ms
- Submission-Zeit: < 1 Sekunde
- Feedback-Anzeige: < 500ms

## Troubleshooting

### Entwickler-Tools
1. **Browser-Konsole**: Prüfe auf JavaScript-Fehler
2. **Netzwerk-Tab**: Kontrolliere API-Calls
3. **Angular DevTools**: Prüfe Komponenten-Zustand

### Logging
```typescript
// Aktiviere detailliertes Logging in der Komponente
console.log('MCSlider State:', this.componentState);
console.log('Questions:', this.questionStates);
console.log('Current Question:', this.getCurrentQuestionState());
```

### Häufige Fehlerquellen
1. **Fehlende DTOs**: Prüfe Import-Pfade
2. **Service-Fehler**: Kontrolliere QuestionDataService
3. **Dialog-Probleme**: Prüfe Material-Dialog-Konfiguration
4. **Routing-Fehler**: Kontrolliere Navigation-Logik

## Kontakt
Bei Problemen oder Fragen zur MCSlider-Komponente, kontaktiere das Entwicklungsteam oder erstelle ein Issue im Repository.