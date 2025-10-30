import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Services
import { EvaluationStateService } from '../Services/evaluation/evaluation-state.service';
import { LoggerService } from '../Services/logger/logger.service';

/**
 * Resolver that preloads initial discussions before route activation
 *
 * @description
 * This resolver ensures that discussions for the first 3 categories
 * are loaded before the evaluation discussion forum component renders.
 * This prevents UI flicker and provides a seamless user experience.
 *
 * **Behavior:**
 * - Loads discussions for first 3 categories in parallel
 * - Waits until all loads complete or fail
 * - Never blocks navigation (returns void on error)
 * - Provides better UX by preloading likely-viewed content
 *
 * **Performance:**
 * - Parallel HTTP requests (not sequential)
 * - Uses existing cache mechanism
 * - No duplicate loads (checks cache first)
 *
 * @example
 * ```typescript
 * {
 *   path: 'forum/:id',
 *   component: EvaluationDiscussionForumComponent,
 *   resolve: { discussions: EvaluationDiscussionResolver }
 * }
 * ```
 *
 * @implements {Resolve<void>}
 * @since 2.0.0
 */
@Injectable({
  providedIn: 'root'
})
export class EvaluationDiscussionResolver implements Resolve<void> {
  private readonly log = this.logger.scope('EvaluationDiscussionResolver');

  constructor(
    private readonly stateService: EvaluationStateService,
    private readonly logger: LoggerService
  ) {}

  /**
   * Resolves discussions preload before route activation
   *
   * @param route - The activated route snapshot containing route parameters
   * @returns Observable<void> that completes when preload finishes or fails gracefully
   */
  resolve(route: ActivatedRouteSnapshot): Observable<void> {
    const submissionId = route.params['submissionId'];

    if (!submissionId) {
      this.log.warn('No submission ID in route params, skipping preload');
      return of(void 0);
    }

    this.log.info('Preloading discussions for submission', { submissionId });

    // Preload initial discussions (fails gracefully, never blocks navigation)
    return this.stateService.preloadInitialDiscussions(submissionId).pipe(
      catchError(error => {
        this.log.error('Preload failed, continuing navigation', { error, submissionId });
        // Never block navigation on error
        return of(void 0);
      })
    );
  }
}
