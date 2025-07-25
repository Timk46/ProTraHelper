Absolut. Hier ist ein umfassender Leitfaden als Markdown-Datei, der die Best Practices für die Verwendung von TypeScript in einem modernen Web-Stack mit Angular und Nest.js beschreibt.

---

# TypeScript Best Practices für Angular & Nest.js Webanwendungen

Dieses Dokument dient als Leitfaden für die effektive Nutzung von TypeScript im Kontext von Angular-Frontends und Nest.js-Backends. Das Ziel ist die Erstellung von robustem, wartbarem und typsicherem Code, der die Stärken beider Frameworks optimal nutzt.

## Inhaltsverzeichnis

1. [Kernphilosophie: Statische Typisierung als Grundpfeiler](#1-kernphilosophie-statische-typisierung-als-grundpfeiler)
2. [Typdefinitionen: `interface` vs. `type` vs. `class`](#2-typdefinitionen-interface-vs-type-vs-class)
3. [Der API-Vertrag: `shared/dtos`](#3-der-api-vertrag-shareddtos)
4. [Asynchronität: RxJS und Promises](#4-asynchronität-rxjs-und-promises)
5. [Code-Organisation und Modularität](#5-code-organisation-und-modularität)
6. [Namenskonventionen](#6-namenskonventionen)
7. [Strikte Compiler-Optionen (`tsconfig.json`)](#7-strikte-compiler-optionen-tsconfigjson)
8. [Generics für Wiederverwendbarkeit](#8-generics-für-wiederverwendbarkeit)
9. [Decorators: Die Magie von Angular & Nest.js](#9-decorators-die-magie-von-angular--nestjs)

---

### 1. Kernphilosophie: Statische Typisierung als Grundpfeiler

TypeScript verliert seinen größten Vorteil, wenn die Typsicherheit untergraben wird. Die oberste Regel lautet daher:

**Vermeide `any` um jeden Preis.**

`any` deaktiviert die Typprüfung für eine Variable und führt TypeScript ad absurdum. Es ist ein "Escape Hatch", der nur in absoluten Ausnahmefällen (z.B. bei der Migration von JavaScript-Code) temporär akzeptabel ist.

**Alternativen zu `any`:**

- **`unknown`:** Die typsichere Alternative. `unknown` zwingt dich, den Typ zu überprüfen (z.B. mit `typeof`, `instanceof` oder Type Guards), bevor du auf die Variable zugreifen kannst.
- **Generics:** Erlauben das Schreiben von flexiblen, aber dennoch typsicheren Funktionen und Klassen.

```typescript
// SCHLECHT
function processData(data: any): string {
  return data.name; // Keine Sicherheit, `name` könnte nicht existieren.
}

// GUT
function processData(data: unknown): string {
  if (typeof data === "object" && data && "name" in data) {
    return (data as { name: string }).name; // Typprüfung vor Zugriff
  }
  throw new Error("Invalid data structure");
}
```

### 2. Typdefinitionen: `interface` vs. `type` vs. `class`

Die Wahl des richtigen Werkzeugs zur Definition von Datenstrukturen ist entscheidend.

| Schlüsselwort   | Verwendung                                                                                     | Begründung                                                                                                                                                     |
| :-------------- | :--------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **`interface`** | Definition von Objektstrukturen (`object shapes`), insbesondere für öffentliche APIs.          | Kann durch `extends` erweitert und durch "Declaration Merging" kombiniert werden. Dies macht sie ideal für erweiterbare Bibliotheken und klare Objektverträge. |
| **`type`**      | Definition von komplexen Typen, Union-Typen (`                                                 | `), Intersection-Typen (`&`) oder Aliase für Primitive.                                                                                                        | Flexibler für nicht-objektbasierte Typen. Nicht erweiterbar nach der Definition. |
| **`class`**     | Definition von Strukturen, die Instanzen, Methoden, Logik und Laufzeitinformationen benötigen. | Notwendig für Dependency Injection in Angular/Nest.js. **Zwingend für Nest.js DTOs**, da Decorators zur Validierung nur auf Klassen angewendet werden können.  |

**Faustregel:**

- Nutze `interface` für die Form von Objekten.
- Nutze `type` für alles andere (Unions, Tuples, etc.).
- Nutze `class` wenn du eine Instanz mit Logik (`new MyClass()`) oder Decorator-Metadaten (Nest.js DTOs) benötigst.

### 3. Der API-Vertrag: `shared/dtos`

Die typsichere Kommunikation zwischen Client und Server ist das Rückgrat der Anwendung.

- **Single Source of Truth:** Ein dedizierter `shared` oder `common` Ordner enthält alle Data Transfer Objects (DTOs), die von Frontend und Backend genutzt werden.
- **Nest.js (Backend):** DTOs sind **`class`es**, die mit `class-validator`-Decorators versehen sind, um eingehende Anfragen automatisch zu validieren.
- **Angular (Frontend):** Dieselben DTOs werden als **`interface` oder `class`** importiert, um HTTP-Antworten und -Anfragen zu typisieren.

```typescript
// in shared/dtos/user.dto.ts
export class UserDTO {
  // Für Nest.js Validierung
  @IsInt()
  id: number;

  @IsString()
  @IsNotEmpty()
  firstname: string;
}

// in angular.service.ts
import { UserDTO } from '@DTOs/index'; // Pfadaliase verwenden!
...
getUser(id: number): Observable<UserDTO> {
  return this.http.get<UserDTO>(`/api/users/${id}`);
}
```

### 4. Asynchronität: RxJS und Promises

- **Angular:** Setzt primär auf **RxJS Observables**.
  - **Typisiere Streams:** `Observable<UserDTO[]>` ist besser als `Observable<any[]>`.
  - **`async`-Pipe:** Nutze die `async`-Pipe in Templates, um die Verwaltung von Subscriptions an Angular zu delegieren.
  - **`$`-Suffix:** Observables-Variablen enden immer mit einem Dollarzeichen (`users$`).
- **Nest.js:** Setzt primär auf **Promises** mit `async/await`.
  - **Explizite Rückgabetypen:** Eine Funktion, die eine Promise zurückgibt, muss explizit typisiert werden: `async function findUser(): Promise<UserDTO>`.

### 5. Code-Organisation und Modularität

- **Pfadaliase:** Konfiguriere Pfadaliase in der `tsconfig.json` (`"paths": { "@dtos": ["shared/dtos"] }`), um unübersichtliche relative Pfade (`../../../`) zu vermeiden.
- **Barrel-Dateien (`index.ts`):** Nutze `index.ts`-Dateien, um Exporte aus einem Verzeichnis zu bündeln. Dies vereinfacht Import-Anweisungen.

```typescript
// in shared/dtos/index.ts
export * from "./user.dto";
export * from "./content.dto";

// in einem anderen File
import { UserDTO, ContentDTO } from "@DTOs/index";
```

### 6. Namenskonventionen

Konsistenz ist der Schlüssel zur Lesbarkeit.

| Artefakt                          | Konvention                          | Beispiel                                         |
| :-------------------------------- | :---------------------------------- | :----------------------------------------------- |
| Klassen, Interfaces, Types, Enums | `UpperCamelCase`                    | `ContentService`, `UserDTO`, `NotificationType`  |
| Variablen, Funktionen             | `camelCase`                         | `currentUser`, `fetchContent()`                  |
| Private Member                    | `camelCase` (mit `private` Keyword) | `private userCount: number`                      |
| Observables                       | `camelCase$`                        | `users$`, `contentNode$`                         |
| Dateien                           | `feature.type.ts`                   | `user.service.ts`, `content-list.component.html` |

### 7. Strikte Compiler-Optionen (`tsconfig.json`)

Die `tsconfig.json` ist das Fundament der Typsicherheit. Die folgenden Optionen sollten immer aktiviert sein:

```json
{
  "compilerOptions": {
    "strict": true, // Aktiviert alle strikten Typprüfungsoptionen
    "noImplicitAny": true, // Löst Fehler bei implizitem 'any' aus
    "strictNullChecks": true, // Unterscheidet zwischen 'string' und 'string | null'
    "forceConsistentCasingInFileNames": true, // Verhindert Fehler auf case-sensitiven Systemen
    "noUnusedLocals": true, // Meldet ungenutzte lokale Variablen
    "noUnusedParameters": true, // Meldet ungenutzte Parameter
    "noImplicitReturns": true // Stellt sicher, dass alle Codepfade einen Wert zurückgeben
  }
}
```

### 8. Generics für Wiederverwendbarkeit

Generics ermöglichen es, flexible und wiederverwendbare Komponenten zu schreiben, ohne die Typsicherheit zu opfern.

```typescript
// Ein generischer Service-Wrapper für HTTP-Aufrufe
export class ApiService {
  constructor(private http: HttpClient) {}

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`/api/${endpoint}`);
  }
}

// Verwendung
apiService.get<UserDTO[]>("users").subscribe((users) => {
  // `users` ist hier korrekt als `UserDTO[]` typisiert
});
```

### 9. Decorators: Die Magie von Angular & Nest.js

Decorators sind ein zentrales Feature beider Frameworks.

- **Verständnis:** Verstehe, was die von den Frameworks bereitgestellten Decorators tun (`@Injectable()`, `@Controller()`, `@Component()`, `@Get()`, `@Body()`).
- **Custom Decorators:** Erstelle eigene Decorators, um Boilerplate-Code zu reduzieren, z.B. einen `@User()`-Decorator in Nest.js, der den aktuellen Benutzer aus dem Request-Objekt extrahiert.
