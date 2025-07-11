import type { OnDestroy } from '@angular/core';
import { Injectable } from '@angular/core';
import type { Socket, ManagerOptions, SocketOptions } from 'socket.io-client';
import { io } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject, timer } from 'rxjs';
import type { UserService } from '../auth/user.service';
import { takeUntil, retry, switchMap } from 'rxjs/operators';

interface SocketConnection {
  socket: Socket;
  connectionSubject: BehaviorSubject<boolean>;
}
/**
 * Service for managing WebSocket connections.
 */
@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  /** A map of WebSocket connections, indexed by the full URL of the connection.
   * The value is an object containing the socket instance and a BehaviorSubject for the connection status.*/
  private readonly sockets: Map<string, SocketConnection> = new Map();
  private readonly destroyed$ = new Subject<void>();

  constructor(private readonly userService: UserService) {}

  /**
   * Initiates a WebSocket connection.
   * @param {string} url - The base URL for the WebSocket connection.
   * @param {string} namespace - The namespace for the WebSocket connection.
   * @param {ManagerOptions & SocketOptions} options - Additional options for the connection.
   */
  connect(
    url: string,
    namespace: string,
    options: Partial<ManagerOptions & SocketOptions> = {},
  ): void {
    const fullUrl = `${url}/${namespace}`;
    if (!this.sockets.has(fullUrl)) {
      const socket = io(fullUrl, {
        query: { token: this.userService.getAccessToken() },
        withCredentials: true, // Required for cross-origin requests
        transports: ['websocket'],
        ...options, // example usage of options: { autoConnect: false, reconnectionAttempts: 5, timeout: 10000, .. }
      });

      const connectionSubject = new BehaviorSubject<boolean>(false);

      socket.on('connect', () => {
        console.log(`WebSocket connected: ${fullUrl}`);
        connectionSubject.next(true);
      });

      socket.on('disconnect', () => {
        console.log(`WebSocket disconnected: ${fullUrl}`);
        connectionSubject.next(false);
      });

      socket.on('connect_error', (error: Error) => {
        console.error(`Connection error for ${fullUrl}:`, error);
        this.handleReconnection(fullUrl);
      });

      this.sockets.set(fullUrl, { socket, connectionSubject });
    }
  }

  /**
   * Disconnects the WebSocket.
   * @param {string} url - The base URL of the WebSocket connection.
   * @param {string} namespace - The namespace of the WebSocket connection.
   */
  disconnect(url: string, namespace: string): void {
    const fullUrl = `${url}/${namespace}`;
    const connection = this.sockets.get(fullUrl);
    if (connection) {
      connection.socket.disconnect();
      connection.connectionSubject.complete();
      this.sockets.delete(fullUrl);
    }
  }

  /**
   * Listens for a specific event on the WebSocket.
   * @param {string} url - The base URL of the WebSocket connection.
   * @param {string} namespace - The namespace of the WebSocket connection.
   * @param {string} eventName - The name of the event to listen for.
   * @returns {Observable<T>} An Observable that emits the data received for the event.
   */
  on<T>(url: string, namespace: string, eventName: string): Observable<T> {
    return new Observable<T>(observer => {
      const socket = this.getSocket(url, namespace);
      if (!socket) {
        observer.error(new Error(`No socket connection for ${url}/${namespace}`));
        return;
      }

      const handler = (data: T) => observer.next(data);
      socket.on(eventName, handler);

      return () => {
        socket.off(eventName, handler);
      };
    });
  }

  /**
   * Emits an event with data to the WebSocket server.
   * @param {string} url - The base URL of the WebSocket connection.
   * @param {string} namespace - The namespace of the WebSocket connection.
   * @param {string} eventName - The name of the event to emit.
   * @param {any} data - The data to send with the event.
   */
  emit(url: string, namespace: string, eventName: string, data: any): void {
    const socket = this.getSocket(url, namespace);
    if (socket) {
      socket.emit(eventName, data);
    } else {
      console.error(`No socket connection for ${url}/${namespace}`);
    }
  }

  /**
   * Returns an Observable for the connection status.
   * @param {string} url - The base URL of the WebSocket connection.
   * @param {string} namespace - The namespace of the WebSocket connection.
   * @returns {Observable<boolean>} An Observable that emits true when connected and false when disconnected.
   */
  onConnectionChange(url: string, namespace: string): Observable<boolean> {
    const connection = this.sockets.get(`${url}/${namespace}`);
    return connection ? connection.connectionSubject.asObservable() : new Observable<boolean>();
  }

  /**
   * Checks if a specific WebSocket connection is currently connected.
   * @param {string} url - The base URL of the WebSocket connection.
   * @param {string} namespace - The namespace of the WebSocket connection.
   * @returns {boolean} The connection status.
   */
  isConnected(url: string, namespace: string): boolean {
    const socket = this.getSocket(url, namespace);
    return socket?.connected || false;
  }

  /**
   * Handles reconnection attempts for a disconnected socket.
   * @param {string} fullUrl - The full URL of the socket to reconnect.
   */
  private handleReconnection(fullUrl: string): void {
    timer(0, 5000)
      .pipe(
        takeUntil(this.destroyed$),
        switchMap(() => {
          const connection = this.sockets.get(fullUrl);
          if (connection && !connection.socket.connected) {
            console.log(`Attempting to reconnect to ${fullUrl}...`);
            connection.socket.connect();
            return connection.connectionSubject;
          }
          return new Observable<boolean>();
        }),
        retry(),
        takeUntil(timer(60000)), // Stop trying after 1 minute
      )
      .subscribe();
  }

  /**
   * Retrieves a socket instance for the given URL and namespace.
   * @param {string} url - The base URL of the WebSocket connection.
   * @param {string} namespace - The namespace of the WebSocket connection.
   * @returns {Socket | undefined} The socket instance if it exists, undefined otherwise.
   */
  private getSocket(url: string, namespace: string): Socket | undefined {
    return this.sockets.get(`${url}/${namespace}`)?.socket;
  }

  /**
   * Unsubscribes from all Observables and disconnects all WebSocket connections.
   */
  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
    this.sockets.forEach(connection => {
      connection.socket.disconnect();
      connection.connectionSubject.complete();
    });
    this.sockets.clear();
  }
}
