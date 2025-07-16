Absolut. Hier ist eine ausführliche Beschreibung der Best Practices und Konventionen für das `client_angular` Frontend, die auf der bestehenden Struktur aufbaut. Diese kann als Leitfaden für Entwickler und als Kontext für ein Sprachmodell dienen.

---

### **Best Practices und Konventionen für das Angular Frontend (`client_angular`)**

Dieses Dokument beschreibt die Architektur, Konventionen und Best Practices für die Entwicklung des `client_angular`-Projekts. Die Einhaltung dieser Richtlinien ist entscheidend, um die Codequalität, Wartbarkeit und Skalierbarkeit der Anwendung sicherzustellen.

#### **1. Architektur: Separation of Concerns (Trennung der Belange)**

Die Architektur des Frontends folgt dem Prinzip der klaren Trennung von Verantwortlichkeiten. Komponenten sind primär für die Darstellung zuständig, während die Logik in Services ausgelagert wird.

*   **`src/app/Pages` (Smart/Container Components):**
    *   **Zweck:** Repräsentieren vollständige Ansichten oder Seiten (z.B. `content-list.component.ts`).
    *   **Verantwortlichkeiten:**
        *   Kommunizieren mit Services, um Daten abzurufen oder zu senden.
        *   Verwalten den Zustand der jeweiligen Ansicht.
        *   Binden Daten an "Dumb Components" und reagieren auf deren Events.
    *   **Regel:** Komponenten in `Pages` sind die einzigen, die Services direkt injizieren dürfen.

*   **`src/app/components` (Dumb/Presentational Components) - *Empfehlung***
    *   **Zweck:** Wiederverwendbare UI-Elemente (z.B. ein spezieller Button, eine Karte, ein Formularfeld). *Es wird empfohlen, einen solchen Ordner anzulegen.*
    *   **Verantwortlichkeiten:**
        *   Empfangen Daten ausschließlich über `@Input()`-Properties.
        *   Geben Benutzerinteraktionen über `@Output()`-Events an die übergeordnete "Smart Component" weiter.
        *   Enthalten keine Geschäftslogik und haben keine Kenntnis von Services.
    *   **Regel:** Diese Komponenten müssen so "dumm" wie möglich sein. Ihre einzige Aufgabe ist es, Daten darzustellen und auf Benutzereingaben zu reagieren.

*   **`src/app/Services` (Logik- und Datenschicht):**
    *   **Zweck:** Kapseln die Geschäftslogik und die gesamte Kommunikation mit dem Backend.
    *   **Verantwortlichkeiten:**
        *   Durchführen von HTTP-Aufrufen an das NestJS-Backend mittels `HttpClient`.
        *   Verwalten und Teilen von Anwendungszuständen (z.B. der eingeloggte Benutzer).
        *   Verarbeiten und Mappen von Daten, die vom Server kommen.
    *   **Regel:** Jede Interaktion mit dem Backend muss über einen Service erfolgen.

#### **2. Typsicherheit: Der `shared/dtos`-Vertrag**

**Dies ist die wichtigste Regel im gesamten Projekt.**

*   **Single Source of Truth:** Das `shared/dtos`-Verzeichnis ist die alleinige Quelle der Wahrheit für alle Datenstrukturen, die zwischen dem Angular-Client und dem NestJS-Server ausgetauscht werden.
*   **Strikte Typisierung:** Alle HTTP-Anfragen (Payloads) und -Antworten müssen mit den Interfaces aus diesem Verzeichnis typisiert werden.
*   **Verbot von `any`:** Die Verwendung des `any`-Typs ist strengstens untersagt. Wenn ein Typ benötigt wird, der nicht existiert, muss zuerst das entsprechende DTO im `shared`-Verzeichnis erstellt oder erweitert werden.

**Beispiel:**

```typescript
// in einem Service
import { UserDTO } from '@dtos'; // Pfadaliase @dtos verwenden
import { Observable } from 'rxjs';

// ...

getCurrentUser(): Observable<UserDTO> {
  return this.http.get<UserDTO>('/api/users/me');
}
```

