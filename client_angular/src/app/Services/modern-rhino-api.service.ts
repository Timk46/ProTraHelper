/**
 * Modern Rhino API Service
 * High-performance TypeScript client for FastAPI + Rhino.Inside backend
 * Features: WebSocket real-time updates, async command execution, type safety
 */

import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, fromEvent, timer } from 'rxjs';
import { map, catchError, takeUntil, retry, timeout, share, finalize } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../environments/environment';

// TypeScript interfaces for type safety
export enum CommandType {
  GRASSHOPPER_LOAD = 'grasshopper_load',
  RHINO_SCRIPT = 'rhino_script',
  GEOMETRY_OPERATION = 'geometry_operation',
  CUSTOM_COMMAND = 'custom_command'
}

export interface RhinoCommandRequest {
  command: string;
  command_type: CommandType;
  file_path?: string;
  parameters?: Record<string, any>;
  async_execution?: boolean;
  timeout?: number;
}

export interface RhinoCommandResponse {
  success: boolean;
  message: string;
  execution_id?: string;
  result_data?: Record<string, any>;
  execution_time_ms?: number;
  command_type: CommandType;
  timestamp: string;
}

export interface GrasshopperLoadRequest {
  file_path: string;
  show_viewport?: boolean;
  batch_mode?: boolean;
}

export interface SystemStatus {
  status: string;
  rhino_available: boolean;
  rhino_version?: string;
  active_commands: number;
  uptime_seconds: number;
  api_version: string;
}

export interface WebSocketMessage {
  type: string;
  execution_id?: string;
  success?: boolean;
  message?: string;
  command_type?: CommandType;
  error?: string;
  [key: string]: any;
}

export interface CommandHistory {
  history: Array<{
    execution_id: string;
    command: string;
    success: boolean;
    execution_time_ms: number;
    timestamp: string;
  }>;
  total_commands: number;
}

/**
 * Configuration interface for the service
 */
