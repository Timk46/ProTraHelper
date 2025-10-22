import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer, NEVER, of } from 'rxjs';
import { 
  map, 
  filter, 
  switchMap, 
  takeUntil, 
  retry, 
  retryWhen, 
  delay, 
  tap,
  distinctUntilChanged,
  debounceTime
} from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import {
  EvaluationCommentDTO,
  VoteUpdateData,
  EvaluationPhase,
  VoteResultDTO
} from '@DTOs/index';

export interface RealtimeEvent {
  type: 'comment-added' | 'vote-changed' | 'phase-switched' | 'user-joined' | 'user-left';
  submissionId: number;
  categoryId?: number;
  commentId?: number;
  userId?: number;
  data?: any;
  timestamp: Date;
}

export interface CommentEvent extends RealtimeEvent {
  type: 'comment-added';
  comment: EvaluationCommentDTO;
}

export interface VoteEvent extends RealtimeEvent {
  type: 'vote-changed';
  voteData: VoteUpdateData;
}

export interface PhaseEvent extends RealtimeEvent {
  type: 'phase-switched';
  newPhase: EvaluationPhase;
}

export interface UserEvent extends RealtimeEvent {
  type: 'user-joined' | 'user-left';
  anonymousDisplayName: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

/**
 * Service for managing real-time updates in the evaluation discussion forum
 * 
 * @description This service handles WebSocket connections to provide real-time updates
 * for comments, votes, phase changes, and user presence. It includes automatic
 * reconnection, connection health monitoring, and optimized event debouncing.
 */
@Injectable({
  providedIn: 'root'
})
export class EvaluationRealtimeService implements OnDestroy {
  private socket: Socket | null = null;
  private destroy$ = new Subject<void>();
  
  // Connection state management
  private connectionStatus$ = new BehaviorSubject<ConnectionStatus>('disconnected');
  private connectedUsers$ = new BehaviorSubject<string[]>([]);
  
  // Event streams
  private events$ = new Subject<CommentEvent | VoteEvent | PhaseEvent | UserEvent | RealtimeEvent>();
  private connectionErrors$ = new Subject<Error>();
  
  // Reconnection strategy
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff
  private reconnectAttempts = 0;
  
  // Performance optimization
  private readonly EVENT_DEBOUNCE_TIME = 100; // ms
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  
  // Connection health monitoring
  private lastHeartbeat = Date.now();
  private heartbeatTimer?: ReturnType<typeof setInterval>;

