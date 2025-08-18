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
      const urlObj = new URL(url);
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
        element.property = name;
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
    ).subscribe((event: NavigationEnd) => {
      this.updateNavigationContext(event.url);
      this.globalState.updateNavigationState(event.url);
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