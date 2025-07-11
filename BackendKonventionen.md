Selbstverständlich. Hier ist eine detaillierte Beschreibung der Best Practices und Konventionen für das `server_nestjs` Backend. Sie dient als technischer Leitfaden und stellt den notwendigen Kontext für Entwickler und Sprachmodelle bereit.

---

### **Best Practices und Konventionen für das NestJS Backend (`server_nestjs`)**

Dieses Dokument definiert die architektonischen Muster, Konventionen und Best Practices für die Entwicklung des `server_nestjs`-Projekts. Das Ziel ist es, ein robustes, skalierbares und wartbares Backend zu gewährleisten.

#### **1. Architektur: Modulares Design**

Das Herzstück der NestJS-Anwendung ist ihre modulare Architektur. Jedes Geschäftsfeature wird in einem eigenen, unabhängigen Modul gekapselt.

*   **Feature-Module:** Jedes Haupt-Feature der Anwendung (z.B. `auth`, `users`, `content`, `discussion`) resides in its own directory within `src/`.
*   **Modul-Struktur:** Ein typisches Modul besteht aus drei Hauptkomponenten:
    *   **`*.module.ts`:** Definiert das Modul und deklariert die zugehörigen `Controllers` und `Providers` (Services). Es importiert andere Module, die es benötigt, und exportiert seine eigenen Services, falls diese von anderen Modulen verwendet werden sollen.
    *   **`*.controller.ts`:** Die Schnittstelle zur Außenwelt. Empfängt eingehende HTTP-Anfragen, validiert sie und delegiert die Bearbeitung an den Service.
    *   **`*.service.ts`:** Das Gehirn des Moduls. Enthält die gesamte Geschäftslogik, die unabhängig von der Art der eingehenden Anfrage ist.

Dieses Design erzwingt eine klare Trennung der Verantwortlichkeiten (Separation of Concerns) und macht die Anwendung leichter verständlich und erweiterbar.

#### **2. Controller-Schicht (`*.controller.ts`)**

Controller sind die Verkehrs- und Sicherheitskontrolle der API.

*   **Aufgabe:** Ausschließlich für die Handhabung des HTTP-Layers zuständig.
*   **Verantwortlichkeiten:**
    *   Definition von Routen mit Decorators (`@Controller('users')`, `@Get(':id')`, `@Post()`).
    *   Extrahieren von Daten aus der Anfrage mithilfe von Decorators (`@Body()`, `@Param()`, `@Query()`, `@Req()`).
    *   **Validierung von Eingabedaten:** Eingehende Daten im `@Body` müssen durch ein DTO aus dem `shared`-Verzeichnis typisiert und validiert werden. NestJS' `ValidationPipe` (global aktiviert) übernimmt dies automatisch.
    *   Delegation der Geschäftslogik an den entsprechenden Service.
    *   Formatierung der HTTP-Antwort (Statuscodes, Rückgabedaten).
*   **Regel: Controller sind "dünn".** Sie enthalten **keine** Geschäftslogik. Ihre Aufgabe ist es, die Anfrage anzunehmen, zu validieren und an den Service weiterzuleiten.

**Beispiel:**

```typescript
import { CreateUserDTO } from '@dtos'; // Pfadaliase @dtos verwenden

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() createUserDto: CreateUserDTO) {
    // Keine Logik hier, nur Delegation!
    return this.usersService.create(createUserDto);
  }
}
```

#### **3. Service-Schicht (`*.service.ts`)**

Services sind der Ort, an dem die eigentliche Arbeit stattfindet.

*   **Aufgabe:** Implementierung der gesamten Geschäftslogik.
*   **Verantwortlichkeiten:**
    *   Interaktion mit der Datenbank über den `PrismaService`.
    *   Durchführung von Berechnungen und Datenmanipulationen.
    *   Aufruf anderer Services, um komplexe Workflows zu orchestrieren.
    *   Implementierung von externen API-Aufrufen (falls nötig).
*   **Regel:** Services sind vollständig plattformunabhängig. Sie wissen nichts von HTTP-Anfragen oder -Antworten. Sie erhalten aufbereitete Daten vom Controller und geben das Ergebnis zurück.

#### **4. Datenschicht mit Prisma**

Prisma ist die Brücke zur Datenbank und die "Single Source of Truth" für das Datenmodell.

