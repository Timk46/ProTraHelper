import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment'; // still need to use that properly
import { UserService } from '../auth/user.service';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket!: Socket;
  private connectionSubject = new Subject<boolean>();

  /**
   *
   * @param {UserService} userService The user service to get the access token from
   */
  constructor(private userService: UserService) {}

  /**
   * Initiates a WebSocket connection.
   */
  connect(): void {
    this.socket = io('http://localhost:3001/notifications', {
      query: { token: this.userService.getAccessToken() },
      withCredentials: true,
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.connectionSubject.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.connectionSubject.next(false);
    });
  }

  /**
   * Disconnects the WebSocket.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Listens for a specific event on the WebSocket.
   * @param {string} eventName The name of the event to listen for.
   * @returns {Observable<T>} An Observable that emits the data received for the event.
   */
  on<T>(eventName: string): Observable<T> {
    return new Observable<T>((observer) => {
      this.socket.on(eventName, (data: T) => {
        observer.next(data);
      });
    });
  }

  /**
   * Emits an event with data to the WebSocket server.
   * @param {string} eventName The name of the event to emit.
   * @param {any} data The data to send with the event.
   */
  emit(eventName: string, data: any): void {
    this.socket.emit(eventName, data);
  }

  /**
   * Returns an Observable for the connection status.
   * @returns {Observable<boolean>} An Observable that emits true when connected and false when disconnected.
   */
  onConnectionChange(): Observable<boolean> {
    return this.connectionSubject.asObservable();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

}
