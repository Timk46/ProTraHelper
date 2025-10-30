import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { LocalStorageService } from '../../../Services/storage/local-storage.service';

/**
 * Global state management service for the evaluation discussion forum
 * 
 * @description This service provides centralized state management for the entire
 * evaluation discussion forum module. It coordinates between components and
 * maintains application-wide state for navigation, user context, and system status.
 * 
 * Key Features:
 * - Navigation state management
 * - User context and permissions
 * - System status and health
 * - Cross-component communication
 * - State persistence and restoration
 * 
 * @example
 * ```typescript
 * constructor(private globalState: EvaluationGlobalStateService) {
 *   this.globalState.navigationState$.subscribe(state => {
 *     // Handle navigation state changes
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class EvaluationGlobalStateService {

  // =============================================================================
  // NAVIGATION STATE
  // =============================================================================
  
  private navigationStateSubject = new BehaviorSubject<NavigationState>({
    currentRoute: '/forum',
    previousRoute: null,
    breadcrumbs: [],
    canGoBack: false,
    isNavigating: false
  });

  private sidebarStateSubject = new BehaviorSubject<SidebarState>({
    isOpen: true,
    isPinned: false,
    activeSection: 'discussions',
    collapsedSections: new Set()
  });

  // =============================================================================
  // USER CONTEXT STATE
  // =============================================================================
  
  private userContextSubject = new BehaviorSubject<UserContext>({
    permissions: {
      canComment: true,
      canVote: true,
      canModerate: false,
      canSwitchPhase: false,
      canExport: false
    },
    preferences: {
      theme: 'light',
      language: 'de',
      notificationsEnabled: true,
      autoRefresh: true,
      defaultSortOrder: 'newest'
    },
    sessionInfo: {
      loginTime: new Date(),
      lastActivity: new Date(),
      sessionTimeoutMinutes: 120
    }
  });

  // =============================================================================
  // SYSTEM STATUS STATE
  // =============================================================================
  
  private systemStatusSubject = new BehaviorSubject<SystemStatus>({
    isOnline: navigator.onLine,
    lastSyncTime: new Date(),
    connectionQuality: 'excellent',
    pendingActions: 0,
    errorCount: 0,
    performanceMetrics: {
      averageResponseTime: 0,
      totalRequests: 0,
      failedRequests: 0
    }
  });

  // =============================================================================
  // UI STATE
  // =============================================================================
  
  private uiStateSubject = new BehaviorSubject<UIState>({
    isLoading: false,
    loadingMessage: '',
    notifications: [],
    modals: [],
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth < 768
    }
  });

  // =============================================================================
  // FEATURE FLAGS
  // =============================================================================
  
  private featureFlagsSubject = new BehaviorSubject<FeatureFlags>({
    realTimeUpdates: true,
    advancedSearch: true,
    exportFunctionality: true,
    aiAssistance: false,
    betaFeatures: false,
    developmentMode: false
  });

  constructor(private storage: LocalStorageService) {
    this.initializeListeners();
    this.initializeStateRestoration();
  }

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  /**
   * Observable for navigation state changes
   */
  get navigationState$(): Observable<NavigationState> {
    return this.navigationStateSubject.asObservable();
  }

  /**
   * Observable for sidebar state changes
   */
  get sidebarState$(): Observable<SidebarState> {
    return this.sidebarStateSubject.asObservable();
  }

  /**
   * Observable for user context changes
   */
  get userContext$(): Observable<UserContext> {
    return this.userContextSubject.asObservable();
  }

  /**
   * Observable for system status changes
   */
  get systemStatus$(): Observable<SystemStatus> {
    return this.systemStatusSubject.asObservable();
  }

  /**
   * Observable for UI state changes
   */
  get uiState$(): Observable<UIState> {
    return this.uiStateSubject.asObservable();
  }

  /**
   * Observable for feature flags
   */
  get featureFlags$(): Observable<FeatureFlags> {
    return this.featureFlagsSubject.asObservable();
  }

  /**
   * Combined application state observable
   */
  get applicationState$(): Observable<ApplicationState> {
    return combineLatest([
      this.navigationState$,
      this.sidebarState$,
      this.userContext$,
      this.systemStatus$,
      this.uiState$,
      this.featureFlags$
    ]).pipe(
      map(([navigation, sidebar, userContext, systemStatus, ui, featureFlags]) => ({
        navigation,
        sidebar,
        userContext,
        systemStatus,
        ui,
        featureFlags,
        lastUpdated: new Date()
      })),
      shareReplay(1)
    );
  }

  // =============================================================================
  // NAVIGATION MANAGEMENT
  // =============================================================================

  /**
   * Updates the current navigation state
   * 
   * @param route - The current route path
   * @param title - Optional page title
   */
  updateNavigationState(route: string, title?: string): void {
    const currentState = this.navigationStateSubject.value;
    
    this.navigationStateSubject.next({
      ...currentState,
      previousRoute: currentState.currentRoute,
      currentRoute: route,
      canGoBack: currentState.currentRoute !== null,
      breadcrumbs: this.generateBreadcrumbs(route, title)
    });
  }

  /**
   * Sets navigation loading state
   * 
   * @param isNavigating - Whether navigation is in progress
   */
  setNavigationLoading(isNavigating: boolean): void {
    const currentState = this.navigationStateSubject.value;
    this.navigationStateSubject.next({
      ...currentState,
      isNavigating
    });
  }

  /**
   * Generates breadcrumbs for the current route
   * 
   * @param route - The current route
   * @param title - Optional page title
   * @returns Breadcrumb array
   */
  private generateBreadcrumbs(route: string, title?: string): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [
      { label: 'Dashboard', path: '/dashboard' }
    ];

    if (route.startsWith('/forum')) {
      breadcrumbs.push({ label: 'Evaluation Forum', path: '/forum' });
      
      if (route.includes('/') && route !== '/forum') {
        const submissionId = route.split('/').pop();
        if (submissionId && title) {
          breadcrumbs.push({ 
            label: title, 
            path: route,
            isActive: true 
          });
        }
      }
    }

    return breadcrumbs;
  }

  // =============================================================================
  // SIDEBAR MANAGEMENT
  // =============================================================================

  /**
   * Toggles the sidebar open/closed state
   */
  toggleSidebar(): void {
    const currentState = this.sidebarStateSubject.value;
    this.sidebarStateSubject.next({
      ...currentState,
      isOpen: !currentState.isOpen
    });
  }

  /**
   * Sets the sidebar pin state
   * 
   * @param isPinned - Whether sidebar should be pinned
   */
  setSidebarPinned(isPinned: boolean): void {
    const currentState = this.sidebarStateSubject.value;
    this.sidebarStateSubject.next({
      ...currentState,
      isPinned
    });
  }

  /**
   * Sets the active sidebar section
   * 
   * @param section - The active section identifier
   */
  setActiveSidebarSection(section: string): void {
    const currentState = this.sidebarStateSubject.value;
    this.sidebarStateSubject.next({
      ...currentState,
      activeSection: section
    });
  }

  // =============================================================================
  // USER CONTEXT MANAGEMENT
  // =============================================================================

  /**
   * Updates user permissions
   * 
   * @param permissions - New permission set
   */
  updateUserPermissions(permissions: Partial<UserPermissions>): void {
    const currentContext = this.userContextSubject.value;
    this.userContextSubject.next({
      ...currentContext,
      permissions: {
        ...currentContext.permissions,
        ...permissions
      }
    });
  }

  /**
   * Updates user preferences
   * 
   * @param preferences - New preference set
   */
  updateUserPreferences(preferences: Partial<UserPreferences>): void {
    const currentContext = this.userContextSubject.value;
    this.userContextSubject.next({
      ...currentContext,
      preferences: {
        ...currentContext.preferences,
        ...preferences
      }
    });
    
    // Persist preferences to localStorage
    this.persistUserPreferences(currentContext.preferences);
  }

  /**
   * Updates last activity timestamp
   */
  updateLastActivity(): void {
    const currentContext = this.userContextSubject.value;
    this.userContextSubject.next({
      ...currentContext,
      sessionInfo: {
        ...currentContext.sessionInfo,
        lastActivity: new Date()
      }
    });
  }

  // =============================================================================
  // SYSTEM STATUS MANAGEMENT
  // =============================================================================

  /**
   * Updates connection status
   * 
   * @param isOnline - Whether the system is online
   */
  updateConnectionStatus(isOnline: boolean): void {
    const currentStatus = this.systemStatusSubject.value;
    this.systemStatusSubject.next({
      ...currentStatus,
      isOnline,
      connectionQuality: isOnline ? 'excellent' : 'offline',
      lastSyncTime: isOnline ? new Date() : currentStatus.lastSyncTime
    });
  }

  /**
   * Increments pending actions counter
   */
  incrementPendingActions(): void {
    const currentStatus = this.systemStatusSubject.value;
    this.systemStatusSubject.next({
      ...currentStatus,
      pendingActions: currentStatus.pendingActions + 1
    });
  }

  /**
   * Decrements pending actions counter
   */
  decrementPendingActions(): void {
    const currentStatus = this.systemStatusSubject.value;
    this.systemStatusSubject.next({
      ...currentStatus,
      pendingActions: Math.max(0, currentStatus.pendingActions - 1)
    });
  }

  /**
   * Updates performance metrics
   * 
   * @param responseTime - Response time in milliseconds
   * @param success - Whether the request was successful
   */
  updatePerformanceMetrics(responseTime: number, success: boolean): void {
    const currentStatus = this.systemStatusSubject.value;
    const metrics = currentStatus.performanceMetrics;
    
    const newTotalRequests = metrics.totalRequests + 1;
    const newFailedRequests = success ? metrics.failedRequests : metrics.failedRequests + 1;
    const newAverageResponseTime = ((metrics.averageResponseTime * metrics.totalRequests) + responseTime) / newTotalRequests;
    
    this.systemStatusSubject.next({
      ...currentStatus,
      performanceMetrics: {
        averageResponseTime: newAverageResponseTime,
        totalRequests: newTotalRequests,
        failedRequests: newFailedRequests
      }
    });
  }

  // =============================================================================
  // UI STATE MANAGEMENT
  // =============================================================================

  /**
   * Sets the global loading state
   * 
   * @param isLoading - Whether the application is loading
   * @param message - Optional loading message
   */
  setGlobalLoading(isLoading: boolean, message?: string): void {
    const currentState = this.uiStateSubject.value;
    this.uiStateSubject.next({
      ...currentState,
      isLoading,
      loadingMessage: message || ''
    });
  }

  /**
   * Adds a notification to the UI state
   * 
   * @param notification - The notification to add
   */
  addNotification(notification: UINotification): void {
    const currentState = this.uiStateSubject.value;
    this.uiStateSubject.next({
      ...currentState,
      notifications: [...currentState.notifications, {
        ...notification,
        id: notification.id || this.generateNotificationId(),
        timestamp: notification.timestamp || new Date()
      }]
    });
  }

  /**
   * Removes a notification from the UI state
   * 
   * @param notificationId - The ID of the notification to remove
   */
  removeNotification(notificationId: string): void {
    const currentState = this.uiStateSubject.value;
    this.uiStateSubject.next({
      ...currentState,
      notifications: currentState.notifications.filter(n => n.id !== notificationId)
    });
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Initializes event listeners for system events
   */
  private initializeListeners(): void {
    // Online/offline status
    window.addEventListener('online', () => {
      this.updateConnectionStatus(true);
      this.addNotification({
        type: 'success',
        title: 'Verbindung wiederhergestellt',
        message: 'Die Internetverbindung ist wieder verfügbar.'
      });
    });

    window.addEventListener('offline', () => {
      this.updateConnectionStatus(false);
      this.addNotification({
        type: 'warning',
        title: 'Verbindung unterbrochen',
        message: 'Sie arbeiten jetzt im Offline-Modus.'
      });
    });

    // Viewport changes
    window.addEventListener('resize', () => {
      const currentState = this.uiStateSubject.value;
      this.uiStateSubject.next({
        ...currentState,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          isMobile: window.innerWidth < 768
        }
      });
    });

    // User activity tracking
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, () => {
        this.updateLastActivity();
      }, true);
    });
  }

  /**
   * Initializes state restoration from localStorage
   */
  private initializeStateRestoration(): void {
    // Restore user preferences
    const savedPreferences = this.storage.getObject<UserPreferences>('evaluation-user-preferences');
    if (savedPreferences) {
      this.updateUserPreferences(savedPreferences);
    }

    // Restore sidebar state
    const savedSidebarState = this.storage.getObject<Partial<SidebarState>>('evaluation-sidebar-state');
    if (savedSidebarState) {
      this.sidebarStateSubject.next({
        ...this.sidebarStateSubject.value,
        ...savedSidebarState
      });
    }
  }

  /**
   * Persists user preferences to localStorage
   *
   * @param preferences - Preferences to persist
   */
  private persistUserPreferences(preferences: UserPreferences): void {
    this.storage.set('evaluation-user-preferences', preferences);
  }

  /**
   * Generates a unique notification ID
   * 
   * @returns Unique notification ID
   */
  private generateNotificationId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================

  /**
   * Cleans up the global state service
   */
  destroy(): void {
    // Complete all subjects
    this.navigationStateSubject.complete();
    this.sidebarStateSubject.complete();
    this.userContextSubject.complete();
    this.systemStatusSubject.complete();
    this.uiStateSubject.complete();
    this.featureFlagsSubject.complete();
  }
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface NavigationState {
  currentRoute: string;
  previousRoute: string | null;
  breadcrumbs: Breadcrumb[];
  canGoBack: boolean;
  isNavigating: boolean;
}

