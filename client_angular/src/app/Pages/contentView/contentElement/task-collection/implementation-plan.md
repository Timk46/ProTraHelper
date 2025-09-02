# Aufgabentyp: Aufgabensammlung (Task Collection)

Dieses Dokument beschreibt die Funktionalität des Aufgabentyps "Aufgabensammlung".

### Zweck

Eine Aufgabensammlung dient dazu, mehrere einzelne Aufgaben (z.B. Multiple Choice, Freitext etc.) zu einer einzigen, zusammenhängenden Lerneinheit zu bündeln. Sie führt den Benutzer in einer vom Dozenten festgelegten Reihenfolge durch die verschiedenen Aufgaben.

### Funktionsweise

Die Komponente `task-collection` agiert als ein übergeordneter Container, der die einzelnen Aufgaben schrittweise darstellt.

1.  **Optionale Startseite**
    *   Eine Sammlung kann eine optionale Einführungsseite haben. Der Inhalt dafür wird im Feld `textHTML` der Sammlung gespeichert.
    *   Wenn dieser Text vorhanden ist, wird er dem Benutzer vor der ersten Aufgabe zusammen mit einem "Los geht's!"-Button angezeigt.

2.  **Sequenzieller Ablauf**
    *   Die Aufgaben werden in der Reihenfolge ihrer `position` angezeigt.
    *   Der Benutzer beginnt mit der ersten unerledigten Aufgabe.
    *   Um zur nächsten Aufgabe zu gelangen, muss die aktuelle Aufgabe erfolgreich abgeschlossen werden (d.h. einen Fortschritt von 100% erreichen). Erst dann wird der "Weiter"-Button aktiv.
    *   Mit dem "Zurück"-Button kann jederzeit zu vorherigen Aufgaben navigiert werden.

3.  **Dynamisches Laden der Aufgaben**
    *   Die `task-collection`-Komponente lädt die Benutzeroberfläche für die jeweilige Aufgabe dynamisch. Basierend auf dem `questionType` der Aufgabe (z.B. `MULTIPLECHOICE`) wird die passende Angular-Komponente (z.B. `McTaskComponent`) zur Laufzeit instanziiert und angezeigt.
    *   Dieses Vorgehen macht das System sehr flexibel und einfach um neue Aufgabentypen erweiterbar.

### Konfiguration als Dozent

1.  **Erstellung:** Eine "Aufgabensammlung" wird wie jeder andere Fragetyp im System erstellt.
2.  **Inhalt:**
    *   **Verknüpfung:** Bestehende Aufgaben können mit der Sammlung verknüpft werden.
    *   **Reihenfolge:** Die Reihenfolge der verknüpften Aufgaben wird über deren `position` im jeweiligen Inhaltsverzeichnis (`content node`) festgelegt.
    *   **Startseite (Optional):** Im `textHTML`-Feld der Sammlung kann ein Einführungstext (inkl. HTML-Formatierung) hinterlegt werden.