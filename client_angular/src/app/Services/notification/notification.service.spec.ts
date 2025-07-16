import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from '../auth/user.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { WebSocketService } from '../websocket/websocket.service';
import { BehaviorSubject, of } from 'rxjs';
import { NotificationDTO } from '@DTOs/notification.dto';
import { NotificationType } from '@DTOs/notificationType.enum';
import { environment } from 'src/environments/environment';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let userServiceMock: jasmine.SpyObj<UserService>;
  let snackBarMock: jasmine.SpyObj<MatSnackBar>;
  let routerMock: jasmine.SpyObj<Router>;
  let webSocketServiceMock: jasmine.SpyObj<WebSocketService>;

  beforeEach(() => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getTokenID'], {
      isAuthenticated$: new BehaviorSubject<boolean>(true),
    });
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['openFromComponent']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const webSocketServiceSpy = jasmine.createSpyObj('WebSocketService', [
      'connect',
      'disconnect',
      'on',
      'onConnectionChange',
      'emit',
    ]);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        NotificationService,
        { provide: UserService, useValue: userServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: Router, useValue: routerSpy },
        { provide: WebSocketService, useValue: webSocketServiceSpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
    userServiceMock = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    snackBarMock = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    routerMock = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    webSocketServiceMock = TestBed.inject(WebSocketService) as jasmine.SpyObj<WebSocketService>;

    userServiceMock.getTokenID.and.returnValue('1');
    webSocketServiceMock.onConnectionChange.and.returnValue(of(true));
    webSocketServiceMock.on.and.returnValue(of({}));
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch initial notifications on creation', fakeAsync(() => {
    const mockNotifications: NotificationDTO[] = [
      {
        id: 1,
        message: 'Test notification',
        timestamp: new Date(),
        type: NotificationType.COMMENT,
        isRead: false,
      },
    ];

    service.getNotifications().subscribe(notifications => {
      expect(notifications).toEqual(mockNotifications);
    });

    const req = httpMock.expectOne(
      `${environment.server}/notifications/all?userId=1&limit=20&offset=0`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockNotifications);

    tick();
  }));

  it('should handle new notifications', fakeAsync(() => {
    const mockNotification: Partial<NotificationDTO> = {
      id: 1,
      message: 'New notification',
      timestamp: new Date(),
      type: NotificationType.COMMENT,
    };

    webSocketServiceMock.on.and.returnValue(of(mockNotification));

    service.initializeWebSocket();
    tick();

    service.getNotifications().subscribe(notifications => {
      expect(notifications[0]).toEqual(jasmine.objectContaining(mockNotification));
    });

    expect(snackBarMock.openFromComponent).toHaveBeenCalled();
  }));

  it('should mark notification as read', fakeAsync(() => {
    const mockNotification: NotificationDTO = {
      id: 1,
      message: 'Test notification',
      timestamp: new Date(),
      type: NotificationType.COMMENT,
      isRead: false,
    };

    service.markNotificationAsRead(mockNotification).subscribe(updatedNotification => {
      expect(updatedNotification.isRead).toBe(true);
    });

    const req = httpMock.expectOne(`${environment.server}/notifications/1/read`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockNotification, isRead: true });

    tick();
  }));

  it('should handle notification click for unread notification', fakeAsync(() => {
    const mockNotification: NotificationDTO = {
      id: 1,
      message: 'Test notification',
      timestamp: new Date(),
      type: NotificationType.COMMENT,
      isRead: false,
      discussionId: 123,
    };

    service.handleNotificationClick(mockNotification, 'view').subscribe();

    const req = httpMock.expectOne(`${environment.server}/notifications/1/read`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockNotification, isRead: true });

    tick();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/discussion-view/123']);
  }));

  it('should update unread count', fakeAsync(() => {
    service.getUnreadCountFromServer().subscribe(count => {
      expect(count).toBe(5);
    });

    const req = httpMock.expectOne(`${environment.server}/notifications/1/unread-count`);
    expect(req.request.method).toBe('GET');
    req.flush(5);

    tick();

    service.getUnreadCount().subscribe(count => {
      expect(count).toBe(5);
    });
  }));
});
