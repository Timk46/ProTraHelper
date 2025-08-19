/**
 * McSlider Rhino Integration Service - Optimized Version
 * Verwaltet die Integration zwischen McSlider-Komponente und Rhino-Fokussierung
 * Stellt Business Logic für automatische Rhino-Rückleitung bereit
 */

import { Injectable } from '@angular/core';
import { Observable, of, Subject, BehaviorSubject, timer, merge } from 'rxjs';
import {
  delay,
  catchError,
  tap,
  switchMap,
  debounceTime,
  throttleTime,
  shareReplay,
  retry,
  retryWhen,
  take,
  filter,
  map,
  finalize,
} from 'rxjs/operators';
import { RhinoFocusService } from './rhino-focus.service';
import { RhinoFocusRequestDTO, RhinoFocusResponseDTO } from '@DTOs/index';
import { environment } from 'src/environments/environment';

/**
 * Logging-Level für strukturiertes Logging
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Erweiterte Konfiguration für McSlider-Rhino Integration
 */
interface McSliderRhinoConfig {
  enabled: boolean;
  autoFocusAfterSubmission: boolean;
  autoFocusAfterCompletion: boolean;
  autoFocusOnClose: boolean;
  delayAfterSubmissionMs: number;
  delayAfterCompletionMs: number;
  delayOnCloseMs: number;
  silentMode: boolean;
  logging: {
    enabled: boolean;
    level: LogLevel;
  };
  rateLimiting: {
    enabled: boolean;
    minIntervalMs: number;
    maxAttemptsPerMinute: number;
  };
  retry: {
    enabled: boolean;
    maxAttempts: number;
    delayMs: number;
  };
  caching: {
    enabled: boolean;
    availabilityCacheMs: number;
  };
}

/**
 * Environment-abhängige Standard-Konfiguration
 */
const DEFAULT_CONFIG: McSliderRhinoConfig = {
  enabled: true,
  autoFocusAfterSubmission: true,
  autoFocusAfterCompletion: true,
  autoFocusOnClose: true,
  delayAfterSubmissionMs: 800,
  delayAfterCompletionMs: 1200,
  delayOnCloseMs: 300,
  silentMode: environment.production,
  logging: {
    enabled: !environment.production,
    level: environment.production ? LogLevel.WARN : LogLevel.DEBUG,
  },
  rateLimiting: {
    enabled: true,
    minIntervalMs: 1000,
    maxAttemptsPerMinute: 5,
  },
  retry: {
    enabled: true,
    maxAttempts: 3,
    delayMs: 1000,
  },
  caching: {
    enabled: true,
    availabilityCacheMs: 30000,
  },
};

/**
 * Ereignis-Typen für Rhino-Integration
 */
export enum RhinoIntegrationEvent {
  QUESTION_SUBMITTED = 'question_submitted',
  ALL_QUESTIONS_COMPLETED = 'all_questions_completed',
  COMPONENT_CLOSED = 'component_closed',
  RETRY_QUESTION = 'retry_question',
  MANUAL_SWITCH = 'manual_switch',
}

/**
 * Kontext-Informationen für Rhino-Integration
 */
export interface RhinoIntegrationContext {
  event: RhinoIntegrationEvent;
  questionIndex?: number;
  totalQuestions?: number;
  score?: number;
  maxScore?: number;
  isCorrect?: boolean;
  source?: string;
  attempt?: number;
  timestamp: string;
}

/**
 * Fokussierungs-Request für interne Verarbeitung
 */
interface FocusRequest {
  context: RhinoIntegrationContext;
  delayMs: number;
  reason: string;
  priority: number; // 0 = niedrig, 1 = normal, 2 = hoch
}

/**
 * Metrics für Monitoring und Debugging
 */
interface ServiceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  throttledRequests: number;
  lastRequestTime: Date | null;
  averageResponseTime: number;
  requestsByEvent: Record<RhinoIntegrationEvent, number>;
}

@Injectable({
  providedIn: 'root',
})
export class McSliderRhinoIntegrationService {
  private config: McSliderRhinoConfig = { ...DEFAULT_CONFIG };

  // RxJS-basierte Request-Verarbeitung
  private readonly focusRequests$ = new Subject<FocusRequest>();
  private readonly priorityRequests$ = new Subject<FocusRequest>();
  private rateLimitedFocus$!: Observable<RhinoFocusResponseDTO>;

  // Caching für Availability-Check
  private readonly availabilitySubject$ = new BehaviorSubject<boolean>(true);
  private readonly cacheInvalidation$ = new Subject<void>();

