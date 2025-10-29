# Inhalte verwalten

**Wie Sie Lehrinhalte erstellen, organisieren und verwalten**

---

## Inhaltsverzeichnis

1. [Übersicht: Was ist Content-Management?](#übersicht)
2. [Edit-Modus aktivieren](#edit-modus-aktivieren)
3. [Neuen Inhaltsbereich erstellen](#neuen-inhaltsbereich-erstellen)
4. [Aufgabe hinzufügen](#aufgabe-hinzufügen)
5. [Inhalte neu anordnen](#inhalte-neu-anordnen)
6. [Sichtbarkeit steuern](#sichtbarkeit-steuern)
7. [Inhalte bearbeiten](#inhalte-bearbeiten)
8. [Inhalte löschen](#inhalte-löschen)

---

## Übersicht

### Was ist Content-Management?

Im HEFL-System organisieren Sie Ihre Lehrinhalte in einer **3-stufigen Hierarchie**:

```mermaid
graph TD
    A[Konzept<br/>z.B. 'Objektorientierte Programmierung'] --> B1[Inhaltsbereich 1<br/>'Einführung']
    A --> B2[Inhaltsbereich 2<br/>'Übungen']
    A --> B3[Inhaltsbereich 3<br/>'Projekt']

    B1 --> C1[Aufgabe 1: Video]
    B1 --> C2[Aufgabe 2: Multiple Choice]
    B1 --> C3[Aufgabe 3: Lückentext]

    B2 --> C4[Aufgabe 4: Code-Aufgabe]
    B2 --> C5[Aufgabe 5: Upload]

    B3 --> C6[Aufgabe 6: Projekt-Abgabe]

    style A fill:#e3f2fd
    style B1 fill:#fff3e0
    style B2 fill:#fff3e0
    style B3 fill:#fff3e0
    style C1 fill:#e8f5e9
    style C2 fill:#e8f5e9
    style C3 fill:#e8f5e9
    style C4 fill:#e8f5e9
    style C5 fill:#e8f5e9
    style C6 fill:#e8f5e9
```

**Ebene 1: Konzept** (wird vom Admin erstellt)
- Übergeordnetes Lernthema
- Beispiele: "Objektorientierte Programmierung", "Datenstrukturen", "CAD-Modellierung"

**Ebene 2: Inhaltsbereich** (Sie erstellen diese)
- Thematische Abschnitte innerhalb eines Konzepts
- Beispiele: "Einführung", "Übungen", "Vertiefung", "Projekt"
- Entspricht oft einer Woche oder einem Kapitel

**Ebene 3: Aufgaben** (Sie erstellen diese)
- Einzelne Lernaktivitäten
- Beispiele: Multiple Choice, Code-Aufgaben, Uploads, Videos

---

## Edit-Modus aktivieren

### Wo finde ich den Edit-Modus?

1. Navigieren Sie zu einem **Lernkonzept**
   - Beispiel-URL: `/concept/objektorientierte-programmierung`
2. Oben rechts sehen Sie einen **Schalter** mit "Edit-Modus"
3. Klicken Sie auf den Schalter

### Was ändert sich?

```mermaid
flowchart LR
    Normal[Normale Ansicht] -->|Edit-Modus<br/>aktivieren| Edit[Edit-Ansicht]
    Edit -->|Edit-Modus<br/>deaktivieren| Normal

    Normal --> N1[Studenten-Perspektive<br/>Nur lesen]
    Edit --> E1[+ Aufgabe hinzufügen<br/>✏️ Bearbeiten-Icons<br/>🗑️ Löschen-Icons<br/>⚪ Drag-Handles]

    style Edit fill:#fff3e0
    style E1 fill:#e8f5e9
```

**Im Edit-Modus sehen Sie:**
- ➕ **"+ Aufgabe hinzufügen"**-Buttons
- ✏️ **Bearbeiten-Icons** (Stift) auf Inhaltsbereichen
- 🗑️ **Löschen-Icons** (Papierkorb)
- 👁️ **Sichtbarkeits-Icons** (Auge/Durchgestrichenes Auge)
- ⚪ **Drag-Handles** für Neu-Anordnung

**Wichtig:** Studenten sehen Ihre Änderungen erst **nach dem Speichern**!

---

## Neuen Inhaltsbereich erstellen

### Was ist ein Inhaltsbereich?

Ein **Inhaltsbereich** (auch "Content Panel" oder "Content Node") ist ein Container für zusammengehörige Aufgaben.

**Beispiel-Struktur:**
```
Konzept: Software Engineering
├─ Inhaltsbereich 1: "Woche 1 - Grundlagen"
│  ├─ Video: Einführung
│  ├─ Multiple Choice: Wissenstest
│  └─ Lesetext: Weiterführende Literatur
│
├─ Inhaltsbereich 2: "Woche 2 - UML-Diagramme"
│  ├─ UML-Aufgabe: Klassendiagramm
│  └─ Upload: Eigenes Diagramm
│
└─ Inhaltsbereich 3: "Abschlussprojekt"
   └─ Upload: Projektdokumentation
```

### Schritt-für-Schritt: Inhaltsbereich erstellen

**Aktueller Status:** Diese Funktion wird über die Content-Linker-API unterstützt, ist aber möglicherweise in einer separaten Admin-Ansicht verfügbar.

**Alternative:** Wenden Sie sich an Ihren Systemadministrator, um neue Inhaltsbereiche anzulegen.

---

## Aufgabe hinzufügen

### Zwei Möglichkeiten

Wenn Sie auf **"+ Aufgabe hinzufügen"** klicken, öffnet sich ein Dialog mit zwei Optionen:

```mermaid
flowchart TD
    Start["+ Aufgabe hinzufügen" klicken] --> Dialog{Dialog öffnet}

    Dialog --> Tab1[Tab: Neue erstellen]
    Dialog --> Tab2[Tab: Vorhandene verknüpfen]

    Tab1 --> New1[Aufgabentyp wählen]
    New1 --> New2[Titel, Schwierigkeit,<br/>Punkte eingeben]
    New2 --> New3[Speichern]
    New3 --> Result1[✅ Neue Aufgabe erstellt<br/>und verknüpft]

    Tab2 --> Existing1[Dropdown öffnen]
    Existing1 --> Existing2[Aufgabe auswählen]
    Existing2 --> Existing3[Speichern]
    Existing3 --> Result2[✅ Vorhandene Aufgabe<br/>verknüpft]

    style Tab1 fill:#e8f5e9
    style Tab2 fill:#e3f2fd
    style Result1 fill:#c8e6c9
    style Result2 fill:#bbdefb
```

### Option 1: Neue Aufgabe erstellen

**Schritt-für-Schritt:**

1. **Aufgabentyp wählen**
   - Multiple Choice (Einfach-/Mehrfachauswahl)
   - Programmieraufgabe
   - Code Game
   - Lückentext
   - Freitext
   - Graph-Aufgaben
   - UML-Diagramm
   - Datei-Upload
   - Bewertungsübersicht (für Peer-Review)
   - Fragensammlung

   **Mehr zu Typen:** → [Aufgabentypen-Referenz](02-aufgabentypen-erstellen.md)

2. **Metadaten eingeben**
   - **Aufgabentitel:** Kurze Beschreibung (z.B. "Wissenstest OOP")
   - **Schwierigkeit:** Level 1 (Grundlagen) bis 5 (Experte)
   - **Punkte:** Maximale Punktzahl (z.B. 10)

3. **Content-Element-Informationen**
   - **Element-Titel:** Kann identisch sein
   - **Beschreibung:** Optional
   - **Position:** Wo soll die Aufgabe erscheinen? (Anfang/Ende)

4. **Speichern klicken**

**Ergebnis:**
- Aufgabe wird erstellt
- Aufgabe wird dem Inhaltsbereich hinzugefügt
- Sie werden zur Detailbearbeitung weitergeleitet

### Option 2: Vorhandene Aufgabe verknüpfen

**Wann nützlich?**
- Sie möchten dieselbe Aufgabe in mehreren Konzepten verwenden
- Sie möchten Aufgaben wiederverwenden

**Schritt-für-Schritt:**

1. **Tab "Vorhandene verknüpfen" öffnen**

2. **Dropdown-Menü öffnen**
   - Zeigt alle Aufgaben, die noch nicht verknüpft sind

3. **Aufgabe auswählen**
   - Suchfunktion nutzen
   - Nach Titel oder Typ filtern

4. **Position wählen**
   - Wo soll die Aufgabe eingefügt werden?

5. **Speichern klicken**

**Ergebnis:**
- Aufgabe erscheint im Inhaltsbereich
- Änderungen an der Aufgabe wirken sich auf ALLE Verknüpfungen aus

---

## Inhalte neu anordnen

### Aufgaben innerhalb eines Bereichs verschieben

**Per Drag & Drop:**

```mermaid
flowchart LR
    A[Aufgabe 1] --> B[Aufgabe 2]
    B --> C[Aufgabe 3]
    C --> D[Aufgabe 4]

    A2[Aufgabe 1] -.Drag.-> X[ ]
    B2[Aufgabe 3] --> A2
    X[Aufgabe 2] --> B2
    D2[Aufgabe 4] --> X

    subgraph Vorher
        A
        B
        C
        D
    end

    subgraph Nachher
        A2
        B2
        X
        D2
    end

    style B fill:#fff3e0
    style X fill:#e8f5e9
```

**Schritt-für-Schritt:**

1. **Edit-Modus aktivieren**

2. **Drag-Handle greifen**
   - Jede Aufgabe hat links ein **⚪ Drag-Handle** (sechs Punkte)

3. **Aufgabe ziehen**
   - Klicken und halten
   - An neue Position ziehen
   - Loslassen

4. **Automatisches Speichern**
   - Die neue Reihenfolge wird sofort gespeichert
   - Studenten sehen die neue Reihenfolge

**Was Studenten sehen:**
- Aufgaben erscheinen in der neuen Reihenfolge
- Keine Benachrichtigung über Änderung

### Inhaltsbereiche (Panels) verschieben

**Per Drag & Drop:**

```mermaid
flowchart TD
    Start[Panel-Header greifen] --> Drag[Ziehen]
    Drag --> Drop[An neuer Position ablegen]
    Drop --> Save[✅ Automatisch gespeichert]

    style Save fill:#e8f5e9
```

**Schritt-für-Schritt:**

1. **Panel-Header greifen**
   - Klicken Sie auf den **Titel** des Inhaltsbereichs
   - Halten Sie die Maustaste gedrückt

2. **Ziehen**
   - Nach oben oder unten ziehen
   - Andere Panels rutschen automatisch zur Seite

3. **Ablegen**
   - Maustaste loslassen
   - Panel-Position wird gespeichert

**Tipp:** Sie können Panels nur innerhalb desselben Konzepts verschieben, nicht zwischen Konzepten.

---

## Sichtbarkeit steuern

### Warum Sichtbarkeit ändern?

**Anwendungsfälle:**
- 📅 **Inhalte zeitgesteuert freischalten** (z.B. wöchentlich)
- 🏗️ **Inhalte vorbereiten**, bevor Studenten sie sehen
- 🔒 **Veraltete Inhalte verbergen**, ohne sie zu löschen
- 🎯 **Prüfungen vorbereiten**, die erst später sichtbar werden

### Sichtbarkeit von Aufgaben

```mermaid
stateDiagram-v2
    [*] --> Sichtbar
    Sichtbar --> Unsichtbar: Auge-Icon klicken
    Unsichtbar --> Sichtbar: Auge-Icon klicken

    Sichtbar: 👁️ Studenten sehen die Aufgabe
    Unsichtbar: 👁️‍🗨️ Nur Dozenten sehen die Aufgabe
```

**Schritt-für-Schritt:**

1. **Edit-Modus aktivieren**

2. **Auge-Icon finden**
   - Neben jeder Aufgabe sehen Sie ein **Auge-Icon**
   - 👁️ = Sichtbar für Studenten
   - 👁️‍🗨️ = Unsichtbar (nur für Sie)

3. **Icon klicken**
   - Einmal klicken wechselt den Status
   - Änderung wird sofort gespeichert

4. **Status überprüfen**
   - Unsichtbare Aufgaben sind grau hinterlegt
   - Studenten sehen diese Aufgaben NICHT

### Sichtbarkeit von Inhaltsbereichen

**Schritt-für-Schritt:**

1. **Panel-Header finden**
   - Jeder Inhaltsbereich hat einen Titel-Balken

2. **Auge-Icon klicken**
   - Befindet sich rechts oben im Panel-Header

3. **Effekt:**
   - **Unsichtbarer Panel** = ALLE Aufgaben darin sind für Studenten unsichtbar
   - Auch wenn einzelne Aufgaben auf "sichtbar" stehen

**Wichtig:** Panel-Sichtbarkeit überschreibt Aufgaben-Sichtbarkeit!

```
Panel unsichtbar + Aufgabe sichtbar = Student sieht NICHTS
Panel sichtbar + Aufgabe unsichtbar = Student sieht Panel, aber nicht die Aufgabe
Panel sichtbar + Aufgabe sichtbar = Student sieht beides
```

---

## Inhalte bearbeiten

### Aufgabe bearbeiten

**Schritt-für-Schritt:**

1. **Aufgabe finden**
   - Im Edit-Modus

2. **Bearbeiten-Icon klicken**
   - ✏️ Stift-Icon neben der Aufgabe

3. **Editor öffnet sich**
   - Je nach Aufgabentyp unterschiedliche Editoren
   - Siehe: [Aufgabentypen-Referenz](02-aufgabentypen-erstellen.md)

4. **Änderungen vornehmen**
   - Text ändern
   - Optionen anpassen
   - Punkte ändern
   - etc.

5. **Speichern**
   - **"Speichern (aktualisieren)"** = Erstellt neue Version
   - Alte Version bleibt erhalten (Versionierung)

### Inhaltsbereich bearbeiten

**Schritt-für-Schritt:**

1. **Panel-Header finden**

2. **Bearbeiten-Icon klicken**
   - ✏️ Stift-Icon im Panel-Header

3. **Dialog öffnet sich**
   - **Name:** Titel des Inhaltsbereichs
   - **Beschreibung:** Optionale Beschreibung
   - **Level:** Schwierigkeit (1-5)

4. **Speichern klicken**

**Ergebnis:**
- Panel-Titel ändert sich sofort
- Studenten sehen die neue Bezeichnung

---

## Inhalte löschen

### ⚠️ Wichtig: Was passiert beim Löschen?

```mermaid
flowchart TD
    Delete{Was löschen?}

    Delete -->|Aufgabe<br/>löschen| Task[Aufgabe aus Inhaltsbereich<br/>entfernen]
    Delete -->|Panel<br/>löschen| Panel[Inhaltsbereich aus<br/>Konzept entfernen]

    Task --> Task2[Aufgabe bleibt<br/>in Datenbank]
    Task2 --> Task3[✅ Kann wiederverknüpft<br/>werden]

    Panel --> Panel2[Panel bleibt<br/>in Datenbank]
    Panel2 --> Panel3[Aufgaben bleiben<br/>erhalten]
    Panel3 --> Panel4[✅ Kann wiederverknüpft<br/>werden]

    style Task3 fill:#e8f5e9
    style Panel4 fill:#e8f5e9
```

**Gute Nachricht:**
- Löschen entfernt nur die **Verknüpfung**
- Die Aufgabe/der Panel selbst bleibt erhalten
- Sie können sie später wiederverwenden

**Schlechte Nachricht:**
- Studenten sehen die Aufgabe sofort nicht mehr
- Keine Warnung, wenn Studenten bereits bearbeitet haben

### Aufgabe löschen

**Schritt-für-Schritt:**

1. **Edit-Modus aktivieren**

2. **Löschen-Icon klicken**
   - 🗑️ Papierkorb-Icon neben der Aufgabe

3. **Bestätigung**
   - Dialog: "Möchten Sie diese Verknüpfung wirklich entfernen?"
   - **Ja** = Aufgabe verschwindet aus diesem Inhaltsbereich
   - **Nein** = Abbrechen

4. **Ergebnis:**
   - Aufgabe ist nicht mehr sichtbar (auch nicht für Studenten)
   - Aufgabe kann über "Vorhandene verknüpfen" wiederhergestellt werden

### Inhaltsbereich löschen

**Schritt-für-Schritt:**

1. **Panel-Header finden**

2. **Löschen-Icon klicken**
   - 🗑️ Papierkorb-Icon im Panel-Header

3. **Bestätigung**
   - Warnung: "Link wird entfernt, Inhalte bleiben erhalten"

4. **Ergebnis:**
   - Panel verschwindet aus dem Konzept
   - Alle Aufgaben darin sind für Studenten unsichtbar
   - Panel kann von Admin wiederverknüpft werden

---

## Zusammenfassung: Workflow-Übersicht

```mermaid
flowchart TD
    Start([Konzept öffnen]) --> EditMode{Edit-Modus<br/>aktivieren?}

    EditMode -->|Ja| Actions{Was tun?}
    EditMode -->|Nein| View[Studenten-<br/>Ansicht]

    Actions -->|Aufgabe<br/>hinzufügen| Add["+ Aufgabe hinzufügen"<br/>klicken]
    Actions -->|Neu<br/>anordnen| Reorder[Drag & Drop<br/>nutzen]
    Actions -->|Sichtbarkeit<br/>ändern| Visibility[Auge-Icon<br/>klicken]
    Actions -->|Bearbeiten| Edit[Stift-Icon<br/>klicken]
    Actions -->|Löschen| Delete[Papierkorb-Icon<br/>klicken]

    Add --> AddDialog{Neue oder<br/>vorhandene?}
    AddDialog -->|Neu| CreateNew[Formular<br/>ausfüllen]
    AddDialog -->|Vorhandene| LinkExisting[Dropdown<br/>auswählen]

    CreateNew --> Save1[Speichern]
    LinkExisting --> Save2[Speichern]

    Save1 --> Done1[✅ Aufgabe erstellt]
    Save2 --> Done2[✅ Aufgabe verknüpft]

    Reorder --> AutoSave[✅ Auto-Save]
    Visibility --> AutoSave
    Edit --> ManualSave[Speichern klicken]
    Delete --> Confirm[Bestätigen]

    ManualSave --> Done3[✅ Gespeichert]
    Confirm --> Done4[✅ Gelöscht]

    style EditMode fill:#fff3e0
    style Done1 fill:#e8f5e9
    style Done2 fill:#e8f5e9
    style Done3 fill:#e8f5e9
    style Done4 fill:#ffcdd2
    style AutoSave fill:#e8f5e9
```

---

## Tipps und Best Practices

### 📅 Inhalte zeitgesteuert freischalten

**Problem:** Sie wollen Inhalte wöchentlich freigeben, aber alles vorher vorbereiten.

**Lösung:**
1. Erstellen Sie alle Inhaltsbereiche im Voraus
2. Setzen Sie sie auf "unsichtbar" (👁️‍🗨️)
3. Schalten Sie jede Woche manuell sichtbar

**Tipp:** Nutzen Sie klare Namen wie "Woche 1", "Woche 2", etc.

### 🏗️ Inhalte schrittweise entwickeln

**Problem:** Sie wollen Inhalte vorbereiten, während Studenten bereits auf andere Inhalte zugreifen.

**Lösung:**
- Erstellen Sie neue Aufgaben als "unsichtbar"
- Testen Sie sie selbst (Dozenten sehen alles)
- Schalten Sie sichtbar, wenn fertig

### 🎯 Klare Struktur für Studenten

**Problem:** Studenten verlieren Überblick bei vielen Aufgaben.

**Lösung:**
- Nutzen Sie **aussagekräftige Panel-Namen**
  - ✅ "Woche 1: Grundlagen OOP"
  - ❌ "Panel 1"
- Gruppieren Sie **thematisch verwandte Aufgaben**
- Nutzen Sie **Schwierigkeitslevel konsistent**

### 🔄 Aufgaben wiederverwenden

**Problem:** Dieselbe Aufgabe soll in mehreren Kursen auftauchen.

**Lösung:**
- Erstellen Sie die Aufgabe **einmal**
- Verknüpfen Sie sie in allen relevanten Konzepten
- **Vorteil:** Änderungen wirken überall

**Achtung:** Wenn Sie die Aufgabe ändern, ändert sie sich in ALLEN Kursen!

---

## Häufige Fehler vermeiden

### ❌ Fehler 1: Aufgabe löschen statt ausblenden

**Problem:** Sie löschen eine Aufgabe, wollen sie aber später wieder nutzen.

**Lösung:** Nutzen Sie stattdessen "Unsichtbar schalten" (👁️‍🗨️)

### ❌ Fehler 2: Panel unsichtbar, Aufgaben sichtbar

**Problem:** Studenten sehen nichts, obwohl Aufgaben auf "sichtbar" stehen.

**Lösung:** Überprüfen Sie die **Panel-Sichtbarkeit**! Diese überschreibt Aufgaben-Sichtbarkeit.

### ❌ Fehler 3: Keine Versionierung nutzen

**Problem:** Sie überschreiben eine Aufgabe und verlieren die alte Version.

**Lösung:** Nutzen Sie "Speichern (neue Version)" statt "Überschreiben"

---

## Weiterführende Themen

- **Aufgabentypen im Detail:** → [02-aufgabentypen-erstellen.md](02-aufgabentypen-erstellen.md)
- **Gruppen verwalten:** → [03-studentengruppen-verwalten.md](03-studentengruppen-verwalten.md)
- **Peer-Review einrichten:** → [04-peer-review-einrichten.md](04-peer-review-einrichten.md)
- **Best Practices:** → [08-best-practices.md](08-best-practices.md)

---

*Zurück zur [Übersicht](00-uebersicht-dozentenbereich.md)*
