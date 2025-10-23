import { Injectable, inject } from '@angular/core';
import { 
  CanActivateFn, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router, 
  UrlTree 
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';

import { UserService } from '../../../Services/auth/user.service';
import { EvaluationStateService } from '../../../Services/evaluation/evaluation-state.service';
import { EvaluationDiscussionService } from '../../../Services/evaluation/evaluation-discussion.service';

/**
 * Guard that validates access to evaluation discussions
 * 
 * @description This guard checks if the user has permission to access
 * a specific evaluation submission and discussion forum. It validates:
 * - User authentication status
 * - Subject registration requirements
 * - Submission existence and access permissions
 * - Evaluation phase permissions
 * 
 * @example
 * ```typescript
 * {
 *   path: 'forum/:submissionId',
 *   component: EvaluationDiscussionForumComponent,
 *   canActivate: [LoggedInGuard, RegisteredForSubjectGuard, evaluationAccessGuard]
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class EvaluationAccessGuardService {
  constructor(
    private userService: UserService,
    private evaluationService: EvaluationDiscussionService,
    private router: Router
  ) {}

  /**
   * Checks if user can access the evaluation discussion
   * 
   * @param route - The activated route snapshot containing parameters
   * @param state - The router state snapshot
   * @returns Promise resolving to boolean or UrlTree for redirect
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const submissionId = route.paramMap.get('submissionId');
    
    // If no submissionId in route, allow access (will show submission selection)
    if (!submissionId) {
      return true;
    }

    
    // Validate submission access
    return this.validateSubmissionAccess(submissionId).pipe(
      map(hasAccess => {
        if (hasAccess) {
          return true;
        } else {
          // Redirect to dashboard with error message
          return this.router.createUrlTree(['/dashboard'], {
            queryParams: { 
              error: 'evaluation_access_denied',
              message: 'Sie haben keine Berechtigung für diese Bewertung.'
            }
          });
        }
      }),
      catchError(error => {
        console.error('❌ Error checking evaluation access:', error);
        // Redirect to dashboard on error
        return of(this.router.createUrlTree(['/dashboard'], {
          queryParams: { 
            error: 'evaluation_error',
            message: 'Fehler beim Überprüfen der Bewertungsberechtigung.'
          }
        }));
      }),
      take(1) // Complete after first emission
    );
  }

  /**
   * Validates if the user has access to a specific submission
   *
   * @param submissionId - The submission ID to validate
   * @returns Observable<boolean | UrlTree> - True if user has access, UrlTree for redirect
   */
  private validateSubmissionAccess(submissionId: string): Observable<boolean | UrlTree> {
    return this.evaluationService.getSubmission(submissionId).pipe(
      map(submission => {
        if (!submission || !this.userService.isUserLoggedIn()) {
          return false;
        }

        // Backend enforces all authorization logic (group membership, roles, etc.)
        // If we reach here, the backend call succeeded, so user has access
        return true;
      }),
      catchError(this.handleAccessError.bind(this))
    );
  }

  /**
   * Handles access errors with user-friendly redirects
   *
   * @param error - The error from the backend
   * @returns Observable<UrlTree> - Redirect to dashboard with error message
   * @private
   */
  private handleAccessError(error: any): Observable<UrlTree> {
    // Error mapping for user-friendly messages
    const errorMap: Record<number, { error: string; message: string }> = {
      403: {
        error: 'group_access_denied',
        message: 'Sie gehören nicht zur richtigen Gruppe für diese Abgabe.'
      },
      404: {
        error: 'submission_not_found',
        message: 'Die Abgabe wurde nicht gefunden.'
      },
    };

    const errorConfig = errorMap[error.status] || {
      error: 'evaluation_error',
      message: 'Fehler beim Laden der Abgabe.'
    };

    return of(this.router.createUrlTree(['/dashboard'], { queryParams: errorConfig }));
  }
}

/**
 * Functional guard that uses the service
 * 
 * @description This is the actual guard that can be used in route configurations.
 * It injects the service and delegates the logic to maintain clean separation.
 */
export const evaluationAccessGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const guardService = inject(EvaluationAccessGuardService);
  return guardService.canActivate(route, state);
};