*   **Schema-Definition:** Das gesamte Datenbankschema ist **ausschließlich** in der Datei `prisma/schema.prisma` definiert.
*   **Migrationen:** Jede Änderung am Schema **muss** durch eine Prisma-Migration erfolgen (`npx prisma migrate dev`). Dies versioniert die Datenbankstruktur und sorgt für Konsistenz über alle Entwicklungsumgebungen hinweg. Manuelles Ändern der Datenbank ist verboten.
*   **`PrismaService`:** Ein zentraler, wiederverwendbarer Service, der den `PrismaClient` kapselt und in jedem Modul, das Datenbankzugriff benötigt, per Dependency Injection bereitgestellt wird.
*   **Typsicherheit:** Prisma generiert automatisch TypeScript-Typen aus dem Schema. Diese Typen (z.B. `User`, `Post`) sollten innerhalb der Services verwendet werden, um eine vollständige Typsicherheit bis hin zur Datenbank zu gewährleisten.

#### **5. Typsicherheit: Der `shared/dtos`-Vertrag**

**Die Einhaltung dieses Vertrags ist von höchster Priorität.**

*   **API-Kontrakt:** Das `shared/dtos`-Verzeichnis definiert den typsicheren Vertrag zwischen Backend und Frontend.
*   **Validierung:** DTOs im Backend sind nicht nur Interfaces, sondern **Klassen**, die mit Decorators aus `class-validator` (z.B. `@IsString()`, `@IsEmail()`, `@IsNotEmpty()`) angereichert sind.
*   **Globale `ValidationPipe`:** Eine global in `main.ts` registrierte `ValidationPipe` sorgt dafür, dass alle eingehenden Anfragen, die einen DTO im `@Body` verwenden, automatisch anhand dieser Regeln validiert werden. Anfragen mit ungültigen Daten werden mit einer `400 Bad Request`-Antwort und detaillierten Fehlermeldungen abgewiesen.

#### **6. Authentifizierung & Autorisierung (`auth`-Modul)**

*   **Passport.js & JWT:** Die Authentifizierung basiert auf JSON Web Tokens (JWT) und wird mit Passport.js umgesetzt. Die `JwtStrategy` validiert eingehende Tokens.
*   **Guards:** Endpunkte werden mit Guards (`@UseGuards(JwtAuthGuard)`) geschützt. Diese stellen sicher, dass nur Anfragen mit einem gültigen JWT passieren.
*   **Rollenbasierte Zugriffskontrolle (RBAC):** Spezifische Rollen (z.B. `ADMIN`, `TEACHER`) können in Guards überprüft werden, um den Zugriff auf bestimmte Operationen einzuschränken. Die Rolleninformation wird aus dem JWT-Payload extrahiert.

#### **7. Fehlerbehandlung**

*   **Standard-Exceptions:** NestJS bietet eine Reihe von eingebauten HTTP-Exception-Klassen (z.B. `NotFoundException`, `BadRequestException`, `ForbiddenException`, `UnauthorizedException`). Diese sollten in den Services geworfen werden, um passende HTTP-Statuscodes an den Client zu senden.
*   **Exception Filters:** NestJS fängt automatisch alle nicht behandelten Fehler ab und sendet eine generische `500 Internal Server Error`-Antwort. Für spezifisches Logging oder Fehlerformate können benutzerdefinierte Exception Filters erstellt werden.

#### **8. Konfiguration**

*   **Environment-Variablen:** Die Konfiguration der Anwendung (Datenbank-URL, JWT-Secret, etc.) erfolgt ausschließlich über Umgebungsvariablen in einer `.env`-Datei.
*   **`ConfigModule`:** Das `@nestjs/config`-Modul wird verwendet, um auf diese Variablen typsicher zuzugreifen. Das Hardcodieren von Konfigurationswerten im Code ist strengstens untersagt.

#### **9. Namenskonventionen**

*   **Dateinamen:** `feature.type.ts` (z.B. `users.controller.ts`, `auth.service.ts`).
*   **Klassennamen:** `UpperCamelCase` mit dem entsprechenden Suffix (z.B. `UsersService`, `JwtAuthGuard`).
*   **DTO-Klassen:** `UpperCamelCaseDTO` (z.B. `CreateUserDTO`, `UpdateContentDTO`).
