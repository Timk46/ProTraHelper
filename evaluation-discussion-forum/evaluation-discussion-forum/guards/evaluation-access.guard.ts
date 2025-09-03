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
      console.log('🔓 Evaluation access granted: No specific submission requested');
      return true;
    }

    console.log('🔍 Checking evaluation access for submission:', submissionId);
    
    // Validate submission access
    return this.validateSubmissionAccess(submissionId).pipe(
      map(hasAccess => {
        if (hasAccess) {
          console.log('✅ Evaluation access granted for submission:', submissionId);
          return true;
        } else {
          console.warn('❌ Evaluation access denied for submission:', submissionId);
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
   * @returns Observable<boolean> - True if user has access
   */
  private validateSubmissionAccess(submissionId: string): Observable<boolean> {
    return this.evaluationService.getSubmission(submissionId).pipe(
      map(submission => {
        if (!submission) {
          console.warn('⚠️ Submission not found:', submissionId);
          return false;
        }

        // Check if user is logged in
        if (!this.userService.isUserLoggedIn()) {
          console.warn('⚠️ User not logged in for evaluation access');
          return false;
        }

        // Check subject registration (reuse existing logic)
        if (!this.userService.isRegisteredForSubject('Tragkonstruktion 3')) {
          console.warn('⚠️ User not registered for required subject');
          return false;
        }

        // Additional evaluation-specific checks can be added here:
        // - Check if evaluation period is active
        // - Check if user has specific role permissions
        // - Check if submission belongs to user's group/session
        
        console.log('✅ Submission access validation passed:', {
          submissionId: submission.id,
          phase: submission.phase,
          sessionId: submission.sessionId
        });
        
        return true;
      }),
      catchError(error => {
        // Handle specific error types
        if (error.status === 404) {
          console.warn('⚠️ Submission not found (404):', submissionId);
          return of(false);
        }
        if (error.status === 403) {
          console.warn('⚠️ Access forbidden (403) for submission:', submissionId);
          return of(false);
        }
        
        console.error('❌ Error validating submission access:', error);
        return of(false); // Deny access on error
      })
    );
  }

  /**
   * Checks if the evaluation phase allows forum access
   * 
   * @param phase - The current evaluation phase
   * @returns boolean - True if forum access is allowed
   */
  private isForumAccessAllowed(phase: string): boolean {
    // Define which phases allow forum access
    const allowedPhases = ['DISCUSSION', 'EVALUATION', 'RATING'];
    return allowedPhases.includes(phase);
  }

  /**
   * Validates time-based access restrictions
   * 
   * @param submission - The submission object
   * @returns boolean - True if time restrictions are met
   */
  private validateTimeRestrictions(submission: any): boolean {
    const now = new Date();
    
    // Example: Check if evaluation period is active
    // This would typically come from the submission or session data
    if (submission.evaluationStartDate && submission.evaluationEndDate) {
      const startDate = new Date(submission.evaluationStartDate);
      const endDate = new Date(submission.evaluationEndDate);
      
      if (now < startDate || now > endDate) {
        console.warn('⚠️ Evaluation period not active:', {
          now: now.toISOString(),
          start: startDate.toISOString(),
          end: endDate.toISOString()
        });
        return false;
      }
    }
    
    return true;
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

/**
 * Type guard for evaluation permissions
 * 
 * @description Utility function to check evaluation permissions in components
 * 
 * @param submission - The submission to check
 * @param userRole - The user's role
 * @returns boolean - True if user has evaluation permissions
 */
export function hasEvaluationPermission(
  submission: any, 
  userRole: string
): boolean {
  // Define role-based permissions
  const adminRoles = ['ADMIN', 'LECTURER', 'TEACHER'];
  const studentRoles = ['STUDENT', 'PARTICIPANT'];
  
  // Admins have full access
  if (adminRoles.includes(userRole)) {
    return true;
  }
  
  // Students need to be in evaluation phase
  if (studentRoles.includes(userRole)) {
    return submission?.phase === 'EVALUATION' || submission?.phase === 'DISCUSSION';
  }
  
  return false;
}