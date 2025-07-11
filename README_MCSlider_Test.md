# MCSlider Test Setup

## Übersicht

Dieses Setup erstellt Testdaten für die neue MCSlider-Komponente. Die Komponente zeigt mehrere Multiple-Choice-Fragen in einem Slider-Interface an.

## Automatisches Setup

```bash
# Führen Sie das Setup-Skript aus
./setup_mcslider_test.sh
```

## Manuelles Setup

Falls Sie die Datenbank manuell konfigurieren möchten:

```bash
# Führen Sie die SQL-Datei direkt aus
psql "your_database_url" -f create_mcslider_test_data.sql
```

## Erstelle Testdaten

Das Skript erstellt:

1. **Einen Content-Node**: "MCSlider Test Bereich"
2. **Drei Test-Fragen**:
   - **Geographie**: "Was ist die Hauptstadt von Deutschland?"
   - **Mathematik**: "Was ist 2 + 2?"
   - **Naturwissenschaft**: "Welches Element hat das Symbol 'O'?"
3. **Multiple-Choice-Optionen** für jede Frage
4. **Content-Verknüpfungen** um die Fragen anzuzeigen

## Testen der Komponente

Nach dem Setup:

1. **Starten Sie den Angular-Entwicklungsserver**:
   ```bash
   cd client_angular
   npm start
   ```

2. **Navigieren Sie zu einer Content-Liste**

3. **Suchen Sie nach "MCSlider Test Bereich"**

4. **Klicken Sie auf eine MCSlider-Frage** (erkennbar am Karussell-Symbol)

5. **Die MCSlider-Komponente öffnet sich** mit:
   - ✅ Slider-Navigation mit Pfeiltasten
   - ✅ Progress-Dots zur direkten Navigation
   - ✅ Einzelfrage-Submission
   - ✅ Gesamtbereich-Submission
   - ✅ Visuelles Feedback (richtig/falsch)
   - ✅ Responsive Design

## Funktionen der MCSlider-Komponente

### Navigation
- **Pfeiltasten**: Links/Rechts navigieren
- **Progress-Dots**: Direkter Sprung zu einer Frage
- **Keyboard-Navigation**: Vollständig zugänglich

### Submission
- **Einzelfrage**: Jede Frage kann einzeln beantwortet werden
- **Batch-Submission**: Alle Fragen auf einmal absenden
- **Retry-Funktion**: Falsche Antworten erneut versuchen

### Feedback
- **Sofortiges Feedback**: Nach jeder Submission
- **Farbcodierung**: Grün (richtig), Rot (falsch), Gelb (teilweise)
- **Endergebnis**: Gesamtpunktzahl und Einzelergebnisse

### Responsive Design
- **Mobile-First**: Touch-freundliche Bedienung
- **Breakpoints**: Optimiert für alle Bildschirmgrößen
- **Accessibility**: WCAG-konform

## Troubleshooting

### Datenbank-Verbindung
Wenn die Verbindung zur Datenbank fehlschlägt:

```bash
# Überprüfen Sie die Umgebungsvariable
echo $DATABASE_URL

# Oder setzen Sie sie manuell
export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### Fehlende Abhängigkeiten
Falls TypeScript-Fehler auftreten:

```bash
# Kompilierung überprüfen
cd client_angular
npx tsc --noEmit

# Abhängigkeiten installieren
npm install
```

### Komponente erscheint nicht
1. Überprüfen Sie, ob die Testdaten erstellt wurden:
   ```sql
   SELECT * FROM "Question" WHERE type = 'MCSlider';
   ```

2. Stellen Sie sicher, dass die Angular-Anwendung neu gestartet wurde

3. Überprüfen Sie die Browser-Konsole auf Fehler

## Aufräumen

Um die Testdaten zu entfernen:

```sql
-- Testdaten entfernen
DELETE FROM "ContentView" WHERE "contentNodeId" IN (SELECT id FROM "ContentNode" WHERE name = 'MCSlider Test Bereich');
DELETE FROM "ContentElement" WHERE title LIKE 'MCSlider Test Frage%';
DELETE FROM "MCQuestionOption" WHERE "mcQuestionId" IN (SELECT id FROM "MCQuestion" WHERE "questionId" IN (SELECT id FROM "Question" WHERE type = 'MCSlider'));
DELETE FROM "MCQuestion" WHERE "questionId" IN (SELECT id FROM "Question" WHERE type = 'MCSlider');
DELETE FROM "MCOption" WHERE text IN ('Berlin', 'München', 'Hamburg', 'Frankfurt', '4', '3', '5', '2', 'Sauerstoff', 'Kohlenstoff', 'Wasserstoff', 'Stickstoff');
DELETE FROM "Question" WHERE type = 'MCSlider';
DELETE FROM "Training" WHERE "contentNodeId" IN (SELECT id FROM "ContentNode" WHERE name = 'MCSlider Test Bereich');
DELETE FROM "ContentNode" WHERE name = 'MCSlider Test Bereich';
```

## Kontakt

Bei Fragen oder Problemen wenden Sie sich an das Entwicklungsteam.