export interface Breadcrumb {
  label: string;
  path: string;
  isActive?: boolean;
}

export interface SidebarState {
  isOpen: boolean;
  isPinned: boolean;
  activeSection: string;
  collapsedSections: Set<string>;
}

export interface UserContext {
  permissions: UserPermissions;
  preferences: UserPreferences;
  sessionInfo: SessionInfo;
}

export interface UserPermissions {
  canComment: boolean;
  canVote: boolean;
  canModerate: boolean;
  canSwitchPhase: boolean;
  canExport: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'de' | 'en';
  notificationsEnabled: boolean;
  autoRefresh: boolean;
  defaultSortOrder: 'newest' | 'oldest' | 'mostVoted';
}

export interface SessionInfo {
  loginTime: Date;
  lastActivity: Date;
  sessionTimeoutMinutes: number;
}

export interface SystemStatus {
  isOnline: boolean;
  lastSyncTime: Date;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  pendingActions: number;
  errorCount: number;
  performanceMetrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  totalRequests: number;
  failedRequests: number;
}

export interface UIState {
  isLoading: boolean;
  loadingMessage: string;
  notifications: UINotification[];
  modals: UIModal[];
  viewport: ViewportInfo;
}

export interface UINotification {
  id?: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp?: Date;
  autoClose?: boolean;
  duration?: number;
}

export interface UIModal {
  id: string;
  type: string;
  data: any;
  isClosable: boolean;
}

export interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
}

export interface FeatureFlags {
  realTimeUpdates: boolean;
  advancedSearch: boolean;
  exportFunctionality: boolean;
  aiAssistance: boolean;
  betaFeatures: boolean;
  developmentMode: boolean;
}

export interface ApplicationState {
  navigation: NavigationState;
  sidebar: SidebarState;
  userContext: UserContext;
  systemStatus: SystemStatus;
  ui: UIState;
  featureFlags: FeatureFlags;
  lastUpdated: Date;
}