#### **3. Asynchronität mit RxJS**

*   **Standard für Asynchronität:** RxJS ist das Standardwerkzeug für die Handhabung aller asynchronen Operationen, insbesondere für HTTP-Aufrufe.
*   **Die `async`-Pipe:** In HTML-Templates muss **immer** die `async`-Pipe verwendet werden, um Observables zu abonnieren. Dies delegiert die Verwaltung von Subscriptions (inkl. dem wichtigen Unsubscribe) an Angular und verhindert Memory Leaks.

    ```html
    <!-- GUT -->
    <div *ngIf="user$ | async as user">
      Hallo, {{ user.firstname }}
    </div>

    <!-- SCHLECHT: Manuelles .subscribe() in der Komponente -->
    ```
*   **Namenskonvention für Observables:** Variablen, die ein Observable halten, müssen mit einem `$`-Zeichen am Ende benannt werden (z.B. `user$`, `contentList$`).
*   **Manuelle Subscriptions:** Falls ein manuelles `.subscribe()` in der Komponenten-Logik unvermeidbar ist, muss die Subscription in `ngOnDestroy` explizit beendet werden, um Memory Leaks zu verhindern.

#### **4. State Management (Zustandsverwaltung)**

*   **Service-basierter State:** Für die Verwaltung von globalem oder über mehrere Komponenten geteiltem Zustand (z.B. eingeloggter Benutzer, ausgewählter Kurs) werden RxJS `BehaviorSubject`s innerhalb von Services verwendet.
*   Ein `BehaviorSubject` bietet den aktuellen Wert für neue Abonnenten und ermöglicht es, den Zustand zu aktualisieren.

**Beispiel in einem `AuthService`:**

```typescript
private currentUserSubject = new BehaviorSubject<UserDTO | null>(null);
public currentUser$ = this.currentUserSubject.asObservable();

// ... Methode, um den User zu setzen
setCurrentUser(user: UserDTO | null) {
  this.currentUserSubject.next(user);
}
```

#### **5. Routing**

*   **Lazy Loading:** Feature-Bereiche der Anwendung sollten als eigenständige Module implementiert und über Lazy Loading im `app-routing.module.ts` geladen werden. Dies verbessert die initiale Ladezeit der Anwendung erheblich.
*   **Route Guards (`src/app/Guards`):** Der Zugriff auf Routen muss durch Guards geschützt werden. Diese prüfen z.B., ob ein Benutzer authentifiziert ist (`AuthGuard`) oder eine bestimmte Rolle hat (`RoleGuard`).

#### **6. Formulare**

*   **Reactive Forms:** Für alle Formulare (außer trivialen Ein-Feld-Formularen) sind **Reactive Forms** zu verwenden. Sie bieten eine bessere Struktur, Testbarkeit und explizite Kontrolle über das Datenmodell des Formulars.
*   Die Logik wird in der Komponentenklasse mit `FormBuilder`, `FormGroup` und `FormControl` erstellt.

#### **7. Styling (SCSS)**

*   **Gekapselte Styles:** Jede Komponente hat ihre eigene `*.component.scss`-Datei. Die Styles darin sind automatisch auf die Komponente beschränkt, was globale Konflikte verhindert.
*   **Globale Styles:** Globale Stile, Variablen (für Farben, Schriftgrößen, Abstände) und Mixins gehören in das `src/styles/`-Verzeichnis.

#### **8. Namenskonventionen**

Die offiziellen Angular-Namenskonventionen sind einzuhalten:

*   **Dateinamen:** `feature.type.ts` (z.B. `content-list.component.ts`, `auth.service.ts`, `auth.guard.ts`).
*   **Klassennamen:** `UpperCamelCase` mit dem entsprechenden Suffix (z.B. `ContentListComponent`, `AuthService`).
*   **Interfaces:** `UpperCamelCase`. Für DTOs das Suffix `DTO` verwenden (z.B. `UserDTO`).
*   **Observables:** `camelCase$` (z.B. `users$`).
