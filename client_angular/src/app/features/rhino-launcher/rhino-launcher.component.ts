import { Component, OnInit, OnDestroy } from '@angular/core';
import { RhinoLauncherService, GrasshopperFile } from './rhino-launcher.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { TaskSelectionDialogComponent } from '../task-selection-dialog/task-selection-dialog.component';

@Component({
  selector: 'app-rhino-launcher',
  templateUrl: './rhino-launcher.component.html',
  styleUrls: ['./rhino-launcher.component.scss'] // Corrected path if it was wrong, ensuring it's an array
})
export class RhinoLauncherComponent implements OnInit, OnDestroy {
  files: GrasshopperFile[] = [];
  selectedFile: GrasshopperFile | null = null;
  isRhinoProtocolSupported = false;
  rhinoUri: SafeUrl | null = null;
  showFallback = false; // Controls visibility of the fallback UI

  private destroy$ = new Subject<void>();

  constructor(
    private rhinoService: RhinoLauncherService,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Load available Grasshopper files from the server
    this.rhinoService.getGrasshopperFiles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (files) => {
          this.files = files;
        },
        error: (err) => {
          console.error('Error loading Grasshopper files:', err);
          // Optionally, display an error message to the user
        }
      });

    // Check if the rhino:// custom protocol is supported
    this.rhinoService.checkRhinoProtocolSupport().then(supported => {
      this.isRhinoProtocolSupported = supported;
      if (!supported) {
        // If protocol is not supported, prepare to show fallback immediately
        // or after a launch attempt. For now, we'll set it based on initial check.
        // this.showFallback = true; // Decided to show fallback only after a failed launch attempt
      }
    });
  }

  // Handles the selection of a Grasshopper file from the list
  selectFile(file: GrasshopperFile): void {
    this.selectedFile = file;
    this.showFallback = false; // Reset fallback visibility on new selection
    if (this.selectedFile) {
      // WICHTIG: Wir stellen sicher, dass wir Windows-Pfade verwenden (mit Backslashes)
      // und dass der Pfad absolut und vollständig ist.
      // Wir ersetzen Schrägstriche durch Backslashes für Windows-Pfade
      let cleanPath = this.selectedFile.path.replace(/\//g, '\\');

      // Stellen sicher, dass der Pfad mit Laufwerksbuchstaben beginnt
      if (!cleanPath.match(/^[A-Z]:\\/i)) {
        console.warn('Path does not appear to be absolute. This may cause issues with Rhino loading the file.');
      }

      // Logge den finalen Pfad zur Fehlerdiagnose
      console.log(`Using file path: ${cleanPath}`);

      // URI für rhinogh:// Protokoll erstellen und sanitieren
      const rawUri = `rhinogh://${cleanPath}`;
      this.rhinoUri = this.sanitizer.bypassSecurityTrustUrl(rawUri);
      console.log(`Generated rhinogh:// URI: ${rawUri}`);
    } else {
      this.rhinoUri = null;
    }
  }

  // Attempts to launch Rhino with the selected file
  launchRhino(): void {
    if (!this.rhinoUri || !this.selectedFile) {
      console.warn('No file selected or URI not generated.');
      this.showFallback = true; // Show fallback if no file is selected
      return;
    }

    // The isRhinoProtocolSupported check is less critical now as the service always returns true.
    // However, keeping it doesn't harm, as a future, more reliable check might be re-introduced.
    if (!this.isRhinoProtocolSupported) {
      console.warn('Rhino protocol was initially determined as not supported (this check is currently simplified). Showing fallback.');
      this.showFallback = true;
      return;
    }

    // Log the attempt. The actual navigation is handled by the href attribute of the <a> tag.
    console.log(`Button clicked. Relying on href to navigate to: ${this.rhinoUri}`);

    // No window.open() or window.location.href here.
    // The primary purpose of this function now is to handle pre-click logic (like the checks above)
    // or to potentially implement more sophisticated post-click failure detection if needed in the future,
    // though that is complex with custom protocol handlers.
  }

  // Opens the fallback viewer (placeholder for actual implementation)
  openInFallbackViewer(): void {
    if (!this.selectedFile) return;
    // This would typically navigate to a new route or open a modal
    // with a web-based viewer (e.g., using Rhino3dm.js or a server-side render)
    console.log(`Opening ${this.selectedFile.name} in fallback viewer.`);
    alert(`Fallback: Display ${this.selectedFile.name} using a web viewer (e.g., Rhino.Compute or rhino3dm.js). This feature is not yet implemented.`);
    // Example: this.router.navigate(['/viewer', this.selectedFile.id]);
  }

  /**
   * Opens the task selection dialog
   * This dialog allows users to choose between different task types
   */
  openTaskSelectionDialog(): void {
    this.dialog.open(TaskSelectionDialogComponent, {
      width: '80%',
      maxWidth: '800px'
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