  constructor() {
    this.initializeHeartbeatMonitoring();
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  /**
   * Connects to the evaluation forum WebSocket for a specific submission
   * @param submissionId - The submission ID to subscribe to
   * @returns Observable<boolean> - Connection success status
   */
  connectToSubmission(submissionId: number): Observable<boolean> {
    console.log('🔌 Connecting to real-time updates for submission:', submissionId);
    
    if (this.socket?.connected) {
      this.joinSubmissionRoom(submissionId);
      return of(true);
    }

    this.connectionStatus$.next('connecting');
    
    return new Observable<boolean>(subscriber => {
      try {
        this.socket = io(`${environment.server}/evaluation-forum`, {
          transports: ['websocket', 'polling'],
          upgrade: true,
          rememberUpgrade: true,
          timeout: 10000,
          forceNew: false,
          query: {
            submissionId,
            clientType: 'angular-forum'
          }
        });

        this.setupSocketEventHandlers(submissionId);
        this.setupReconnectionStrategy();

        // Connection success
        this.socket.on('connect', () => {
          this.connectionStatus$.next('connected');
          this.reconnectAttempts = 0;
          this.lastHeartbeat = Date.now();
          subscriber.next(true);
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
          console.error('❌ WebSocket connection error:', error);
          this.connectionStatus$.next('error');
          this.connectionErrors$.next(error);
          subscriber.next(false);
        });

      } catch (error) {
        console.error('❌ Failed to initialize WebSocket connection:', error);
        this.connectionStatus$.next('error');
        subscriber.next(false);
      }
    });
  }

  /**
   * Disconnects from the WebSocket
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from real-time updates');
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectionStatus$.next('disconnected');
    this.connectedUsers$.next([]);
  }

  /**
   * Gets the current connection status
   * @returns Observable<ConnectionStatus>
   */
  getConnectionStatus(): Observable<ConnectionStatus> {
    return this.connectionStatus$.asObservable().pipe(
      distinctUntilChanged()
    );
  }

  /**
   * Gets the list of currently connected users
   * @returns Observable<string[]>
   */
  getConnectedUsers(): Observable<string[]> {
    return this.connectedUsers$.asObservable();
  }

  /**
   * Subscribes to real-time comment events
   * @param submissionId - Optional filter by submission ID
   * @returns Observable<CommentEvent>
   */
  subscribeToComments(submissionId?: number): Observable<CommentEvent> {
    return this.events$.pipe(
      debounceTime(this.EVENT_DEBOUNCE_TIME),
      filter((event): event is CommentEvent => 
        event.type === 'comment-added' && 
        (!submissionId || event.submissionId === submissionId)
      ),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Subscribes to real-time vote events
   * @param commentId - Optional filter by comment ID
   * @returns Observable<VoteEvent>
   */
  subscribeToVotes(commentId?: number): Observable<VoteEvent> {
    return this.events$.pipe(
      debounceTime(this.EVENT_DEBOUNCE_TIME),
      filter((event): event is VoteEvent => 
        event.type === 'vote-changed' && 
        (!commentId || event.commentId === commentId)
      ),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Subscribes to phase change events
   * @param submissionId - Optional filter by submission ID
   * @returns Observable<PhaseEvent>
   */
  subscribeToPhaseChanges(submissionId?: number): Observable<PhaseEvent> {
    return this.events$.pipe(
      filter((event): event is PhaseEvent => 
        event.type === 'phase-switched' && 
        (!submissionId || event.submissionId === submissionId)
      ),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Subscribes to user presence events
   * @param submissionId - Optional filter by submission ID
   * @returns Observable<UserEvent>
   */
  subscribeToUserPresence(submissionId?: number): Observable<UserEvent> {
    return this.events$.pipe(
      filter((event): event is UserEvent => 
        (event.type === 'user-joined' || event.type === 'user-left') &&
        (!submissionId || event.submissionId === submissionId)
      ),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Gets connection error stream
   * @returns Observable<Error>
   */
  getConnectionErrors(): Observable<Error> {
    return this.connectionErrors$.asObservable();
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Sets up WebSocket event handlers
   * @param submissionId - The submission ID
   */
  private setupSocketEventHandlers(submissionId: number): void {
    if (!this.socket) return;

    // Join submission room after connection
    this.socket.on('connect', () => {
      this.joinSubmissionRoom(submissionId);
    });

    // Handle disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.connectionStatus$.next('disconnected');
      
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Manual disconnect - don't reconnect
        return;
      }
      
      // Automatic reconnect for other reasons
      this.handleReconnection();
    });

    // Real-time event handlers
    this.socket.on('comment-added', (data) => {
      console.log('📝 Real-time comment received:', data);
      this.events$.next({
        type: 'comment-added',
        submissionId: data.submissionId,
        categoryId: data.categoryId,
        comment: data.comment,
        timestamp: new Date(data.timestamp)
      } as CommentEvent);
    });

    this.socket.on('vote-changed', (data) => {
      console.log('🗳️ Real-time vote received:', data);
      this.events$.next({
        type: 'vote-changed',
        submissionId: data.submissionId,
        commentId: data.commentId,
        voteData: data.voteData,
        timestamp: new Date(data.timestamp)
      } as VoteEvent);
    });

    this.socket.on('phase-switched', (data) => {
      this.events$.next({
        type: 'phase-switched',
        submissionId: data.submissionId,
        newPhase: data.newPhase,
        timestamp: new Date(data.timestamp)
      } as PhaseEvent);
    });

    this.socket.on('user-joined', (data) => {
      console.log('👋 User joined:', data);
      this.updateConnectedUsers(data.connectedUsers);
      this.events$.next({
        type: 'user-joined',
        submissionId: data.submissionId,
        userId: data.userId,
        anonymousDisplayName: data.anonymousDisplayName,
        timestamp: new Date(data.timestamp)
      } as UserEvent);
    });

    this.socket.on('user-left', (data) => {
      console.log('👋 User left:', data);
      this.updateConnectedUsers(data.connectedUsers);
      this.events$.next({
        type: 'user-left',
        submissionId: data.submissionId,
        userId: data.userId,
        anonymousDisplayName: data.anonymousDisplayName,
        timestamp: new Date(data.timestamp)
      } as UserEvent);
    });

    // Heartbeat for connection health
    this.socket.on('heartbeat', () => {
      this.lastHeartbeat = Date.now();
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.connectionErrors$.next(error);
    });
  }

  /**
   * Joins the submission room for targeted updates
   * @param submissionId - The submission ID
   */
  private joinSubmissionRoom(submissionId: number): void {
    if (!this.socket?.connected) return;
    
    console.log('🏠 Joining submission room:', submissionId);
    this.socket.emit('join-submission', { submissionId });
  }

  /**
   * Sets up automatic reconnection strategy
   */
  private setupReconnectionStrategy(): void {
    if (!this.socket) return;

    this.socket.on('disconnect', () => {
      this.handleReconnection();
    });
  }

  /**
   * Handles reconnection with exponential backoff
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ Maximum reconnection attempts reached');
      this.connectionStatus$.next('error');
      return;
    }

    const delay = this.RECONNECT_DELAYS[this.reconnectAttempts] || 30000;
    this.reconnectAttempts++;
    
    this.connectionStatus$.next('reconnecting');

    timer(delay).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    });
  }

  /**
   * Updates the list of connected users
   * @param users - Array of connected user display names
   */
  private updateConnectedUsers(users: string[]): void {
    this.connectedUsers$.next([...users]);
  }

  /**
   * Initializes heartbeat monitoring for connection health
   */
  private initializeHeartbeatMonitoring(): void {
    this.heartbeatTimer = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      
      if (timeSinceLastHeartbeat > this.HEARTBEAT_INTERVAL * 2) {
        if (this.socket?.connected) {
          this.connectionStatus$.next('error');
          this.handleReconnection();
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {
    
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.disconnect();
  }
}