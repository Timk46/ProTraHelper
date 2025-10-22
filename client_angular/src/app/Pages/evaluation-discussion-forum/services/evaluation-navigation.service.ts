import { Injectable } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map, distinctUntilChanged } from 'rxjs/operators';

import { EvaluationGlobalStateService } from './evaluation-global-state.service';

/**
 * Navigation service for the evaluation discussion forum
 * 
 * @description This service manages navigation, deep linking, and URL state
 * for the evaluation discussion forum. It provides:
 * - Deep linking to specific submissions and comments
 * - URL state management and persistence
 * - Navigation history and breadcrumbs
 * - Query parameter handling
 * - Browser back/forward support
 * 
 * @example
 * ```typescript
 * constructor(private navigationService: EvaluationNavigationService) {
 *   // Navigate to specific submission
 *   this.navigationService.navigateToSubmission('submission-123');
 *   
 *   // Navigate to specific comment
 *   this.navigationService.navigateToComment('comment-456', 'submission-123');
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class EvaluationNavigationService {
  // Static flag to prevent console spam from navigation warnings
  private static hasLoggedNavigationWarning = false;

  private navigationStateSubject = new BehaviorSubject<NavigationContext>({
    submissionId: null,
    categoryId: null,
    commentId: null,
    mode: 'list',
    queryParams: {},
    fragment: null
  });

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private location: Location,
    private globalState: EvaluationGlobalStateService
  ) {
    this.initializeRouterListener();
    this.initializeCurrentNavigation();
  }

  // =============================================================================
  // PUBLIC OBSERVABLES
  // =============================================================================

  /**
   * Observable for navigation context changes
   */
  get navigationContext$(): Observable<NavigationContext> {
    return this.navigationStateSubject.asObservable();
  }

  /**
   * Observable for submission ID changes
   */
  get submissionId$(): Observable<string | null> {
    return this.navigationContext$.pipe(
      map(context => context.submissionId),
      distinctUntilChanged()
    );
  }

  /**
   * Observable for category ID changes
   */
  get categoryId$(): Observable<number | null> {
    return this.navigationContext$.pipe(
      map(context => context.categoryId),
      distinctUntilChanged()
    );
  }

  /**
   * Observable for comment ID changes
   */
  get commentId$(): Observable<string | null> {
    return this.navigationContext$.pipe(
      map(context => context.commentId),
      distinctUntilChanged()
    );
  }

  // =============================================================================
  // NAVIGATION METHODS
  // =============================================================================

  /**
   * Navigates to the evaluation forum home
   * 
   * @param queryParams - Optional query parameters
   */
  navigateToForum(queryParams?: Record<string, any>): Promise<boolean> {
    console.log('🧭 Navigating to forum home:', queryParams);
    
    this.globalState.setNavigationLoading(true);
    
    return this.router.navigate(['/forum'], {
      queryParams,
      replaceUrl: false
    }).finally(() => {
      this.globalState.setNavigationLoading(false);
    });
  }

  /**
   * Navigates to a specific submission
   * 
   * @param submissionId - The submission ID to navigate to
   * @param categoryId - Optional category to highlight
   * @param queryParams - Optional query parameters
   */
  navigateToSubmission(
    submissionId: string, 
    categoryId?: number, 
    queryParams?: Record<string, any>
  ): Promise<boolean> {
    console.log('🧭 Navigating to submission:', { submissionId, categoryId, queryParams });
    
    this.globalState.setNavigationLoading(true);
    
    const params: Record<string, any> = { ...queryParams };
    if (categoryId) {
      params['category'] = categoryId.toString();
    }
    
    return this.router.navigate(['/forum', submissionId], {
      queryParams: Object.keys(params).length > 0 ? params : undefined,
      replaceUrl: false
    }).finally(() => {
      this.globalState.setNavigationLoading(false);
    });
  }

  /**
   * Navigates to a specific comment within a submission
   * 
   * @param commentId - The comment ID to navigate to
   * @param submissionId - The submission containing the comment
   * @param categoryId - Optional category containing the comment
   */
  navigateToComment(
    commentId: string, 
    submissionId: string, 
    categoryId?: number
  ): Promise<boolean> {
    console.log('🧭 Navigating to comment:', { commentId, submissionId, categoryId });
    
    this.globalState.setNavigationLoading(true);
    
    const queryParams: Record<string, any> = { highlight: commentId };
    if (categoryId) {
      queryParams['category'] = categoryId.toString();
    }
    
    return this.router.navigate(['/forum', submissionId], {
      queryParams,
      fragment: `comment-${commentId}`,
      replaceUrl: false
    }).finally(() => {
      this.globalState.setNavigationLoading(false);
    });
  }

  /**
   * Updates the current URL with new query parameters without navigation
   * 
   * @param queryParams - Query parameters to update
   * @param replaceUrl - Whether to replace the current URL
   */
  updateQueryParams(queryParams: Record<string, any>, replaceUrl: boolean = true): void {
    console.log('🔗 Updating query params:', queryParams);
    
    const currentParams = this.getCurrentQueryParams();
    const newParams = { ...currentParams, ...queryParams };
    
    // Remove null/undefined values
    Object.keys(newParams).forEach(key => {
      if (newParams[key] === null || newParams[key] === undefined) {
        delete newParams[key];
      }
    });
    
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: newParams,
      replaceUrl,
      queryParamsHandling: 'replace'
    });
  }

  /**
   * Clears specific query parameters
   * 
   * @param paramNames - Names of parameters to clear
   */
  clearQueryParams(paramNames: string[]): void {
    console.log('🧹 Clearing query params:', paramNames);
    
    const currentParams = this.getCurrentQueryParams();
    paramNames.forEach(param => {
      delete currentParams[param];
    });
    
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: currentParams,
      replaceUrl: true
    });
  }

  /**
   * Navigates back to the previous page
   */
  goBack(): void {
    console.log('⬅️ Navigating back');
    this.location.back();
  }

  /**
   * Navigates forward to the next page
   */
  goForward(): void {
    console.log('➡️ Navigating forward');
    this.location.forward();
  }

  // =============================================================================
  // URL STATE MANAGEMENT
  // =============================================================================

  /**
   * Gets the current navigation context
   * 
   * @returns Current navigation context
   */
  getCurrentContext(): NavigationContext {
    return this.navigationStateSubject.value;
  }

  /**
   * Gets current query parameters
   * 
   * @returns Current query parameters
   */
  getCurrentQueryParams(): Record<string, any> {
    return this.activatedRoute.snapshot.queryParams;
  }

  /**
   * Gets the current URL fragment
   * 
   * @returns Current URL fragment
   */
  getCurrentFragment(): string | null {
    return this.activatedRoute.snapshot.fragment;
  }

  /**
   * Generates a shareable URL for the current state
   * 
   * @param includeHighlight - Whether to include comment highlighting
   * @returns Shareable URL
   */
  generateShareableUrl(includeHighlight: boolean = true): string {
    const context = this.getCurrentContext();
    const baseUrl = window.location.origin;
    
    if (!context.submissionId) {
      return `${baseUrl}/forum`;
    }
    
    let url = `${baseUrl}/forum/${context.submissionId}`;
    const params: string[] = [];
    
    if (context.categoryId) {
      params.push(`category=${context.categoryId}`);
    }
    
    if (includeHighlight && context.commentId) {
      params.push(`highlight=${context.commentId}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    if (includeHighlight && context.fragment) {
      url += `#${context.fragment}`;
    }
    
    return url;
  }

  /**
   * Parses a URL and extracts navigation context
   * 
   * @param url - URL to parse
   * @returns Navigation context
   */
  parseUrl(url: string): NavigationContext {
    try {
      const urlObj = new URL(url, window.location.origin);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      
      // Extract submission ID from path
      const submissionId = pathSegments.length > 1 ? pathSegments[1] : null;
      
      // Extract query parameters
      const queryParams: Record<string, any> = {};
      urlObj.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
      
      // Extract specific parameters
      const categoryId = queryParams['category'] ? parseInt(queryParams['category'], 10) : null;
      const commentId = queryParams['highlight'] || null;
      const fragment = urlObj.hash ? urlObj.hash.substring(1) : null;
      
      return {
        submissionId,
        categoryId,
        commentId,
        mode: submissionId ? 'submission' : 'list',
        queryParams,
        fragment
      };
    } catch (error) {
      console.error('❌ Error parsing URL:', error);
      return {
        submissionId: null,
        categoryId: null,
        commentId: null,
        mode: 'list',
        queryParams: {},
        fragment: null
      };
    }
  }

  // =============================================================================
  // DEEP LINKING SUPPORT
  // =============================================================================

  /**
   * Creates a deep link to a specific comment
   * 
   * @param commentId - Comment ID
   * @param submissionId - Submission ID
   * @param categoryId - Category ID
   * @returns Deep link URL
   */
  createCommentDeepLink(commentId: string, submissionId: string, categoryId?: number): string {
    const baseUrl = window.location.origin;
    let url = `${baseUrl}/forum/${submissionId}`;
    
    const params: string[] = [`highlight=${commentId}`];
    if (categoryId) {
      params.push(`category=${categoryId}`);
    }
    
    url += `?${params.join('&')}#comment-${commentId}`;
    return url;
  }

  /**
   * Creates a deep link to a specific category
   * 
   * @param categoryId - Category ID
   * @param submissionId - Submission ID
   * @returns Deep link URL
   */
  createCategoryDeepLink(categoryId: number, submissionId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/forum/${submissionId}?category=${categoryId}`;
  }

  /**
   * Handles deep link navigation from external sources
   * 
   * @param url - Deep link URL to handle
   */
  handleDeepLink(url: string): Promise<boolean> {
    console.log('🔗 Handling deep link:', url);
    
    const context = this.parseUrl(url);
    
    if (context.submissionId) {
      return this.navigateToSubmission(
        context.submissionId,
        context.categoryId || undefined,
        context.queryParams
      );
    } else {
      return this.navigateToForum(context.queryParams);
    }
  }

  /**
   * Navigates to an adjacent submission (previous or next)
   *
   * @description Main navigation method that switches between submissions while preserving
   * the current category selection and updating the URL route
   * @param direction - Navigation direction ('previous' or 'next')
   * @param currentCategory - Current category to preserve (optional)
   * @returns Promise<boolean> Navigation result (true if successful)
   * @memberof EvaluationNavigationService
   */
  navigateToAdjacentSubmission(
    direction: 'previous' | 'next',
    currentCategory?: number
  ): Promise<boolean> {
    const currentContext = this.getCurrentContext();
    const currentSubmissionId = currentContext.submissionId;
    
    if (!currentSubmissionId) {
      console.warn('⚠️ Cannot navigate: No current submission ID');
      return Promise.resolve(false);
    }

    // This would typically get adjacent submission ID from a service
    // For now, we'll handle the navigation logic here based on demo submissions
    const adjacentSubmissionId = this.getAdjacentSubmissionId(currentSubmissionId, direction);
    
    if (!adjacentSubmissionId) {
      console.log(`🚫 Cannot navigate ${direction}: No ${direction} submission available`);
      return Promise.resolve(false);
    }

    console.log(`🧭 Navigating ${direction} from ${currentSubmissionId} to ${adjacentSubmissionId}`);
    
    // Preserve current category in query params
    const queryParams: Record<string, any> = {};
    const categoryToPreserve = currentCategory || currentContext.categoryId;
    if (categoryToPreserve) {
      queryParams['category'] = categoryToPreserve.toString();
    }

    return this.navigateToSubmission(adjacentSubmissionId, categoryToPreserve || undefined, queryParams);
  }

  /**
   * Gets submission navigation information for the current context
   *
   * @description Calculates and returns all navigation-related information including
   * current position, total count, and whether previous/next navigation is possible
   * @returns Navigation info with available directions and position data
   * @memberof EvaluationNavigationService
   */
  getSubmissionNavigationInfo(): SubmissionNavigationInfo {
    const currentContext = this.getCurrentContext();
    const currentSubmissionId = currentContext.submissionId;
    
    if (!currentSubmissionId) {
      return {
        currentSubmissionId: null,
        canNavigatePrevious: false,
        canNavigateNext: false,
        currentPosition: 0,
        totalSubmissions: 0
      };
    }

    // Get adjacent submissions (this would typically use a service)
    const previousId = this.getAdjacentSubmissionId(currentSubmissionId, 'previous');
    const nextId = this.getAdjacentSubmissionId(currentSubmissionId, 'next');
    
    // Position and total require backend submission list
    const position = this.getSubmissionPosition(currentSubmissionId);
    const total = this.getTotalSubmissions();

    return {
      currentSubmissionId,
      canNavigatePrevious: !!previousId,
      canNavigateNext: !!nextId,
      currentPosition: position,
      totalSubmissions: total,
      previousSubmissionId: previousId,
      nextSubmissionId: nextId
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS FOR SUBMISSION NAVIGATION
  // =============================================================================

  /**
   * Gets the adjacent submission ID for navigation
   *
   * @description TODO: Integrate with backend submission list service.
   * Required implementation:
   * 1. Inject EvaluationSubmissionService
   * 2. Call submissionService.getSubmissionList() to get ordered submission IDs
   * 3. Find currentId in list using Array.indexOf()
   * 4. Return submissions[index + offset] where offset = direction === 'next' ? 1 : -1
   * 5. Validate bounds and return null if out of range
   *
   * @example
   * ```typescript
   * const submissions = await this.submissionService.getSubmissionList();
   * const currentIndex = submissions.findIndex(s => s.id === currentId);
   * if (currentIndex === -1) return null;
   *
   * const offset = direction === 'next' ? 1 : -1;
   * const adjacentIndex = currentIndex + offset;
   *
   * return (adjacentIndex >= 0 && adjacentIndex < submissions.length)
   *   ? submissions[adjacentIndex].id
   *   : null;
   * ```
   *
   * @param currentId - Current submission ID
   * @param direction - Navigation direction ('previous' or 'next')
   * @returns Adjacent submission ID or null if unavailable or not implemented
   * @memberof EvaluationNavigationService
   * @todo Backend API integration required - Track in GitHub issue
   */
  private getAdjacentSubmissionId(currentId: string, direction: 'previous' | 'next'): string | null {
    if (!EvaluationNavigationService.hasLoggedNavigationWarning) {
      console.warn(
        '⚠️ [NOT IMPLEMENTED] Submission navigation requires backend API integration.',
        'See JSDoc for implementation guide.'
      );
      EvaluationNavigationService.hasLoggedNavigationWarning = true;
    }
    return null;
  }

  /**
   * Gets the position of a submission in the list (1-based)
   *
   * @description TODO: Integrate with backend submission list service.
   *
   * @example
   * ```typescript
   * const submissions = await this.submissionService.getSubmissionList();
   * const index = submissions.findIndex(s => s.id === submissionId);
   * return index !== -1 ? index + 1 : 0; // 1-based position
   * ```
   *
   * @param submissionId - Submission ID
   * @returns Position (1-based) or 0 if not found or not implemented
   * @memberof EvaluationNavigationService
   * @todo Backend API integration required - Track in GitHub issue
   */
  private getSubmissionPosition(submissionId: string): number {
    return 0;
  }

  /**
   * Gets the total number of submissions
   *
   * @description TODO: Integrate with backend submission list service.
   *
   * @example
   * ```typescript
   * const submissions = await this.submissionService.getSubmissionList();
   * return submissions.length;
   * ```
   *
   * @returns Total number of submissions, or 0 if not implemented
   * @memberof EvaluationNavigationService
   * @todo Backend API integration required - Track in GitHub issue
   */
  private getTotalSubmissions(): number {
    return 0;
  }

  // =============================================================================
  // BROWSER INTEGRATION
  // =============================================================================

  /**
   * Sets the browser page title
   * 
   * @param title - Page title
   */
  setPageTitle(title: string): void {
    document.title = `${title} - HEFL Evaluation Forum`;
  }

  /**
   * Updates browser meta tags for SEO and sharing
   * 
   * @param meta - Meta tag information
   */
  updateMetaTags(meta: PageMetadata): void {
    // Update page title
    if (meta.title) {
      this.setPageTitle(meta.title);
    }
    
    // Update meta description
    if (meta.description) {
      this.updateMetaTag('description', meta.description);
    }
    
    // Update Open Graph tags
    if (meta.ogTitle) {
      this.updateMetaTag('og:title', meta.ogTitle);
    }
    if (meta.ogDescription) {
      this.updateMetaTag('og:description', meta.ogDescription);
    }
    if (meta.ogUrl) {
      this.updateMetaTag('og:url', meta.ogUrl);
    }
  }

  /**
   * Updates a specific meta tag
   * 
   * @param name - Meta tag name or property
   * @param content - Meta tag content
   */
  private updateMetaTag(name: string, content: string): void {
    let selector = `meta[name="${name}"]`;
    if (name.startsWith('og:')) {
      selector = `meta[property="${name}"]`;
    }
    
    let element = document.querySelector(selector) as HTMLMetaElement;
    if (element) {
      element.content = content;
    } else {
      element = document.createElement('meta');
      if (name.startsWith('og:')) {
        (element as any).property = name;
      } else {
        element.name = name;
      }
      element.content = content;
      document.head.appendChild(element);
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Initializes router event listener
   */
  private initializeRouterListener(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const navigationEvent = event as NavigationEnd;
      this.updateNavigationContext(navigationEvent.url);
      this.globalState.updateNavigationState(navigationEvent.url);
    });
  }

  /**
   * Initializes navigation context from current route
   */
  private initializeCurrentNavigation(): void {
    const currentUrl = this.router.url;
    this.updateNavigationContext(currentUrl);
  }

  /**
   * Updates navigation context from URL
   * 
   * @param url - Current URL
   */
  private updateNavigationContext(url: string): void {
    const context = this.parseUrl(url);
    this.navigationStateSubject.next(context);
    
    console.log('🧭 Navigation context updated:', context);
  }
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface NavigationContext {
  submissionId: string | null;
  categoryId: number | null;
  commentId: string | null;
  mode: 'list' | 'submission';
  queryParams: Record<string, any>;
  fragment: string | null;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string;
}

export interface SubmissionNavigationInfo {
  currentSubmissionId: string | null;
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
  currentPosition: number;
  totalSubmissions: number;
  previousSubmissionId?: string | null;
  nextSubmissionId?: string | null;
}