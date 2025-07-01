import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { UserService } from '../auth/user.service';
import { globalRole } from '@DTOs/roles.enum';
import { HelperAppHttpService } from '../helper-app-http.service';

export interface OnboardingStep {
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

export interface HelperAppStatus {
  isInstalled: boolean;
  isRunning: boolean;
  version?: string;
  rhinoPathConfigured?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HelperAppOnboardingService {
  private readonly ONBOARDING_COMPLETED = 'protra_helper_onboarding_completed';
  private readonly ONBOARDING_SKIPPED = 'protra_helper_onboarding_skipped';
  private readonly LAST_SHOWN_DATE = 'protra_helper_onboarding_last_shown';
  private readonly HELPER_APP_URL = 'http://localhost:3001';

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private helperAppHttp: HelperAppHttpService
  ) {}

  /**
   * Prüft ob das Onboarding für den aktuellen User angezeigt werden soll
   */
  shouldShowOnboarding(): boolean {
    console.log('🔍 [HelperAppOnboarding] shouldShowOnboarding() - Starting check...');

    try {
      // Prüfe ob User eingeloggt ist
      const isLoggedIn = this.userService.isUserLoggedIn();
      console.log('🔍 [HelperAppOnboarding] User logged in:', isLoggedIn);
      if (!isLoggedIn) {
        console.log('❌ [HelperAppOnboarding] User not logged in - Onboarding skipped');
        return false;
      }

      // Prüfe ob User Architekturstudent ist (neue Rolle-basierte Logik)
      const userRole = this.userService.getRole();
      console.log('🔍 [HelperAppOnboarding] User role:', userRole);
      console.log('🔍 [HelperAppOnboarding] Required role:', globalRole.ARCHSTUDENT);
      if (userRole !== globalRole.ARCHSTUDENT) {
        console.log('❌ [HelperAppOnboarding] User role is not ARCHSTUDENT - Onboarding skipped');
        return false;
      }

      // Prüfe LocalStorage-Einträge im Detail
      const isCompleted = this.isOnboardingCompleted();
      const isSkipped = this.isOnboardingSkipped();
      const wasShownToday = this.wasShownToday();

      console.log('🔍 [HelperAppOnboarding] LocalStorage checks:');
      console.log('  - isOnboardingCompleted():', isCompleted);
      console.log('  - isOnboardingSkipped():', isSkipped);
      console.log('  - wasShownToday():', wasShownToday);

      // Debug: Zeige alle relevanten localStorage-Werte
      console.log('🔍 [HelperAppOnboarding] LocalStorage raw values:');
      console.log('  - ' + this.ONBOARDING_COMPLETED + ':', localStorage.getItem(this.ONBOARDING_COMPLETED));
      console.log('  - ' + this.ONBOARDING_SKIPPED + ':', localStorage.getItem(this.ONBOARDING_SKIPPED));
      console.log('  - ' + this.LAST_SHOWN_DATE + ':', localStorage.getItem(this.LAST_SHOWN_DATE));

      // Prüfe ob Onboarding bereits abgeschlossen oder übersprungen wurde
      if (isCompleted || isSkipped) {
        console.log('❌ [HelperAppOnboarding] Onboarding already completed or skipped - Onboarding skipped');
        return false;
      }

      // Prüfe ob Onboarding heute bereits angezeigt wurde (um Spam zu vermeiden)
      if (wasShownToday) {
        console.log('❌ [HelperAppOnboarding] Already shown today - Onboarding skipped');
        return false;
      }

      console.log('✅ [HelperAppOnboarding] All checks passed - Onboarding should be shown!');
      return true;
    } catch (error) {
      console.error('❌ [HelperAppOnboarding] Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Prüft den Status der Helper-App - verwendet HelperAppHttpService für CORS-freie Kommunikation
   */
  checkHelperAppStatus(): Observable<HelperAppStatus> {
    console.log('🔍 [HelperAppOnboarding] Checking helper app status at:', this.HELPER_APP_URL);

    return this.helperAppHttp.get<any>(`${this.HELPER_APP_URL}/status`).pipe(
      map(response => {
        console.log('✅ [HelperAppOnboarding] Helper app response:', response);
        return {
          isInstalled: true,
          isRunning: true,
          version: response.version,
          rhinoPathConfigured: response.rhinoPathConfigured
        };
      }),
      catchError(error => {
        console.log('❌ [HelperAppOnboarding] Helper App not reachable:', error);
        return of({
          isInstalled: false,
          isRunning: false
        });
      })
    );
  }

  /**
   * Erkennt das Betriebssystem des Users
   */
  detectPlatform(): 'windows' | 'mac' | 'linux' {
    const userAgent = window.navigator.userAgent.toLowerCase();

    if (userAgent.includes('win')) {
      return 'windows';
    } else if (userAgent.includes('mac')) {
      return 'mac';
    } else {
      return 'linux';
    }
  }

  /**
   * Gibt die Download-URL für das aktuelle Betriebssystem zurück
   */
  getDownloadUrl(): string {
    const platform = this.detectPlatform();

    // Die Basis-URL Ihres Backends, das die Downloads bereitstellt
    const backendDownloadBaseUrl = 'http://localhost:3000'; // Beispiel: Ihr NestJS-Server

      const downloadUrls = {
        'windows': '/assets/downloads/ProTra Helfer-Setup-1.0.1.exe',
        'mac': '/assets/downloads/ProTra-Helper.dmg',
        'linux': '/assets/downloads/ProTra-Helper.AppImage'
      };

    // TODO: Stellen Sie sicher, dass Ihr Backend unter diesen Pfaden die jeweiligen Dateien bereitstellt.
    // Der Windows-Dateiname sollte dem entsprechen, was im 'protra-helper-app/dist' Ordner generiert wird.
    // Ggf. muss der Dateiname hier dynamischer gestaltet werden, wenn er Versionen enthält.

    if (platform in downloadUrls) {
      return downloadUrls[platform];
    } else {
      // Fallback oder Fehlerbehandlung, falls die Plattform nicht unterstützt wird
      console.warn(`[HelperAppOnboardingService] Download URL for platform '${platform}' not configured.`);
      return ''; // Oder eine generische Download-Seite
    }
  }

  /**
   * Gibt die Onboarding-Schritte zurück
   */
  getOnboardingSteps(): OnboardingStep[] {
    const platform = this.detectPlatform();
    const platformName = {
      'windows': 'Windows',
      'mac': 'macOS',
      'linux': 'Linux'
    }[platform];

    return [
      {
        id: 'welcome',
        title: 'Willkommen bei ProTra Rhino-Integration!',
        description: `Als Architekturstudent benötigen Sie die ProTra Helper-App, um Grasshopper-Dateien direkt aus der Webanwendung in Rhino zu öffnen. Diese Funktion ermöglicht es Ihnen, 3D-Modelle und parametrische Designs nahtlos zu bearbeiten.`,
        icon: 'architecture',
        action: {
          label: 'Weiter',
          type: 'next'
        }
      },
      {
        id: 'download',
        title: `Helper-App für ${platformName} herunterladen`,
        description: `Laden Sie die ProTra Helper-App für Ihr Betriebssystem herunter. Die App läuft diskret im Hintergrund und stellt die Verbindung zwischen der Webanwendung und Rhino her.`,
        icon: 'download',
        action: {
          label: `Für ${platformName} herunterladen`,
          type: 'download',
          url: this.getDownloadUrl()
        }
      },
      {
        id: 'install',
        title: 'Installation der Helper-App',
        description: `1. Führen Sie die heruntergeladene Datei aus\n2. Folgen Sie den Installationsanweisungen\n3. Die App startet automatisch im System-Tray\n4. Stellen Sie sicher, dass Rhino 8 installiert ist`,
        icon: 'install_desktop',
        action: {
          label: 'Installation abgeschlossen',
          type: 'next'
        }
      },
      {
        id: 'configure',
        title: 'Konfiguration',
        description: `Nach der Installation:\n1. Rechtsklick auf das Rhino-Icon im System-Tray\n2. Wählen Sie "API Token anzeigen"\n3. Kopieren Sie das Token in die Zwischenablage\n4. Navigieren Sie zur Rhino-Launcher-Seite in ProTra\n5. Fügen Sie das Token ein und speichern Sie es`,
        icon: 'settings',
        action: {
          label: 'Konfiguration abgeschlossen',
          type: 'next'
        }
      },
      {
        id: 'ready',
        title: 'Bereit für Rhino-Integration!',
        description: `Perfekt! Sie können jetzt Grasshopper-Dateien direkt aus ProTra in Rhino öffnen. Bei Problemen finden Sie weitere Hilfe in der Dokumentation oder wenden Sie sich an den Support.`,
        icon: 'check_circle',
        action: {
          label: 'Onboarding abschließen',
          type: 'close'
        }
      }
    ];
  }

  /**
   * Markiert das Onboarding als abgeschlossen
   */
  markOnboardingCompleted(): void {
    console.log('📝 [HelperAppOnboarding] Marking onboarding as completed');
    localStorage.setItem(this.ONBOARDING_COMPLETED, 'true');
    localStorage.setItem(this.LAST_SHOWN_DATE, new Date().toISOString());
  }

  /**
   * Markiert das Onboarding als übersprungen
   */
  markOnboardingSkipped(): void {
    console.log('📝 [HelperAppOnboarding] Marking onboarding as skipped');
    localStorage.setItem(this.ONBOARDING_SKIPPED, 'true');
    localStorage.setItem(this.LAST_SHOWN_DATE, new Date().toISOString());
  }

  /**
   * Setzt das Onboarding zurück (für Testing/Support)
   */
  resetOnboarding(): void {
    console.log('🔄 [HelperAppOnboarding] Resetting onboarding status');
    localStorage.removeItem(this.ONBOARDING_COMPLETED);
    localStorage.removeItem(this.ONBOARDING_SKIPPED);
    localStorage.removeItem(this.LAST_SHOWN_DATE);
    console.log('✅ [HelperAppOnboarding] Onboarding status reset complete');
  }

  /**
   * Prüft ob Onboarding bereits abgeschlossen wurde
   */
  private isOnboardingCompleted(): boolean {
    const value = localStorage.getItem(this.ONBOARDING_COMPLETED);
    const result = value === 'true';
    console.log('🔍 [HelperAppOnboarding] isOnboardingCompleted():', result, '(raw value:', value, ')');
    return result;
  }

  /**
   * Prüft ob Onboarding übersprungen wurde
   */
  private isOnboardingSkipped(): boolean {
    const value = localStorage.getItem(this.ONBOARDING_SKIPPED);
    const result = value === 'true';
    console.log('🔍 [HelperAppOnboarding] isOnboardingSkipped():', result, '(raw value:', value, ')');
    return result;
  }

  /**
   * Prüft ob Onboarding heute bereits angezeigt wurde
   */
  private wasShownToday(): boolean {
    const lastShown = localStorage.getItem(this.LAST_SHOWN_DATE);
    console.log('🔍 [HelperAppOnboarding] lastShown raw value:', lastShown);

    if (!lastShown) {
      console.log('🔍 [HelperAppOnboarding] wasShownToday(): false (no last shown date)');
      return false;
    }

    const lastShownDate = new Date(lastShown);
    const today = new Date();
    const result = lastShownDate.toDateString() === today.toDateString();

    console.log('🔍 [HelperAppOnboarding] wasShownToday():', result);
    console.log('  - lastShownDate:', lastShownDate.toDateString());
    console.log('  - today:', today.toDateString());

    return result;
  }
}
