import { Component, OnInit, OnDestroy, Inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortalModule } from '@angular/cdk/portal';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { PmpmService } from '../../services/pmpm.service';
import { PmpmSession } from '../../models/pmpm-session.model';
import { Subscription } from 'rxjs';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';

/**
 * Component for displaying the PMPM application in a fullscreen overlay
 */
@Component({
  selector: 'app-pmpm-overlay',
  standalone: true,
  imports: [CommonModule, PortalModule, OverlayModule, MatButtonModule, MatIconModule],
  templateUrl: './pmpm-overlay.component.html',
  styleUrls: ['./pmpm-overlay.component.scss']
})
export class PmpmOverlayComponent implements OnInit, OnDestroy {
  @ViewChild('iframeContainer') iframeContainer!: ElementRef;

  /** Session details from the backend */
  session: PmpmSession | null = null;

  /** Safe URL for iframe */
  safeUrl: SafeResourceUrl | null = null;

  /** Flag for fullscreen mode */
  isFullscreen = false;

  /** Flag for connection status */
  isConnected = false;

  /** Flag for loading state */
  isLoading = true;

  /** Overlay reference for fullscreen mode */
  private overlayRef: OverlayRef | null = null;

  /** Subscriptions to clean up */
  private subscriptions: Subscription[] = [];

  constructor(
    private pmpmService: PmpmService,
    private route: ActivatedRoute,
    private router: Router,
    private overlay: Overlay,
    private sanitizer: DomSanitizer,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // Get the model ID from the route parameters
    this.route.params.subscribe(params => {
      const modelId = params['modelId'];
      if (modelId) {
        this.startSession(modelId);
      } else {
        console.error('No model ID provided');
        // Navigate back to course page
        this.router.navigate(['../../'], { relativeTo: this.route });
      }
    });

    // Listen for window beforeunload event to clean up
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());

    // Clean up event listener
    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    // Close overlay if open
    if (this.overlayRef) {
      this.overlayRef.dispose();
    }

    // End session if active
    if (this.session) {
      this.pmpmService.endSession().subscribe();
    }
  }

  /**
   * Starts a new PMPM session
   */
  private startSession(modelId: string): void {
    this.isLoading = true;

    const sub = this.pmpmService.startSession(modelId).subscribe({
      next: (session) => {
        this.session = session;
        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(session.url || '');
        this.isConnected = true;
        this.isLoading = false;

        // Listen for file export events
        this.subscribeToEvents();
      },
      error: (error) => {
        console.error('Failed to start PMPM session:', error);
        this.isLoading = false;
        // TODO: Show error message to user
      }
    });

    this.subscriptions.push(sub);
  }

  /**
   * Subscribe to WebSocket events
   */
  private subscribeToEvents(): void {
    // File exported event
    const exportSub = this.pmpmService.fileExported$.subscribe(data => {
      if (data) {
        console.log('File exported:', data);
        // TODO: Handle file export, maybe show notification or update UI
      }
    });

    // Analysis completed event
    const analysisSub = this.pmpmService.analysisCompleted$.subscribe(data => {
      if (data) {
        console.log('Analysis completed:', data);
        // TODO: Handle analysis completion, maybe show results in another component
      }
    });

    this.subscriptions.push(exportSub, analysisSub);
  }

  /**
   * Toggles fullscreen mode
   */
  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;

    if (this.isFullscreen) {
      this.enterFullscreen();
    } else {
      this.exitFullscreen();
    }
  }

  /**
   * Enters fullscreen mode
   */
  private enterFullscreen(): void {
    if (!this.overlayRef) {
      const positionStrategy = this.overlay.position()
        .global()
        .top('0')
        .left('0')
        .right('0')
        .bottom('0');

      this.overlayRef = this.overlay.create({
        positionStrategy,
        hasBackdrop: false,
        panelClass: 'pmpm-fullscreen-overlay',
        scrollStrategy: this.overlay.scrollStrategies.block()
      });

      // Move the iframe container to the overlay
      const containerElement = this.iframeContainer.nativeElement;
      this.overlayRef.overlayElement.appendChild(containerElement);
    }
  }

  /**
   * Exits fullscreen mode
   */
  private exitFullscreen(): void {
    if (this.overlayRef) {
      // Move the iframe container back to the component
      const containerElement = this.iframeContainer.nativeElement;
      this.overlayRef.overlayElement.removeChild(containerElement);
      this.elementRef.nativeElement.appendChild(containerElement);

      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  /**
   * Closes the PMPM session and navigates back
   */
  closeSession(): void {
    if (this.isFullscreen) {
      this.exitFullscreen();
    }

    if (this.session) {
      this.pmpmService.endSession().subscribe({
        complete: () => {
          this.router.navigate(['../../'], { relativeTo: this.route });
        }
      });
    } else {
      this.router.navigate(['../../'], { relativeTo: this.route });
    }
  }

  /**
   * Attempts to reconnect to the session
   */
  reconnect(): void {
    if (!this.session) {
      return;
    }

    this.isLoading = true;

    // Reset the iframe URL to force reconnection
    this.safeUrl = null;
    setTimeout(() => {
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.session?.url || '');
      this.isLoading = false;
    }, 500);
  }

  /**
   * Handles beforeunload event to clean up session
   */
  private handleBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (this.session) {
      // Try to end the session before unloading
      // Note: This may not complete in time before the page unloads
      this.pmpmService.endSession().subscribe();

      // Modern browsers often ignore this, but try anyway
      event.preventDefault();
      event.returnValue = 'You have an active PMPM session. Are you sure you want to leave?';
    }
  };
}
