import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Base Component
 * 
 * @description Abstract base component that provides common functionality
 * for all components, particularly the unsubscribe pattern using destroy$
 * to prevent memory leaks from RxJS subscriptions.
 * 
 * @abstract
 * @Component base
 */
@Component({
  template: ''
})
export abstract class BaseComponent implements OnDestroy {
  /**
   * Subject used to signal component destruction
   * 
   * @description This subject is used with takeUntil() operator to automatically
   * unsubscribe from all observables when the component is destroyed,
   * preventing memory leaks.
   * 
   * @protected
   * @readonly
   * @memberof BaseComponent
   */
  protected readonly destroy$ = new Subject<void>();

  /**
   * Component cleanup on destruction
   * 
   * @description Automatically called by Angular when component is destroyed.
   * Emits a value on destroy$ subject to trigger unsubscription from all
   * observables using takeUntil(this.destroy$).
   * 
   * @memberof BaseComponent
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}