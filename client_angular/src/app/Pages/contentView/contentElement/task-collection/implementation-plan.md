# Plan zur Implementierung der sequenziellen Aufgabenabfolge

**Ziel:** Die `TaskCollectionComponent` soll als "Host" oder "Container" dienen, der nacheinander verschiedene, bereits existierende Aufgaben-Komponenten lädt und anzeigt. Der Benutzer wird schrittweise durch eine vordefinierte Liste von Aufgaben geführt.

---

### Phase 1: State Management und Kernlogik (in `task-collection.component.ts`)

1.  **Datenhaltung:**
    *   Die Komponente behält die vom Service geladene `questionCollection` und die daraus extrahierte, sortierte Liste der `linkedContentElements`.
    *   Wir führen neue Zustandsvariablen ein:
        *   `currentIndex`: Ein `number`, das die Position der aktuell angezeigten Aufgabe in der sortierten Liste speichert.
        *   `currentTask`: Das `linkedContentElement`-Objekt der aktuellen Aufgabe.
        *   `isCurrentTaskCompleted`: Ein `boolean`, der anzeigt, ob die aktuelle Aufgabe als erledigt gilt (`progress === 100`).

2.  **Initialisierung (`ngOnInit`):**
    *   Nachdem die Daten vom `questionService` geladen und sortiert wurden:
    *   **Startpunkt finden:** Die Logik ermittelt, welche Aufgabe zuerst angezeigt wird. Das ist die erste Aufgabe in der sortierten Liste, deren `progress` *nicht* 100 ist. Sind alle Aufgaben bereits erledigt, wird die letzte Aufgabe angezeigt. Sind alle unberührt, wird die erste (Index 0) angezeigt.
    *   Der `currentIndex` wird auf den Index dieser Start-Aufgabe gesetzt.
    *   Eine Methode zum Laden der Aufgabe wird aufgerufen (siehe Phase 2).

### Phase 2: Dynamisches Laden der Aufgaben-Komponenten (Der "interne Router")

1.  **Komponenten-Mapping:**
    *   In der `task-collection.component.ts` erstellen wir ein Mapping-Objekt. Dieses Objekt verknüpft den `questionType` (z.B. `'MULTIPLECHOICE'`) mit der dazugehörigen Komponenten-Klasse (z.B. `McTaskComponent`).
    *   *Vorteil:* Wenn ein neuer Fragetyp hinzukommt, muss nur dieses Mapping-Objekt erweitert werden. Das ist sehr wartungsfreundlich.

2.  **Dynamischer Host im Template:**
    *   In der `task-collection.component.html` definieren wir einen leeren Container, der als Ankerpunkt für das dynamische Laden dient. Der Standardweg in Angular ist `<ng-template #taskHost></ng-template>`.

3.  **Lade-Funktion (z.B. `loadTaskComponent()`):**
    *   Diese Funktion wird immer aufgerufen, wenn eine neue Aufgabe angezeigt werden soll.
    *   Sie löscht die vorherige Komponente aus dem `#taskHost`.
    *   Sie holt die Daten für die `currentTask` aus der Liste.
    *   Sie bereitet das `taskViewData`-Objekt vor, genau wie es in `content-list-item.component.ts` gemacht wird.
    *   Sie schlägt im Komponenten-Mapping nach, welche Komponente für den `currentTask.type` zuständig ist.
    *   Sie erzeugt eine Instanz dieser Komponente und fügt sie in den `#taskHost` ein.
    *   Sie übergibt das `taskViewData`-Objekt an den `@Input()` der neu erstellten Komponente.
    *   Sie abonniert das `@Output() submitClicked` der neuen Komponente, um mitzubekommen, wann der Benutzer die Aufgabe abschickt.

### Phase 3: UI, Navigation und Benutzerführung (in `task-collection.component.html`)

1.  **Layout:**
    *   Ein Hauptbereich, der den dynamischen Host (`#taskHost`) enthält.
    *   Ein Navigationsbereich (z.B. unterhalb der Aufgabe).

2.  **Navigationselemente:**
    *   **"Weiter"-Button:** Dieser Button ist nur aktiv (`enabled`), wenn `isCurrentTaskCompleted` `true` ist. Ein Klick erhöht den `currentIndex` und ruft `loadTaskComponent()` auf.
    *   **"Zurück"-Button:** Dieser ist immer aktiv, solange man nicht bei der ersten Aufgabe ist. Ein Klick verringert den `currentIndex` und ruft `loadTaskComponent()` auf.
    *   **Fortschrittsanzeige:** Eine einfache Textanzeige wie "Aufgabe 3 von 5", um dem Benutzer Orientierung zu geben.

### Phase 4: Abschluss-Logik

1.  **Auf `submitClicked` reagieren:**
    *   Wenn die dynamisch geladene Komponente das `submitClicked`-Event auslöst, aktualisiert die `TaskCollectionComponent` den `progress` der `currentTask` in ihrer internen Datenliste.
    *   Wenn der neue Score 100 ist, wird `isCurrentTaskCompleted` auf `true` gesetzt, was den "Weiter"-Button freischaltet.

---

### Zusammenfassender Workflow:

1.  `TaskCollection` wird geladen.
2.  `ngOnInit` holt die Liste der Aufgaben, sortiert sie und findet den Startpunkt.
3.  `loadTaskComponent` lädt die passende Aufgaben-Komponente in den `#taskHost`.
4.  Der Benutzer interagiert mit der Aufgabe und klickt auf "Abschicken".
5.  Die `TaskCollection` fängt das `submitClicked`-Event ab, aktualisiert den Fortschritt.
6.  Wenn die Aufgabe bestanden ist, wird der "Weiter"-Button aktiv.
7.  Benutzer klickt "Weiter", der `currentIndex` wird erhöht, und der Zyklus beginnt bei Schritt 3 von vorn.
