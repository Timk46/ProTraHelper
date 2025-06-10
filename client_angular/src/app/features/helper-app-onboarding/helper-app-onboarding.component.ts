import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import {
  HelperAppOnboardingService,
  OnboardingStep,
  HelperAppStatus
} from '../../Services/helper-app-onboarding/helper-app-onboarding.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-helper-app-onboarding',
  templateUrl: './helper-app-onboarding.component.html',
  styleUrls: ['./helper-app-onboarding.component.scss']
})
export class HelperAppOnboardingComponent implements OnInit, OnDestroy {
  steps: OnboardingStep[] = [];
  currentStepIndex = 0;
  isLoading = false;
  helperAppStatus: HelperAppStatus | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<HelperAppOnboardingComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public onboardingService: HelperAppOnboardingService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.steps = this.onboardingService.getOnboardingSteps();
    this.checkHelperAppStatus();

    // Dialog soll nicht durch ESC oder Backdrop-Click geschlossen werden
    this.dialogRef.disableClose = true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Gibt den aktuellen Schritt zurück
   */
  get currentStep(): OnboardingStep {
    return this.steps[this.currentStepIndex];
  }

  /**
   * Prüft ob es einen nächsten Schritt gibt
   */
  get hasNextStep(): boolean {
    return this.currentStepIndex < this.steps.length - 1;
  }

  /**
   * Prüft ob es einen vorherigen Schritt gibt
   */
  get hasPreviousStep(): boolean {
    return this.currentStepIndex > 0;
  }

  /**
   * Geht zum nächsten Schritt
   */
  nextStep(): void {
    if (this.hasNextStep) {
      this.currentStepIndex++;
    }
  }

  /**
   * Geht zum vorherigen Schritt
   */
  previousStep(): void {
    if (this.hasPreviousStep) {
      this.currentStepIndex--;
    }
  }

  /**
   * Prüft den Status der Helper-App
   */
  private checkHelperAppStatus(): void {
    this.isLoading = true;
    this.onboardingService.checkHelperAppStatus()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (status) => {
          this.helperAppStatus = status;

          // Wenn Helper-App bereits läuft, springe zum Konfigurationsschritt
          if (status.isRunning) {
            this.jumpToConfigurationStep();
          }
        },
        error: (error) => {
          console.error('Error checking helper app status:', error);
          this.helperAppStatus = {
            isInstalled: false,
            isRunning: false
          };
        }
      });
  }

  /**
   * Springt zum Konfigurationsschritt wenn Helper-App bereits läuft
   */
  private jumpToConfigurationStep(): void {
    const configStepIndex = this.steps.findIndex(step => step.id === 'configure');
    if (configStepIndex > -1) {
      this.currentStepIndex = configStepIndex;
      this.showSnackBar('Helper-App erkannt! Fahren Sie mit der Konfiguration fort.', 'info');
    }
  }

  /**
   * Behandelt Aktionen der Onboarding-Schritte
   */
  handleStepAction(action: OnboardingStep['action']): void {
    if (!action) return;

    switch (action.type) {
      case 'next':
        this.nextStep();
        break;

      case 'download':
        this.handleDownload(action.url);
        break;

      case 'check-status':
        this.recheckHelperAppStatus();
        break;

      case 'close':
        this.completeOnboarding();
        break;
    }
  }

  /**
   * Behandelt den Download der Helper-App
   */
  private handleDownload(url?: string): void {
    if (!url) {
      this.showSnackBar('Download-URL nicht verfügbar.', 'error');
      return;
    }

    try {
      // Öffne Download-Link in neuem Tab
      const link = document.createElement('a');
      link.href = url;
      link.download = '';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Zeige Bestätigung und gehe zum nächsten Schritt
      this.showSnackBar('Download gestartet. Bitte installieren Sie die Helper-App.', 'success');

      // Automatisch zum nächsten Schritt nach kurzer Verzögerung
      setTimeout(() => {
        this.nextStep();
      }, 2000);

    } catch (error) {
      console.error('Error starting download:', error);
      this.showSnackBar('Fehler beim Starten des Downloads.', 'error');
    }
  }

  /**
   * Prüft den Helper-App Status erneut
   */
  recheckHelperAppStatus(): void {
    this.isLoading = true;
    this.onboardingService.checkHelperAppStatus()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (status) => {
          this.helperAppStatus = status;

          if (status.isRunning) {
            this.showSnackBar('Helper-App gefunden und läuft!', 'success');
            this.nextStep();
          } else {
            this.showSnackBar('Helper-App noch nicht erkannt. Stellen Sie sicher, dass sie installiert und gestartet ist.', 'warn');
          }
        },
        error: (error) => {
          console.error('Error rechecking helper app status:', error);
          this.showSnackBar('Helper-App nicht gefunden. Bitte installieren und starten Sie die App.', 'error');
        }
      });
  }

  /**
   * Schließt das Onboarding ab
   */
  completeOnboarding(): void {
    this.onboardingService.markOnboardingCompleted();
    this.showSnackBar('Onboarding abgeschlossen! Sie können jetzt Rhino-Dateien öffnen.', 'success');
    this.closeDialog();
  }

  /**
   * Überspringt das Onboarding
   */
  skipOnboarding(): void {
    this.onboardingService.markOnboardingSkipped();
    this.showSnackBar('Onboarding übersprungen. Sie können es später über die Hilfe erneut aufrufen.', 'info');
    this.closeDialog();
  }

  /**
   * Schließt den Dialog
   */
  closeDialog(): void {
    this.dialogRef.close();
  }

  /**
   * Öffnet die Rhino-Launcher Seite
   */
  openRhinoLauncher(): void {
    // TODO: Navigation zur Rhino-Launcher Route implementieren
    this.router.navigate(['/rhino-launcher']);
    this.closeDialog();
  }

  /**
   * Zeigt eine Snackbar-Nachricht
   */
  private showSnackBar(message: string, type: 'success' | 'error' | 'warn' | 'info' = 'info'): void {
    const config = {
      duration: type === 'error' ? 6000 : 4000,
      horizontalPosition: 'end' as const,
      verticalPosition: 'top' as const,
      panelClass: [`snackbar-${type}`]
    };

    this.snackBar.open(message, 'OK', config);
  }

  /**
   * Formatiert Beschreibung mit Zeilenumbrüchen
   */
  formatDescription(description: string): string[] {
    return description.split('\n').filter(line => line.trim().length > 0);
  }

  /**
   * Gibt Debugging-Informationen zurück
   */
  getDebugInfo(): string {
    return JSON.stringify({
      currentStep: this.currentStepIndex,
      helperAppStatus: this.helperAppStatus,
      platform: this.onboardingService.detectPlatform()
    }, null, 2);
  }

  /**
   * Prüft, ob die Bedingungen erfüllt sind, um zum nächsten Schritt fortzufahren.
   * Relevant für Schritte, die eine Überprüfung erfordern.
   */
  canProceed(): boolean {
    if (!this.helperAppStatus) return false;

    switch (this.currentStep.id) {
      case 'configure':
        // Explizit auf 'true' prüfen, um 'undefined' als 'false' zu behandeln
        return this.helperAppStatus.isRunning === true && this.helperAppStatus.rhinoPathConfigured === true;
      // Weitere Fälle hier hinzufügen, falls andere Schritte auch Bedingungen haben
      default:
        // Standardmäßig kann immer fortgefahren werden, wenn die Aktion 'next' ist
        return true;
    }
  }
}