  // Metrics und Monitoring
  private readonly metrics: ServiceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    throttledRequests: 0,
    lastRequestTime: null,
    averageResponseTime: 0,
    requestsByEvent: {
      [RhinoIntegrationEvent.QUESTION_SUBMITTED]: 0,
      [RhinoIntegrationEvent.ALL_QUESTIONS_COMPLETED]: 0,
      [RhinoIntegrationEvent.COMPONENT_CLOSED]: 0,
      [RhinoIntegrationEvent.RETRY_QUESTION]: 0,
      [RhinoIntegrationEvent.MANUAL_SWITCH]: 0,
    },
  };

  constructor(private readonly rhinoFocusService: RhinoFocusService) {
    this.initializeService();
    this.log(
      LogLevel.INFO,
      'McSliderRhinoIntegrationService initialized with optimized architecture',
    );
  }

  /**
   * Initialisiert den Service mit optimierten RxJS-Streams
   */
  private initializeService(): void {
    this.initializeRateLimitedFocus();
    this.initializeAvailabilityCache();
    this.initializeMetricsReset();
  }

  /**
   * Initialisiert RxJS-basierte Request-Verarbeitung
   */
  private initializeRateLimitedFocus(): void {
    // Normale Requests mit Rate Limiting
    const normalRequests$ = this.focusRequests$.pipe(
      filter(() => this.config.rateLimiting.enabled),
      debounceTime(this.config.rateLimiting.minIntervalMs / 2),
      throttleTime(this.config.rateLimiting.minIntervalMs),
      tap(() => this.log(LogLevel.DEBUG, 'Processing normal request')),
    );

    // Priority Requests (manuelle Switches) ohne Rate Limiting
    const priorityRequests$ = this.priorityRequests$.pipe(
      tap(() => this.log(LogLevel.DEBUG, 'Processing priority request')),
    );

    // Merge beide Streams mit Priorität für manuelle Requests
    this.rateLimitedFocus$ = merge(priorityRequests$, normalRequests$).pipe(
      switchMap(request => this.processFocusRequest(request)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  /**
   * Initialisiert Availability-Cache
   */
  private initializeAvailabilityCache(): void {
    if (this.config.caching.enabled) {
      // Cache-Refresh alle 30 Sekunden
      timer(0, this.config.caching.availabilityCacheMs)
        .pipe(
          switchMap(() => this.checkRhinoAvailability()),
          tap(available => this.availabilitySubject$.next(available)),
        )
        .subscribe();
    }
  }

  /**
   * Initialisiert Metrics-Reset
   */
  private initializeMetricsReset(): void {
    // Reset Request-Counter alle Minute
    timer(60000, 60000).subscribe(() => {
      this.metrics.totalRequests = Math.max(0, this.metrics.totalRequests - 1);
      this.log(LogLevel.DEBUG, 'Metrics reset performed');
    });
  }

  /**
   * Verarbeitet Fokussierungs-Request mit optimierter Error-Handling
   */
  private processFocusRequest(request: FocusRequest): Observable<RhinoFocusResponseDTO> {
    const startTime = Date.now();
    this.updateMetrics(request);

    return of(null).pipe(
      delay(request.delayMs),
      tap(() =>
        this.log(LogLevel.DEBUG, `Processing focus request: ${request.reason}`, request.context),
      ),
      switchMap(() => this.rhinoFocusService.focusFirstAvailableWindow()),

      // Optimierte Retry-Logic mit exponential backoff
      retryWhen(errors =>
        errors.pipe(
          tap(error => this.log(LogLevel.WARN, `Retry focus request due to: ${error.message}`)),
          switchMap((error, index) => {
            if (!this.config.retry.enabled || index >= this.config.retry.maxAttempts) {
              throw error;
            }
            const delayMs = this.config.retry.delayMs * Math.pow(2, index);
            return timer(delayMs);
          }),
          take(this.config.retry.maxAttempts),
        ),
      ),

      // Success/Error Handling mit Metrics
      tap(result => {
        const responseTime = Date.now() - startTime;
        this.updateResponseMetrics(result.success, responseTime);

        if (result.success) {
          this.log(LogLevel.INFO, `Successfully focused Rhino ${request.reason}`, {
            responseTime,
            context: request.context,
          });
          this.logSuccessfulIntegration(request.context, result);
        } else {
          this.log(LogLevel.WARN, `Failed to focus Rhino ${request.reason}: ${result.message}`, {
            responseTime,
            context: request.context,
          });
          this.logFailedIntegration(request.context, result);
        }
      }),

      catchError(error => this.handleFocusError(request.context, error, request.reason)),
    );
  }

  /**
   * Aktualisiert Metrics für Request
   */
  private updateMetrics(request: FocusRequest): void {
    this.metrics.totalRequests++;
    this.metrics.lastRequestTime = new Date();
    this.metrics.requestsByEvent[request.context.event]++;
  }

  /**
   * Aktualisiert Response-Metrics
   */
  private updateResponseMetrics(success: boolean, responseTime: number): void {
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Berechne durchschnittliche Response-Zeit
    const totalResponses = this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (totalResponses - 1) + responseTime) / totalResponses;
  }

  /**
   * Strukturiertes Logging mit konfigurierbaren Levels
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.config.logging.enabled || level < this.config.logging.level) {
      return;
    }

    const logPrefix = '[RhinoIntegration]';
    const timestamp = new Date().toISOString();
    const logMessage = `${logPrefix} ${timestamp} ${LogLevel[level]}: ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, data);
        break;
      case LogLevel.INFO:
        console.info(logMessage, data);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, data);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, data);
        break;
    }
  }

  /**
   * Zentralisierte Error-Behandlung
   */
  private handleFocusError(
    context: RhinoIntegrationContext,
    error: any,
    reason: string,
  ): Observable<RhinoFocusResponseDTO> {
    this.metrics.failedRequests++;

    const errorResponse: RhinoFocusResponseDTO = {
      success: false,
      message: `Fehler bei Rhino-Fokussierung ${reason}: ${error.message || 'Unbekannter Fehler'}`,
      timestamp: new Date().toISOString(),
    };

    this.log(LogLevel.ERROR, `Rhino focus error ${reason}`, {
      error: error.message,
      context,
      stack: error.stack,
    });

    this.logFailedIntegration(context, errorResponse);
    return of(errorResponse);
  }

  /**
   * Prüft Rhino-Verfügbarkeit
   */
  private checkRhinoAvailability(): Observable<boolean> {
    return this.rhinoFocusService.isRhinoAvailable
      ? of(this.rhinoFocusService.isRhinoAvailable())
      : of(true);
  }

  /**
   * Zentrale Fokussierungs-Request-Methode
   */
  private requestFocus(
    context: RhinoIntegrationContext,
    delayMs: number,
    reason: string,
    priority: number = 1,
  ): Observable<RhinoFocusResponseDTO> {
    const request: FocusRequest = {
      context,
      delayMs,
      reason,
      priority,
    };

    // Rate Limiting prüfen (außer bei hoher Priorität)
    if (priority < 2 && this.config.rateLimiting.enabled && !this.canMakeRequest()) {
      this.metrics.throttledRequests++;
      this.log(LogLevel.WARN, 'Request throttled due to rate limiting', context);
      return of({
        success: false,
        message: 'Rate Limit erreicht - zu häufige Fokussierungs-Versuche',
        timestamp: new Date().toISOString(),
      });
    }

    // Request je nach Priorität verarbeiten
    if (priority >= 2) {
      this.priorityRequests$.next(request);
    } else {
      this.focusRequests$.next(request);
    }

    return this.rateLimitedFocus$;
  }

  /**
   * Prüft ob Request erlaubt ist (Rate Limiting)
   */
  private canMakeRequest(): boolean {
    if (!this.config.rateLimiting.enabled) {
      return true;
    }

    const now = Date.now();
    const lastRequest = this.metrics.lastRequestTime?.getTime() || 0;
    const timeSinceLastRequest = now - lastRequest;

    // Mindest-Intervall prüfen
    if (timeSinceLastRequest < this.config.rateLimiting.minIntervalMs) {
      return false;
    }

    // Maximale Requests pro Minute prüfen
    if (this.metrics.totalRequests >= this.config.rateLimiting.maxAttemptsPerMinute) {
      return false;
    }

    return true;
  }

  // ================================
  // PUBLIC API METHODS
  // ================================

  /**
   * Behandelt Fragen-Einreichung
   */
  handleQuestionSubmission(
    context: Partial<RhinoIntegrationContext>,
  ): Observable<RhinoFocusResponseDTO> {
    const fullContext: RhinoIntegrationContext = {
      event: RhinoIntegrationEvent.QUESTION_SUBMITTED,
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (!this.config.enabled || !this.config.autoFocusAfterSubmission) {
      return of(this.createDisabledResponse());
    }

    return this.requestFocus(
      fullContext,
      this.config.delayAfterSubmissionMs,
      'nach Fragen-Einreichung',
    );
  }

  /**
   * Behandelt Abschluss aller Fragen
   */
  handleAllQuestionsCompleted(
    context: Partial<RhinoIntegrationContext>,
  ): Observable<RhinoFocusResponseDTO> {
    const fullContext: RhinoIntegrationContext = {
      event: RhinoIntegrationEvent.ALL_QUESTIONS_COMPLETED,
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (!this.config.enabled || !this.config.autoFocusAfterCompletion) {
      return of(this.createDisabledResponse());
    }

    return this.requestFocus(
      fullContext,
      this.config.delayAfterCompletionMs,
      'nach Quiz-Abschluss',
    );
  }

  /**
   * Behandelt Komponenten-Schließung
   */
  handleComponentClose(
    context: Partial<RhinoIntegrationContext>,
  ): Observable<RhinoFocusResponseDTO> {
    const fullContext: RhinoIntegrationContext = {
      event: RhinoIntegrationEvent.COMPONENT_CLOSED,
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (!this.config.enabled || !this.config.autoFocusOnClose) {
      return of(this.createDisabledResponse());
    }

    return this.requestFocus(fullContext, this.config.delayOnCloseMs, 'beim Schließen');
  }

  /**
   * Behandelt Fragen-Wiederholung
   */
  handleQuestionRetry(
    context: Partial<RhinoIntegrationContext>,
  ): Observable<RhinoFocusResponseDTO> {
    const fullContext: RhinoIntegrationContext = {
      event: RhinoIntegrationEvent.RETRY_QUESTION,
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (!this.config.enabled) {
      return of(this.createDisabledResponse());
    }

    return this.requestFocus(fullContext, 300, 'bei Fragen-Wiederholung');
  }

  /**
   * Behandelt manuellen Rhino-Switch über Button - HÖCHSTE PRIORITÄT
   */
  handleManualRhinoSwitch(
    context: Partial<RhinoIntegrationContext>,
  ): Observable<RhinoFocusResponseDTO> {
    const fullContext: RhinoIntegrationContext = {
      event: RhinoIntegrationEvent.MANUAL_SWITCH,
      timestamp: new Date().toISOString(),
      source: 'manual_button',
      ...context,
    };

    if (!this.config.enabled) {
      return of(this.createDisabledResponse());
    }

    // Manuelle Switches haben höchste Priorität (2) - kein Rate Limiting
    return this.requestFocus(fullContext, 0, 'bei manuellem Switch', 2);
  }

  /**
   * Konfiguration aktualisieren
   */
  updateConfig(config: Partial<McSliderRhinoConfig>): void {
    this.config = { ...this.config, ...config };
    this.log(LogLevel.INFO, 'Configuration updated', this.config);
  }

  /**
   * Aktuelle Konfiguration abrufen
   */
  getConfig(): McSliderRhinoConfig {
    return { ...this.config };
  }

  /**
   * Metrics abrufen
   */
  getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Prüft ob Rhino-Integration verfügbar ist (mit Caching)
   */
  isIntegrationAvailable(): boolean {
    return this.config.enabled && this.availabilitySubject$.value;
  }

  /**
   * Asynchrone Verfügbarkeits-Prüfung
   */
  checkAvailabilityAsync(): Observable<boolean> {
    return this.availabilitySubject$.asObservable();
  }

  /**
   * Cache invalidieren
   */
  invalidateCache(): void {
    this.cacheInvalidation$.next();
    this.log(LogLevel.DEBUG, 'Cache invalidated');
  }

  /**
   * Aktiviert/Deaktiviert die Integration
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.log(LogLevel.INFO, `Integration ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Setzt die Konfiguration auf Standard-Werte zurück
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.log(LogLevel.INFO, 'Configuration reset to defaults');
  }

  /**
   * Erstellt eine Response für deaktivierte Funktionalität
   */
  private createDisabledResponse(): RhinoFocusResponseDTO {
    return {
      success: false,
      message: 'Rhino-Integration deaktiviert',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Loggt erfolgreiche Integration
   */
  private logSuccessfulIntegration(
    context: RhinoIntegrationContext,
    result: RhinoFocusResponseDTO,
  ): void {
    this.log(LogLevel.DEBUG, 'Successful Rhino integration', {
      event: context.event,
      source: context.source,
      questionIndex: context.questionIndex,
      totalQuestions: context.totalQuestions,
      score: context.score,
      maxScore: context.maxScore,
      isCorrect: context.isCorrect,
      attempt: context.attempt,
      focusResult: result.success,
      timestamp: context.timestamp,
    });
  }

  /**
   * Loggt fehlgeschlagene Integration
   */
  private logFailedIntegration(
    context: RhinoIntegrationContext,
    result: RhinoFocusResponseDTO,
  ): void {
    this.log(LogLevel.WARN, 'Failed Rhino integration', {
      event: context.event,
      source: context.source,
      questionIndex: context.questionIndex,
      totalQuestions: context.totalQuestions,
      attempt: context.attempt,
      error: result.message,
      timestamp: context.timestamp,
    });
  }
}