export interface ModernRhinoApiConfig {
  baseUrl: string;
  apiKey: string;
  websocketUrl: string;
  timeoutMs: number;
  retryAttempts: number;
  enableWebSocket: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModernRhinoApiService implements OnDestroy {
  private readonly defaultConfig: ModernRhinoApiConfig = {
    baseUrl: environment.production ? 'https://your-rhino-api.com' : 'http://127.0.0.1:8000',
    apiKey: environment.production ? 'your-production-api-key' : 'dev-key-rhino-2025',
    websocketUrl: environment.production ? 'wss://your-rhino-api.com/ws/rhino' : 'ws://127.0.0.1:8000/ws/rhino',
    timeoutMs: 30000,
    retryAttempts: 3,
    enableWebSocket: true
  };

  private config: ModernRhinoApiConfig;
  private destroy$ = new Subject<void>();

  // WebSocket connection
  private websocket$?: WebSocketSubject<WebSocketMessage>;
  private websocketMessages$ = new Subject<WebSocketMessage>();
  private connectionStatus$ = new BehaviorSubject<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Service state
  private systemStatus$ = new BehaviorSubject<SystemStatus | null>(null);
  private activeCommands$ = new BehaviorSubject<Set<string>>(new Set());
  private commandHistory$ = new BehaviorSubject<CommandHistory | null>(null);

  constructor(
    private http: HttpClient
  ) {
    this.config = { ...this.defaultConfig };

    // Initialize WebSocket connection if enabled
    if (this.config.enableWebSocket) {
      this.initializeWebSocket();
    }

    // Load initial system status
    this.loadSystemStatus();

    console.log('🦏 Modern Rhino API Service initialized', {
      baseUrl: this.config.baseUrl,
      websocketEnabled: this.config.enableWebSocket
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnectWebSocket();
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Execute a Rhino command with full type safety and error handling
   */
  executeCommand(request: RhinoCommandRequest): Observable<RhinoCommandResponse> {
    const headers = this.getAuthHeaders();

    console.log('🔧 Executing Rhino command', {
      type: request.command_type,
      async: request.async_execution,
      command: request.command.substring(0, 50) + (request.command.length > 50 ? '...' : '')
    });

    return this.http.post<RhinoCommandResponse>(
      `${this.config.baseUrl}/api/rhino/execute`,
      request,
      { headers }
    ).pipe(
      timeout(request.timeout ? request.timeout * 1000 : this.config.timeoutMs),
      retry(this.config.retryAttempts),
      map(response => {
        // Track active commands
        if (response.execution_id && !request.async_execution) {
          this.removeActiveCommand(response.execution_id);
        }
        return response;
      }),
      catchError(error => this.handleError('executeCommand', error)),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Load a Grasshopper file with optimized command sequence
   */
  loadGrasshopperFile(request: GrasshopperLoadRequest): Observable<RhinoCommandResponse> {
    const headers = this.getAuthHeaders();

    console.log('🦗 Loading Grasshopper file', { filePath: request.file_path });

    return this.http.post<RhinoCommandResponse>(
      `${this.config.baseUrl}/api/rhino/grasshopper/load`,
      request,
      { headers }
    ).pipe(
      timeout(this.config.timeoutMs),
      retry(this.config.retryAttempts),
      catchError(error => this.handleError('loadGrasshopperFile', error)),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Execute the specific Grasshopper command sequence requested by user
   */
  executeGrasshopperCommand(filePath: string = 'C:\\Dev\\hefl\\files\\Grasshopper\\example.gh'): Observable<RhinoCommandResponse> {
    const command = `_-Grasshopper B D W L W H D O "${filePath}" W H _MaxViewport _Enter`;

    const request: RhinoCommandRequest = {
      command,
      command_type: CommandType.GRASSHOPPER_LOAD,
      file_path: filePath,
      timeout: 45 // Longer timeout for file operations
    };

    return this.executeCommand(request);
  }

  /**
   * Get system status and health information
   */
  getSystemStatus(): Observable<SystemStatus> {
    const headers = this.getAuthHeaders();

    return this.http.get<SystemStatus>(
      `${this.config.baseUrl}/api/rhino/status`,
      { headers }
    ).pipe(
      map(status => {
        this.systemStatus$.next(status);
        return status;
      }),
      catchError(error => this.handleError('getSystemStatus', error)),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Get command execution history
   */
  getCommandHistory(limit: number = 10): Observable<CommandHistory> {
    const headers = this.getAuthHeaders();

    return this.http.get<CommandHistory>(
      `${this.config.baseUrl}/api/rhino/commands/history?limit=${limit}`,
      { headers }
    ).pipe(
      map(history => {
        this.commandHistory$.next(history);
        return history;
      }),
      catchError(error => this.handleError('getCommandHistory', error)),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Check if the API service is available
   */
  checkHealth(): Observable<boolean> {
    return this.http.get(`${this.config.baseUrl}/health`).pipe(
      map(() => true),
      catchError(() => [false]),
      timeout(5000),
      takeUntil(this.destroy$)
    );
  }

  // ===== WEBSOCKET METHODS =====

  /**
   * Get WebSocket messages as observable
   */
  getWebSocketMessages(): Observable<WebSocketMessage> {
    return this.websocketMessages$.asObservable();
  }

  /**
   * Get WebSocket connection status
   */
  getConnectionStatus(): Observable<'disconnected' | 'connecting' | 'connected'> {
    return this.connectionStatus$.asObservable();
  }

  /**
   * Manually reconnect WebSocket
   */
  reconnectWebSocket(): void {
    this.disconnectWebSocket();
    this.initializeWebSocket();
  }

  // ===== OBSERVABLE STATE GETTERS =====

  /**
   * Get current system status as observable
   */
  getSystemStatus$(): Observable<SystemStatus | null> {
    return this.systemStatus$.asObservable();
  }

  /**
   * Get active commands as observable
   */
  getActiveCommands$(): Observable<Set<string>> {
    return this.activeCommands$.asObservable();
  }

  /**
   * Get command history as observable
   */
  getCommandHistory$(): Observable<CommandHistory | null> {
    return this.commandHistory$.asObservable();
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if Rhino is available according to last status check
   */
  isRhinoAvailable(): boolean {
    const status = this.systemStatus$.value;
    return status?.rhino_available ?? false;
  }

  /**
   * Get current configuration
   */
  getConfig(): ModernRhinoApiConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ModernRhinoApiConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reconnect WebSocket if URL changed
    if (newConfig.websocketUrl) {
      this.reconnectWebSocket();
    }
  }

  // ===== PRIVATE METHODS =====

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey
    });
  }

  private initializeWebSocket(): void {
    if (!this.config.enableWebSocket) return;

    this.connectionStatus$.next('connecting');

    try {
      this.websocket$ = webSocket<WebSocketMessage>({
        url: this.config.websocketUrl,
        openObserver: {
          next: () => {
            console.log('🌐 WebSocket connected to Rhino API');
            this.connectionStatus$.next('connected');
          }
        },
        closeObserver: {
          next: () => {
            console.log('🌐 WebSocket disconnected from Rhino API');
            this.connectionStatus$.next('disconnected');
            this.scheduleReconnect();
          }
        }
      });

      this.websocket$.pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (message) => {
          this.handleWebSocketMessage(message);
          this.websocketMessages$.next(message);
        },
        error: (error) => {
          console.error('🌐 WebSocket error:', error);
          this.connectionStatus$.next('disconnected');
          this.scheduleReconnect();
        }
      });

      // Send periodic ping to keep connection alive
      timer(0, 30000).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        if (this.connectionStatus$.value === 'connected') {
          this.websocket$?.next({ type: 'ping' });
        }
      });

    } catch (error) {
      console.error('🌐 Failed to initialize WebSocket:', error);
      this.connectionStatus$.next('disconnected');
      this.scheduleReconnect();
    }
  }

  private handleWebSocketMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'command_completed':
      case 'async_command_completed':
        if (message.execution_id) {
          this.removeActiveCommand(message.execution_id);
        }
        console.log('✅ Command completed via WebSocket:', message);
        break;

      case 'async_command_failed':
        if (message.execution_id) {
          this.removeActiveCommand(message.execution_id);
        }
        console.error('❌ Command failed via WebSocket:', message);
        break;

      case 'connection_established':
        console.log('🦏 Rhino API WebSocket connection established');
        break;

      case 'pong':
        // Keep-alive response
        break;

      default:
        console.log('📨 WebSocket message:', message);
    }
  }

  private disconnectWebSocket(): void {
    if (this.websocket$) {
      this.websocket$.complete();
      this.websocket$ = undefined;
    }
    this.connectionStatus$.next('disconnected');
  }

  private scheduleReconnect(): void {
    // Exponential backoff reconnection
    timer(5000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.connectionStatus$.value === 'disconnected') {
        console.log('🔄 Attempting WebSocket reconnection...');
        this.initializeWebSocket();
      }
    });
  }

  private addActiveCommand(executionId: string): void {
    const current = this.activeCommands$.value;
    current.add(executionId);
    this.activeCommands$.next(new Set(current));
  }

  private removeActiveCommand(executionId: string): void {
    const current = this.activeCommands$.value;
    current.delete(executionId);
    this.activeCommands$.next(new Set(current));
  }

  private loadSystemStatus(): void {
    // Load initial status
    this.getSystemStatus().subscribe({
      next: (status) => {
        console.log('🦏 System status loaded:', status);
      },
      error: (error) => {
        console.warn('⚠️ Could not load initial system status:', error);
      }
    });

    // Periodically refresh status
    timer(0, 60000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.getSystemStatus().subscribe();
    });
  }

  private handleError(operation: string, error: HttpErrorResponse): Observable<never> {
    console.error(`🚨 ${operation} failed:`, error);

    const errorMessage = error.error?.detail || error.message || 'Unknown error occurred';
    throw new Error(`${operation}: ${errorMessage}`);
  }
}
