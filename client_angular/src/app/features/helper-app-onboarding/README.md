# Helper App Onboarding Komponente

## Übersicht

Die Helper App Onboarding Komponente zeigt Architekturstudenten nach dem Login automatisch eine Anleitung zur Installation und Konfiguration der ProTra Helper-App an. Diese ermöglicht es, Grasshopper-Dateien direkt aus der Webanwendung in Rhino zu öffnen.

## Funktionalität

### Automatische Erkennung
- **Rollenprüfung**: Nur für Architekturstudenten (`globalRole.ARCHSTUDENT`)
- **Status-Management**: Verhindert wiederholte Anzeige
- **Helper-App-Detection**: Erkennt bereits installierte Apps

### Onboarding-Schritte

1. **Willkommen** - Erklärung der Rhino-Integration
2. **Download** - Betriebssystem-spezifischer Download
3. **Installation** - Schritt-für-Schritt Anleitung
4. **Konfiguration** - API-Token Setup
5. **Bereit** - Abschluss und Bestätigung

### Smart Features
- **Platform Detection**: Windows, macOS, Linux
- **Helper-App Status**: Echtzeitprüfung ob App läuft
- **Skip-Funktionalität**: Für später überspringen
- **Status-Persistierung**: localStorage-basiert

## Verwendung

### Automatische Auslösung
Das Onboarding wird automatisch in der `DashboardComponent` ausgelöst:

```typescript
private checkHelperAppOnboarding(): void {
  setTimeout(() => {
    if (this.helperAppOnboardingService.shouldShowOnboarding()) {
      this.showHelperAppOnboarding();
    }
  }, 1000);
}
```

### Manuelle Auslösung
```typescript
// In einer beliebigen Komponente
constructor(
  private dialog: MatDialog,
  private helperAppOnboardingService: HelperAppOnboardingService
) {}

openOnboarding() {
  const dialogRef = this.dialog.open(HelperAppOnboardingComponent, {
    width: '90vw',
    maxWidth: '600px',
    disableClose: true
  });
}
```

### Reset für Testing
```typescript
// Onboarding zurücksetzen
this.helperAppOnboardingService.resetOnboarding();
```

## Service-API

### `HelperAppOnboardingService`

#### Methoden
- `shouldShowOnboarding(): boolean` - Prüft alle Bedingungen
- `checkHelperAppStatus(): Observable<HelperAppStatus>` - Status der Helper-App
- `getOnboardingSteps(): OnboardingStep[]` - Alle Schritte abrufen
- `markOnboardingCompleted()` - Als abgeschlossen markieren
- `markOnboardingSkipped()` - Als übersprungen markieren
- `resetOnboarding()` - Status zurücksetzen

#### Interfaces
```typescript
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  action?: {
    label: string;
    type: 'download' | 'check-status' | 'next' | 'close';
    url?: string;
  };
}

interface HelperAppStatus {
  isInstalled: boolean;
  isRunning: boolean;
  version?: string;
  rhinoPathConfigured?: boolean;
}
```

## Konfiguration

### Rollen-basierte Erkennung
Das System erkennt Architekturstudenten über die neue Rolle `globalRole.ARCHSTUDENT`:

```typescript
// Vereinfachte Prüflogik
shouldShowOnboarding(): boolean {
  const userRole = this.userService.getRole();
  return userRole === globalRole.ARCHSTUDENT && 
         !this.isOnboardingCompleted();
}
```

### Download-URLs
Die Download-URLs für verschiedene Betriebssysteme:

```typescript
const downloadUrls = {
  'windows': '/assets/downloads/ProTra-Helper-Setup.exe',
  'mac': '/assets/downloads/ProTra-Helper.dmg',
  'linux': '/assets/downloads/ProTra-Helper.AppImage'
};
```

### LocalStorage Keys
```typescript
private readonly ONBOARDING_COMPLETED = 'protra_helper_onboarding_completed';
private readonly ONBOARDING_SKIPPED = 'protra_helper_onboarding_skipped';
private readonly LAST_SHOWN_DATE = 'protra_helper_onboarding_last_shown';
```

## Styling

### CSS-Klassen
- `.onboarding-dialog` - Haupt-Container
- `.dialog-header` - Header mit Gradient
- `.step-content` - Schritt-Inhalt
- `.status-card` - Status-Anzeigen
- `.success-content` - Erfolgs-Screen

### Responsive Design
- **Desktop**: 600px maximale Breite
- **Mobile**: 90vw Breite mit angepassten Icons
- **Dark Mode**: Automatische Anpassung

## Integration

### Module-Import
```typescript
import { HelperAppOnboardingModule } from './features/helper-app-onboarding/helper-app-onboarding.module';

@NgModule({
  imports: [
    // ... andere Module
    HelperAppOnboardingModule
  ]
})
```

### Abhängigkeiten
- `@angular/material/dialog`
- `@angular/material/button`
- `@angular/material/icon`
- `@angular/material/progress-bar`
- `@angular/material/progress-spinner`
- `@angular/material/card`
- `@angular/material/list`
- `@angular/material/expansion`
- `@angular/material/snack-bar`
- `@angular/material/tooltip`

## Testing

### Unit Tests
```typescript
// Service Tests
describe('HelperAppOnboardingService', () => {
  it('should show onboarding for architecture students', () => {
    // Test Logic
  });
});

// Component Tests
describe('HelperAppOnboardingComponent', () => {
  it('should display correct steps', () => {
    // Test Logic
  });
});
```

### E2E Tests
```typescript
// Login-Flow mit Onboarding
it('should show onboarding after architecture student login', () => {
  // Test Implementation
});
```

## Troubleshooting

### Häufige Probleme

1. **Dialog öffnet sich nicht**
   - Prüfen ob User die Rolle `ARCHSTUDENT` hat
   - LocalStorage auf Onboarding-Status prüfen

2. **Helper-App Status nicht erkannt**
   - Prüfen ob Helper-App auf Port 3001 läuft
   - Firewall/Antivirus-Einstellungen prüfen
   - CORS-Konfiguration prüfen

3. **Download funktioniert nicht**
   - Download-URLs prüfen
   - Assets-Verzeichnis prüfen
   - Browser-Pop-Up-Blocker deaktivieren

### Debug-Modus
```typescript
// Debug-Informationen anzeigen
console.log(this.helperAppOnboardingService.getDebugInfo());
```

## Erweiterungen

### Neue Schritte hinzufügen
```typescript
// Im Service - getOnboardingSteps()
{
  id: 'new-step',
  title: 'Neuer Schritt',
  description: 'Beschreibung...',
  icon: 'new_icon',
  action: {
    label: 'Weiter',
    type: 'next'
  }
}
```

### Neue Rollen hinzufügen
Bei Bedarf können weitere spezialisierte Rollen hinzugefügt werden:

```typescript
// shared/dtos/roles.enum.ts
export enum globalRole {
    ADMIN = "ADMIN",
    STUDENT = "STUDENT", 
    TEACHER = "TEACHER",
    ARCHSTUDENT = "ARCHSTUDENT",
    ENGINEERINGSTUDENT = "ENGINEERINGSTUDENT"  // Beispiel für weitere Spezialisierung
}
```

## Migration

Bei Updates der Komponente:
1. LocalStorage-Keys ggf. migrieren
2. Neue Service-Methoden prüfen
3. Template-Änderungen beachten
4. CSS-Breaking-Changes prüfen
