# Abgaben einsehen

**Hochgeladene Dateien von Studenten ansehen und verwalten**

---

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Zur Abgabenübersicht navigieren](#zur-abgabenübersicht-navigieren)
3. [Abgaben filtern und sortieren](#abgaben-filtern-und-sortieren)
4. [Datei herunterladen](#datei-herunterladen)
5. [Versionsverlauf ansehen](#versionsverlauf-ansehen)
6. [Abgabestatus überprüfen](#abgabestatus-überprüfen)
7. [Tipps für große Kurse](#tipps-für-große-kurse)

---

## Übersicht

### Was ist die Abgabenübersicht?

Die **Abgabenübersicht** zeigt Ihnen alle **hochgeladenen Dateien** von Studenten für Upload-Aufgaben.

```mermaid
flowchart LR
    Student1[Student A] -->|Upload| File1[projekt_a.pdf]
    Student2[Student B] -->|Upload| File2[abgabe_b.docx]
    Student3[Student C] -->|Upload| File3[code_c.zip]

    File1 --> Overview[Abgaben-<br/>übersicht]
    File2 --> Overview
    File3 --> Overview

    Overview --> Teacher[Dozent kann:<br/>📥 Herunterladen<br/>👁️ Ansehen<br/>📊 Filtern]

    style Overview fill:#e8f5e9
    style Teacher fill:#fff3e0
```

### Wofür brauche ich das?

**Anwendungsfälle:**
- ✅ Überprüfen, **wer bereits abgegeben** hat
- ✅ Dateien **herunterladen** für Bewertung
- ✅ **Mehrfach-Uploads** eines Studenten ansehen (Versionsverlauf)
- ✅ Nach **Konzept, Aufgabe oder Student** filtern
- ✅ **Abgabestatus** für Reports exportieren

---

## Zur Abgabenübersicht navigieren

### Schritt-für-Schritt

```mermaid
flowchart TD
    Start([Als Dozent eingeloggt]) --> Menu[Menü öffnen ☰]
    Menu --> Dozent[Dozentenbereich<br/>auswählen]
    Dozent --> Grading[Abgaben<br/>klicken]
    Grading --> Page[Abgabenübersicht<br/>öffnet sich]

    style Page fill:#e8f5e9
```

**1. Menü öffnen**
   - Klicken Sie auf **☰** (Hamburger-Menü) oben links

**2. Dozentenbereich**
   - Wählen Sie **"Dozentenbereich"**

**3. Abgaben**
   - Unter "Meine Aufgaben" → **"Abgaben"**

**Alternative:**
- Direkt zur Route: `/lecturer/grading/uploads`

### UI-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│ Abgaben                                                     │
├─────────────────────────────────────────────────────────────┤
│ Filter:                                                     │
│ [Alle Konzepte ▼]  [Alle Aufgaben ▼]  [Suche Student___]   │
│                                                             │
│ Sortierung: [Nach Datum ▼] [↓ Absteigend]                  │
├───┬────────────────┬────────────────┬──────────┬───────────┤
│ ▼ │ Konzept        │ Aufgabe        │ Student  │ Datei     │
├───┼────────────────┼────────────────┼──────────┼───────────┤
│ ▶ │ OOP Grundlagen │ Projekt-Abgabe │ Lisa K.  │ 15.11.24  │
├───┼────────────────┼────────────────┼──────────┼───────────┤
│ ▶ │ OOP Grundlagen │ Projekt-Abgabe │ Jan G.   │ 14.11.24  │
├───┼────────────────┼────────────────┼──────────┼───────────┤
│ ▼ │ Datenstrukturen│ Hausaufgabe 3  │ Paul B.  │ 10.11.24  │
│   │                │                │          │ ┌───────┐ │
│   │                │                │          │ │ v3    │ │
│   │                │                │          │ │ v2    │ │
│   │                │                │          │ │ v1 ✓  │ │
│   │                │                │          │ └───────┘ │
└───┴────────────────┴────────────────┴──────────┴───────────┘
```

---

## Abgaben filtern und sortieren

### Filter-Optionen

Die Abgabenübersicht bietet **drei Filter**:

```mermaid
graph TD
    All[Alle Abgaben] --> Filter1{Filter nach<br/>Konzept}
    Filter1 -->|Auswählen| Concept[Nur Abgaben<br/>aus diesem Konzept]

    Concept --> Filter2{Filter nach<br/>Aufgabe}
    Filter2 -->|Auswählen| Task[Nur Abgaben<br/>für diese Aufgabe]

    Task --> Filter3{Suche nach<br/>Student}
    Filter3 -->|Eingeben| Student[Nur Abgaben<br/>dieses Studenten]

    style Concept fill:#e3f2fd
    style Task fill:#fff3e0
    style Student fill:#e8f5e9
```

#### Filter 1: Nach Konzept

**Dropdown:** "Alle Konzepte"

**Zweck:**
- Zeigt nur Abgaben aus einem spezifischen Lernkonzept
- Beispiel: "Objektorientierte Programmierung"

**Wann nutzen:**
- Sie betreuen mehrere Kurse
- Sie wollen sich auf ein Thema fokussieren

**Beispiel:**
```
Vorher: 150 Abgaben (alle Konzepte)
Filter "OOP Grundlagen": 45 Abgaben
```

#### Filter 2: Nach Aufgabe

**Dropdown:** "Alle Aufgaben"

**Zweck:**
- Zeigt nur Abgaben für eine spezifische Upload-Aufgabe
- Beispiel: "Projekt-Abgabe"

**Wann nutzen:**
- Sie wollen nur eine bestimmte Aufgabe bewerten
- Sie prüfen Abgabestatus einer Aufgabe

**Tipp:** Kombinierbar mit Konzept-Filter!

**Beispiel:**
```
Konzept: OOP Grundlagen (45 Abgaben)
+ Aufgabe: Projekt-Abgabe
= 20 Abgaben
```

#### Filter 3: Nach Student

**Textfeld:** "Suche Student"

**Zweck:**
- Findet alle Abgaben eines bestimmten Studenten
- Sucht nach E-Mail oder Name

**Wann nutzen:**
- Student fragt: "Haben Sie meine Abgabe?"
- Sie wollen Abgaben eines Studenten überprüfen
- Sie suchen nach einem bestimmten Upload

**Beispiel:**
```
Eingabe: "lisa.klein@"
Ergebnis: Alle Abgaben von Lisa Klein (aus allen Konzepten/Aufgaben)
```

### Sortier-Optionen

**Dropdown:** "Sortierung"

```mermaid
flowchart LR
    Data[Abgaben] --> Sort{Sortieren nach}

    Sort -->|Datum| Date[Neueste<br/>zuerst]
    Sort -->|Konzept| Concept[Alphabetisch<br/>nach Konzept]
    Sort -->|Aufgabe| Task[Alphabetisch<br/>nach Aufgabe]
    Sort -->|Student| Student[Alphabetisch<br/>nach Student]
    Sort -->|Dateiname| File[Alphabetisch<br/>nach Datei]

    Date --> Order{Reihenfolge}
    Concept --> Order
    Task --> Order
    Student --> Order
    File --> Order

    Order -->|↓| Desc[Absteigend]
    Order -->|↑| Asc[Aufsteigend]
```

**Optionen:**
- **Nach Datum:** Neueste/Älteste zuerst
- **Nach Konzept:** Alphabetisch A-Z oder Z-A
- **Nach Aufgabe:** Alphabetisch
- **Nach Student:** Alphabetisch nach E-Mail
- **Nach Dateiname:** Alphabetisch

**Reihenfolge umkehren:**
- Klick auf **↓/↑** Button neben Dropdown

---

## Datei herunterladen

### Einzelne Datei herunterladen

**Schritt-für-Schritt:**

1. **Abgabe finden**
   - Nutzen Sie Filter/Sortierung
   - Identifizieren Sie die gewünschte Zeile

2. **Download-Icon klicken**
   - Jede Zeile hat ein **📥 Download-Icon**

3. **Browser lädt Datei herunter**
   - Datei wird mit **Original-Namen** gespeichert
   - Beispiel: `projekt_gruppe1.pdf`

**Was passiert im Hintergrund:**

```mermaid
sequenceDiagram
    participant D as Dozent
    participant UI as Frontend
    participant BE as Backend
    participant FS as Dateisystem

    D->>UI: Klick Download-Icon
    UI->>BE: GET /files/{uniqueIdentifier}
    BE->>FS: Datei lesen
    FS-->>BE: Datei-Daten
    BE-->>UI: Blob + X-Filename Header
    UI->>UI: Temporärer Download-Link
    UI-->>D: Browser-Download startet
```

**Technische Details:**
- Backend sendet **X-Filename** Header mit Original-Namen
- Frontend erstellt temporären Blob-URL
- Browser downloaded mit korrektem Dateinamen
- Blob-URL wird nach Download aufgeräumt

### Mehrere Dateien herunterladen

**Aktuell:** Einzeln herunterladen, kein Batch-Download

**Workaround für viele Dateien:**

1. **Filter nutzen:**
   - Konzept + Aufgabe auswählen
   - Reduziert Liste auf relevante Abgaben

2. **Einzeln durchklicken:**
   - Download 1, Download 2, ...
   - Browser öffnet Downloads nacheinander

3. **Dateimanager organisieren:**
   - Alle Downloads landen im Download-Ordner
   - Sortieren Sie dort nach Name/Datum

**🚧 Geplant:**
- Batch-Download (ZIP-Archiv)
- Export als CSV (Metadaten)

---

## Versionsverlauf ansehen

### Was ist der Versionsverlauf?

Wenn ein Student **mehrmals hochlädt**, werden alle Versionen gespeichert:

```mermaid
flowchart TD
    Student[Student: Paul Becker] --> Upload1[Upload 1:<br/>10.11.2024 10:00<br/>hausaufgabe_v1.pdf]
    Upload1 --> Upload2[Upload 2:<br/>11.11.2024 15:30<br/>hausaufgabe_v2.pdf]
    Upload2 --> Upload3[Upload 3:<br/>12.11.2024 09:15<br/>hausaufgabe_final.pdf]

    Upload3 --> Latest[✅ Neueste Version<br/>wird angezeigt]

    style Upload3 fill:#e8f5e9
    style Latest fill:#c8e6c9
```

### Gruppierung

Die Abgabenübersicht **gruppiert** Uploads automatisch:

**Gruppierungs-Kriterien:**
```
Konzept + Aufgabe + Student-E-Mail
```

**Beispiel:**
```
Gruppe 1:
├─ Konzept: "OOP Grundlagen"
├─ Aufgabe: "Hausaufgabe 3"
├─ Student: "paul.becker@uni.de"
└─ Uploads:
   ├─ v3 (12.11.2024 09:15) ← NEUESTE
   ├─ v2 (11.11.2024 15:30)
   └─ v1 (10.11.2024 10:00) ← ÄLTESTE
```

### Versionen anzeigen

**Schritt-für-Schritt:**

1. **Gruppierte Zeile finden**
   - Zeilen mit **▶** (Dreieck) haben mehrere Versionen

2. **Gruppe aufklappen**
   - Klick auf **▶** → wird zu **▼**

3. **Alle Versionen erscheinen:**

```
┌───┬────────────────┬────────────────┬──────────┬──────────────┐
│ ▼ │ OOP Grundlagen │ Hausaufgabe 3  │ Paul B.  │ 12.11.24     │
│   │                │                │          │ ┌──────────┐ │
│   │                │                │          │ │ 📥 v3 ✓  │ │
│   │                │                │          │ │ 12.11.24 │ │
│   │                │                │          │ │ 09:15    │ │
│   │                │                │          │ ├──────────┤ │
│   │                │                │          │ │ 📥 v2    │ │
│   │                │                │          │ │ 11.11.24 │ │
│   │                │                │          │ │ 15:30    │ │
│   │                │                │          │ ├──────────┤ │
│   │                │                │          │ │ 📥 v1    │ │
│   │                │                │          │ │ 10.11.24 │ │
│   │                │                │          │ │ 10:00    │ │
│   │                │                │          │ └──────────┘ │
└───┴────────────────┴────────────────┴──────────┴──────────────┘
```

**Legende:**
- **✓** = Neueste Version (hervorgehoben)
- **v3, v2, v1** = Versions-Nummern (absteigend)
- **Datum + Zeit** = Upload-Zeitstempel
- **📥** = Download-Icon (jede Version einzeln downloadbar)

### Welche Version bewerten?

**Empfehlung:** Immer die **neueste Version** (mit ✓)

**Warum?**
- Student hat möglicherweise Fehler korrigiert
- Neueste = Student's finale Abgabe
- Ältere Versionen = Entwürfe/Zwischenstände

**Ausnahme:**
- Sie wollen Versionsverlauf nachvollziehen
- Verdacht auf Plagiat (Vergleich mit älteren Versionen)

---

## Abgabestatus überprüfen

### Wer hat abgegeben?

**Frage:** "Haben alle Studenten abgegeben?"

**Antwort finden:**

1. **Filter nach Aufgabe** setzen
   - Beispiel: "Projekt-Abgabe"

2. **Anzahl zählen:**
   - Wie viele Zeilen werden angezeigt?
   - Beispiel: 18 Abgaben

3. **Mit Teilnehmerzahl vergleichen:**
   - Kurs hat 20 Studenten
   - 18 haben abgegeben
   - **2 fehlen noch**

### Wer fehlt?

**Aktuell:** Manueller Abgleich nötig

**Vorgehensweise:**

1. **Exportieren Sie Studentenliste**
   - Aus Benutzerverwaltung oder LMS

2. **Exportieren Sie Abgabenliste**
   - Screenshot oder manuelle Notiz

3. **Vergleichen:**
   - Wer ist in Studentenliste, aber nicht in Abgabenliste?

**Beispiel-Abgleich:**
```
Studentenliste:              Abgabenliste:
├─ Lisa Klein                ├─ Lisa Klein ✅
├─ Jan Groß                  ├─ Jan Groß ✅
├─ Sara Braun                ├─ Paul Becker ✅
├─ Tim Neu                   └─ Eva Lang ✅
├─ Paul Becker
├─ Eva Lang
├─ Finn Kurz                 ← FEHLT
└─ Nina Alt                  ← FEHLT
```

**🚧 Geplant:**
- Automatische Abgabestatus-Übersicht
- Export als CSV mit allen Studenten + Status
- Filter: "Nur fehlende Abgaben"

### Abgabezeitpunkt überprüfen

**Frage:** "Wer hat nach Deadline abgegeben?"

**Vorgehensweise:**

1. **Sortieren nach Datum** (neueste zuerst)

2. **Deadline merken**
   - Beispiel: 15.11.2024 23:59

3. **Liste durchgehen:**
   - Abgaben **nach** 15.11.2024 → Verspätung

**Beispiel:**
```
Sorted by Date (neueste zuerst):
├─ 16.11.2024 10:30 - Lisa Klein   ← VERSPÄTET
├─ 15.11.2024 23:45 - Jan Groß     ← PÜNKTLICH
├─ 15.11.2024 18:00 - Sara Braun   ← PÜNKTLICH
└─ 14.11.2024 09:15 - Tim Neu      ← PÜNKTLICH
```

**Tipp:** Kommunizieren Sie Konsequenzen für Verspätung vorab!

---

## Tipps für große Kurse

### 📊 Große Datenmengen verwalten

**Problem:** 100+ Studenten, 5 Aufgaben = 500+ Abgaben

**Lösung 1: Filter kombinieren**
```
Schritt 1: Konzept auswählen (z.B. "OOP Grundlagen")
  → 150 Abgaben

Schritt 2: Aufgabe auswählen (z.B. "Projekt-Abgabe")
  → 30 Abgaben

Schritt 3: Überschaubare Liste!
```

**Lösung 2: Aufgaben nacheinander bewerten**
- Nicht alle auf einmal
- Pro Woche: 1 Aufgabe komplett
- Vermeidet Überforderung

### 📁 Download-Organisation

**Problem:** 30 Dateien heruntergeladen, alle heißen "abgabe.pdf"

**Lösung 1: Browser-Downloads umbenennen**
- Nach Download: Rechtsklick → "Umbenennen"
- Schema: `[Student]_[Aufgabe].pdf`
- Beispiel: `Lisa_Klein_Projekt.pdf`

**Lösung 2: Ordnerstruktur**
```
Downloads/
├─ OOP_Grundlagen/
│  ├─ Projekt_Abgabe/
│  │  ├─ Lisa_Klein_Projekt.pdf
│  │  ├─ Jan_Gross_Projekt.pdf
│  │  └─ ...
│  └─ Hausaufgabe_3/
│     ├─ ...
└─ Datenstrukturen/
   └─ ...
```

**Lösung 3: Batch-Umbenennung**
- Tools: Bulk Rename Utility (Windows), Automator (Mac)
- Regex-Patterns für systematische Umbenennung

### ⏱️ Zeitmanagement

**Problem:** 100 Abgaben bewerten = viel Zeit

**Strategie 1: Bewertungsraster**
```
Schnelle Bewertung pro Abgabe:
├─ 2 Min: Datei öffnen + überfliegen
├─ 3 Min: Detailprüfung anhand Kriterien
├─ 2 Min: Note eintragen + Feedback
└─ = 7 Min pro Abgabe

100 Abgaben × 7 Min = 700 Min = ~12 Stunden
Verteilung: 3 Stunden pro Tag, 4 Tage = machbar
```

**Strategie 2: Peer-Review nutzen**
- Studenten bewerten gegenseitig (70%)
- Sie stichprobenartig (30%)
- **Siehe:** [Peer-Review einrichten](04-peer-review-einrichten.md)

**Strategie 3: Automatisierte Tests**
- Für Code-Aufgaben: Judge0
- Für Formatierung: Automatische Checks
- Reduziert manuelle Arbeit

### 🔍 Verdacht auf Plagiat

**Workflow:**

1. **Versionsverlauf prüfen**
   - Gab es Zwischen-Uploads?
   - Plötzlicher Qualitätssprung verdächtig

2. **Vergleich mit anderen Abgaben**
   - Download beide Dateien
   - Manueller Vergleich oder Tools (z.B. Diff-Tool)

3. **Externe Quellen prüfen**
   - Google-Suche nach spezifischen Textpassagen
   - Plagiat-Checker (falls verfügbar)

4. **Student kontaktieren**
   - Persönliches Gespräch
   - Nachfragen zu Konzepten

---

## Zusammenfassung: Workflow

```mermaid
flowchart TD
    Start([Abgaben bewerten]) --> Navigate[Zu Abgabenübersicht<br/>navigieren]

    Navigate --> Filter{Filter<br/>setzen?}
    Filter -->|Ja| SelectFilter[Konzept + Aufgabe<br/>auswählen]
    Filter -->|Nein| List[Alle Abgaben<br/>anzeigen]

    SelectFilter --> List
    List --> Sort[Sortierung<br/>wählen]

    Sort --> Review{Bewertung<br/>starten}
    Review -->|Ja| Download[Dateien<br/>herunterladen]
    Review -->|Nein| Status[Nur Status<br/>überprüfen]

    Download --> Evaluate[Offline bewerten]
    Status --> Count[Anzahl<br/>zählen]

    Evaluate --> Done1[✅ Bewertung<br/>abgeschlossen]
    Count --> Done2[✅ Status<br/>bekannt]

    style Done1 fill:#e8f5e9
    style Done2 fill:#e8f5e9
```

---

## Häufige Fragen

### Kann ich Abgaben direkt im Browser ansehen?

**Aktuell:** Nein, nur Download möglich

**Workaround:**
- Datei herunterladen
- Mit lokalem PDF-Viewer öffnen

**🚧 Geplant:**
- Inline PDF-Viewer
- Direkte Annotation im Browser

### Werden gelöschte Uploads behalten?

**Ja!** Wenn ein Student eine Datei **ersetzt**, bleibt die alte Version erhalten.

**Aber:** Wenn Sie als Dozent eine Aufgabe **löschen**, gehen alle Uploads verloren.

### Kann ich Abgaben kommentieren/annotieren?

**Aktuell:** Nein, keine integrierte Funktion

**Workaround:**
- PDF lokal mit Annotations-Software bearbeiten (z.B. Adobe Acrobat)
- Kommentierte Version per Mail zurücksenden oder in LMS hochladen

**🚧 Geplant:**
- Inline-Kommentare
- Rubric-basierte Bewertung

### Wie exportiere ich Abgabenliste?

**Aktuell:** Screenshot oder manuelle Übertragung

**🚧 Geplant:**
- CSV-Export
- Excel-Export mit Metadaten

---

## Weiterführende Themen

- **Upload-Aufgabe erstellen:** → [01-inhalte-verwalten.md](01-inhalte-verwalten.md#aufgabe-hinzufügen)
- **Peer-Review einrichten:** → [04-peer-review-einrichten.md](04-peer-review-einrichten.md)
- **Studentengruppen:** → [03-studentengruppen-verwalten.md](03-studentengruppen-verwalten.md)

---

*Zurück zur [Übersicht](00-uebersicht-dozentenbereich.md)*
