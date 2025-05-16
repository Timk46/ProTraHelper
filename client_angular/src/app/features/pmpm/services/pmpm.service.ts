import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { environment } from '../../../../environments/environment';
import {
  PmpmSessionRequest,
  PmpmSession,
  PmpmSessionStatus,
  ParameterChange,
  ParameterUpdateResult
} from '../models/pmpm-session.model';

/**
 * Service for interacting with PMPM sessions and WebSocket events
 */
@Injectable({
  providedIn: 'root'
})
export class PmpmService {
  private socket: Socket | null = null;
  private apiUrl = `${environment.server}/pmpm`;

  // Subjects to expose as Observables
  private currentSessionSubject = new BehaviorSubject<PmpmSession | null>(null);
  private parameterUpdateSubject = new BehaviorSubject<ParameterUpdateResult | null>(null);
  private fileExportedSubject = new BehaviorSubject<any | null>(null);
  private analysisCompletedSubject = new BehaviorSubject<any | null>(null);

  // Public Observables
  currentSession$ = this.currentSessionSubject.asObservable();
  parameterUpdate$ = this.parameterUpdateSubject.asObservable();
  fileExported$ = this.fileExportedSubject.asObservable();
  analysisCompleted$ = this.analysisCompletedSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Starts a new PMPM session
   *
   * @param modelId ID of the .3dm model to load
   * @param configuration Optional configuration parameters
   */
  startSession(modelId: string, configuration?: string): Observable<PmpmSession> {
    const request: PmpmSessionRequest = {
      modelId,
      configuration
    };

    return this.http.post<PmpmSession>(`${this.apiUrl}/session`, request).pipe(
      tap(session => {
        this.currentSessionSubject.next(session);
        this.connectWebSocket(session.sessionId);
      }),
      catchError(error => {
        console.error('Error starting PMPM session:', error);
        return throwError(() => new Error('Failed to start PMPM session'));
      })
    );
  }

  /**
   * Gets the status of an existing session
   *
   * @param sessionId ID of the session to check
   */
  getSessionStatus(sessionId: string): Observable<PmpmSessionStatus> {
    return this.http.get<PmpmSessionStatus>(`${this.apiUrl}/session/${sessionId}/status`).pipe(
      catchError(error => {
        console.error('Error getting session status:', error);
        return throwError(() => new Error('Failed to get session status'));
      })
    );
  }

  /**
   * Ends the current session
   */
  endSession(): Observable<void> {
    const session = this.currentSessionSubject.value;
    if (!session) {
      return throwError(() => new Error('No active session'));
    }

    return this.http.delete<void>(`${this.apiUrl}/session/${session.sessionId}`).pipe(
      tap(() => {
        this.disconnectWebSocket();
        this.currentSessionSubject.next(null);
      }),
      catchError(error => {
        console.error('Error ending session:', error);
        return throwError(() => new Error('Failed to end session'));
      })
    );
  }

  /**
   * Sends a parameter change event through WebSocket
   *
   * @param change Parameter change data
   */
  sendParameterChange(change: ParameterChange): void {
    if (!this.socket) {
      console.error('No WebSocket connection');
      return;
    }

    this.socket.emit('parameter.change', change);
  }

  /**
   * Connects to the WebSocket server for real-time updates
   *
   * @param sessionId ID of the session to subscribe to
   */
  private connectWebSocket(sessionId: string): void {
    // Disconnect any existing socket
    this.disconnectWebSocket();

    // Connect to the WebSocket server with session ID as a query parameter
    this.socket = io(`${environment.websocketUrl}/pmpm`, {
      query: { sessionId },
      transports: ['websocket'],
      autoConnect: true
    });

    // Set up event listeners
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.socket?.emit('subscribe', sessionId);
    });

    this.socket.on('parameter.updated', (result: ParameterUpdateResult) => {
      this.parameterUpdateSubject.next(result);
    });

    this.socket.on('file.exported', (data: any) => {
      this.fileExportedSubject.next(data);
    });

    this.socket.on('analysis.completed', (data: any) => {
      this.analysisCompletedSubject.next(data);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Disconnects from the WebSocket server
   */
  private disconnectWebSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
