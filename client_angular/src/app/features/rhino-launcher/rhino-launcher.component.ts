import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { RhinoLauncherService, GrasshopperFile, HelperAppStatus, LaunchRhinoResponse } from './rhino-launcher.service';
import { Subject } from 'rxjs';
import { takeUntil, finalize, catchError, tap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { TaskSelectionDialogComponent } from '../task-selection-dialog/task-selection-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-rhino-launcher',
  templateUrl: './rhino-launcher.component.html',
  styleUrls: ['./rhino-launcher.component.scss'],
  encapsulation: ViewEncapsulation.None // Um globale Styles für Snackbar zu erlauben, falls nötig
})
export class RhinoLauncherComponent implements OnInit, OnDestroy {
  files: GrasshopperFile[] = [];
  selectedFile: GrasshopperFile | null = null;

  helperAppStatus: HelperAppStatus | null = null;
  helperAppError: string | null = null;
  isLoadingStatus = false;
  isLaunching = false;
  helperAppAvailable = false; // Neuer Status, um die Haupt-UI zu steuern

  helperApiTokenInput: string = '';

  // Neue Properties für Command-Info
  lastLaunchResult: any = null;
  showCommandDetails = false;

  private destroy$ = new Subject<void>();

  constructor(
    public rhinoService: RhinoLauncherService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.helperApiTokenInput = this.rhinoService.getApiToken() || '';
    this.loadGrasshopperFiles();
    this.checkHelperAppStatus();
  }

  loadGrasshopperFiles(): void {
    this.rhinoService.getGrasshopperFiles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (files) => { this.files = files; },
        error: (err) => {
          console.error('Error loading Grasshopper files:', err);
          this.snackBar.open(`Fehler beim Laden der Grasshopper-Dateien: ${err.message}`, 'Schließen', { duration: 5000, panelClass: 'error-snackbar' });
        }
      });
  }

  checkHelperAppStatus(): void {
    this.isLoadingStatus = true;
    this.helperAppError = null ;
    this.helperAppAvailable = false; // Zurücksetzen

    this.rhinoService.getHelperAppStatus()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingStatus = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (status) => {
          this.helperAppStatus = status;
          this.helperAppAvailable = true; // Helfer-App ist erreichbar
          if (!status.rhinoPathConfigured) {
            this.snackBar.open('Hinweis: Der Rhino-Pfad ist in der Helferanwendung noch nicht konfiguriert.', 'OK', { duration: 7000, panelClass: 'info-snackbar' });
          }
        },
        error: (err) => {
          this.helperAppStatus = null;
          this.helperAppAvailable = false;
          this.helperAppError = err.message || 'Helferanwendung nicht erreichbar.';
          this.snackBar.open(this.helperAppError as string, 'Schließen', { duration: 7000, panelClass: 'error-snackbar' });
        }
      });
  }

  saveApiToken(): void {
    const currentTokenValue = this.helperApiTokenInput;
    const tokenToSave = (typeof currentTokenValue === 'string') ? currentTokenValue.trim() : '';

    if (tokenToSave !== '') {
      this.rhinoService.setApiToken(tokenToSave);
      this.snackBar.open('API-Token für Helferanwendung gespeichert.', 'OK', { duration: 3000, panelClass: 'success-snackbar' });
      this.checkHelperAppStatus(); // Status erneut prüfen, da Token nun gesetzt ist
    } else {
      this.snackBar.open('Bitte geben Sie ein gültiges API-Token ein.', 'Schließen', { duration: 3000, panelClass: 'warn-snackbar' });
    }
  }

  clearApiToken(): void {
    this.rhinoService.clearApiToken();
    this.helperApiTokenInput = '';
    this.snackBar.open('API-Token entfernt.', 'OK', { duration: 3000, panelClass: 'info-snackbar' });
    this.checkHelperAppStatus(); // Status erneut prüfen
  }

  selectFile(file: GrasshopperFile): void {
    this.selectedFile = file;
  }

  launchRhino(): void {
    if (!this.selectedFile) {
      this.snackBar.open('Bitte wählen Sie zuerst eine Datei aus.', 'Schließen', { duration: 3000, panelClass: 'warn-snackbar' });
      return;
    }
    if (!this.helperAppStatus || !this.helperAppAvailable) {
      this.snackBar.open('Helferanwendung ist nicht erreichbar oder nicht gestartet.', 'Schließen', { duration: 5000, panelClass: 'error-snackbar' });
      this.checkHelperAppStatus();
      return;
    }
    if (!this.helperAppStatus.rhinoPathConfigured) {
      this.snackBar.open('Der Rhino-Pfad ist in der Helferanwendung nicht konfiguriert. Bitte im Tray-Menü der Helfer-App einstellen.', 'OK', { panelClass: 'long-snackbar warn-snackbar', duration: 10000 });
      return;
    }
    if (!this.rhinoService.getApiToken()) {
        this.snackBar.open('API-Token für Helferanwendung nicht konfiguriert. Bitte oben eintragen und speichern.', 'Schließen', { duration: 7000, panelClass: 'warn-snackbar' });
        return;
    }

    const filePathToLaunch = this.selectedFile.path;
    this.isLaunching = true;
    this.rhinoService.launchRhinoWithHelper(filePathToLaunch)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLaunching = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          // Speichere das Launch-Ergebnis für die Anzeige
          this.lastLaunchResult = {
            ...response,
            fileName: this.selectedFile?.name,
            timestamp: new Date()
          };

          if (response.success) {
            this.snackBar.open(response.message || 'Rhino wird gestartet...', 'OK', { duration: 5000, panelClass: 'success-snackbar' });

            // Zeige Command-Details automatisch an, wenn verfügbar
            if (response.commandUsed) {
              this.showCommandDetails = true;
            }
          } else {
            this.snackBar.open(`Fehler beim Starten von Rhino: ${response.message}`, 'Schließen', { duration: 7000, panelClass: 'error-snackbar' });
          }
        },
        error: (err) => {
          this.snackBar.open(`Fehler: ${err.message}`, 'Schließen', { duration: 7000, panelClass: 'error-snackbar' });
        }
      });
  }

  openTaskSelectionDialog(): void {
    this.dialog.open(TaskSelectionDialogComponent, {
      width: '80%',
      maxWidth: '800px'
    });
  }

  /**
   * Kopiert den übergebenen Text in die Zwischenablage
   * @param text - Der zu kopierende Text
   */
  copyToClipboard(text: string): void {
    if (navigator.clipboard && window.isSecureContext) {
      // Moderne Clipboard API (HTTPS erforderlich)
      navigator.clipboard.writeText(text).then(() => {
        this.snackBar.open('Befehl in Zwischenablage kopiert!', 'OK', {
          duration: 2000,
          panelClass: 'success-snackbar'
        });
      }).catch(() => {
        this.fallbackCopyToClipboard(text);
      });
    } else {
      // Fallback für ältere Browser oder HTTP
      this.fallbackCopyToClipboard(text);
    }
  }

  /**
   * Fallback-Methode für das Kopieren in die Zwischenablage
   * @param text - Der zu kopierende Text
   */
  private fallbackCopyToClipboard(text: string): void {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        this.snackBar.open('Befehl in Zwischenablage kopiert!', 'OK', {
          duration: 2000,
          panelClass: 'success-snackbar'
        });
      } else {
        throw new Error('Copy command failed');
      }
    } catch (err) {
      this.snackBar.open('Fehler beim Kopieren in die Zwischenablage', 'Schließen', {
        duration: 3000,
        panelClass: 'error-snackbar'
      });
      console.error('Failed to copy text: ', err);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
