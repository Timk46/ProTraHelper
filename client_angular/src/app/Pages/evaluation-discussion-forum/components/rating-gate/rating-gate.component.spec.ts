import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { ChangeDetectionStrategy, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { RatingGateComponent } from './rating-gate.component';
import { EvaluationDiscussionService } from '../../../../Services/evaluation/evaluation-discussion.service';
import { EvaluationStateService } from '../../../../Services/evaluation/evaluation-state.service';
import { UserService } from '../../../../Services/auth/user.service';
import { CategoryRatingStatus, EvaluationCategoryDTO, AnonymousEvaluationUserDTO } from '@DTOs/index';

describe('RatingGateComponent - Race Condition Prevention', () => {
  let component: RatingGateComponent;
  let fixture: ComponentFixture<RatingGateComponent>;
  let mockStateService: jasmine.SpyObj<EvaluationStateService>;
  let mockEvaluationService: jasmine.SpyObj<EvaluationDiscussionService>;
  let mockUserService: jasmine.SpyObj<UserService>;

  // Subjects to simulate state service observables
  let activeCategorySubject: BehaviorSubject<number>;
  let categoryRatingStatusSubject: BehaviorSubject<Map<number, CategoryRatingStatus>>;
  let categoryTransitionLoadingSubject: BehaviorSubject<boolean>;

  const mockCategory: EvaluationCategoryDTO = {
    id: 1,
    name: 'cat1',
    displayName: 'Category 1',
    description: 'Test category',
    icon: 'test-icon',
    color: '#blue',
    order: 1,
  };

  const mockAnonymousUser: AnonymousEvaluationUserDTO = {
    id: 999,
    displayName: 'Anonymous User',
    submissionId: 'test-submission-001',
  };

  const mockRatingStatus: CategoryRatingStatus = {
    categoryId: 1,
    categoryName: 'cat1',
    displayName: 'Category 1',
    hasRated: false,
    rating: null,
    ratedAt: null,
    lastUpdatedAt: new Date(),
    canAccessDiscussion: false,
    isRequired: true,
  };

  beforeEach(async () => {
    // Initialize subjects
    activeCategorySubject = new BehaviorSubject<number>(1);
    categoryRatingStatusSubject = new BehaviorSubject<Map<number, CategoryRatingStatus>>(new Map());
    categoryTransitionLoadingSubject = new BehaviorSubject<boolean>(false);

    const stateServiceSpy = jasmine.createSpyObj('EvaluationStateService', [
      'loadCategoryRatingStatus',
      'refreshRatingStatus'
    ], {
      activeCategory$: activeCategorySubject.asObservable(),
      categoryRatingStatus$: categoryRatingStatusSubject.asObservable(),
      categoryTransitionLoading$: categoryTransitionLoadingSubject.asObservable(),
    });

    const evaluationServiceSpy = jasmine.createSpyObj('EvaluationDiscussionService', [
      'getUserRatingStatus'
    ]);

    const userServiceSpy = jasmine.createSpyObj('UserService', ['getTokenID']);
    userServiceSpy.getTokenID.and.returnValue('999');

    await TestBed.configureTestingModule({
      imports: [RatingGateComponent, NoopAnimationsModule],
      providers: [
        { provide: EvaluationStateService, useValue: stateServiceSpy },
        { provide: EvaluationDiscussionService, useValue: evaluationServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
      ],
    })
    .overrideComponent(RatingGateComponent, {
      set: { changeDetection: ChangeDetectionStrategy.Default }
    })
    .compileComponents();

    mockStateService = TestBed.inject(EvaluationStateService) as jasmine.SpyObj<EvaluationStateService>;
    mockEvaluationService = TestBed.inject(EvaluationDiscussionService) as jasmine.SpyObj<EvaluationDiscussionService>;
    mockUserService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;

    fixture = TestBed.createComponent(RatingGateComponent);
    component = fixture.componentInstance;

    // Setup component inputs
    component.submissionId = 'test-submission-001';
    component.currentCategory = mockCategory;
    component.anonymousUser = mockAnonymousUser;
    component.discussions = [];
    component.canComment = false;
    component.canVote = false;
    component.availableUpvotes = 0;
    component.availableDownvotes = 0;
    component.isReadOnly = false;
    component.isSubmittingComment = false;
    component.isVotingComment = new Map();
    component.trackByDiscussion = (index, item) => item.id;
  });

  describe('Race Condition Prevention During Category Transitions', () => {

    it('should show loading state during atomic category transitions', async () => {
      // Arrange: Setup initial state
      const statusMap = new Map<number, CategoryRatingStatus>();
      statusMap.set(1, mockRatingStatus);
      categoryRatingStatusSubject.next(statusMap);
      
      fixture.detectChanges();
      await fixture.whenStable();

      // Act: Simulate transition loading
      categoryTransitionLoadingSubject.next(true);
      fixture.detectChanges();

      // Assert: Should show loading state
      const loadingElement = fixture.debugElement.query(By.css('.loading-state'));
      expect(loadingElement).toBeTruthy();
      expect(loadingElement.nativeElement.textContent).toContain('Überprüfe Bewertungsstatus');

      // Verify rating interface is not shown during transition
      const ratingElement = fixture.debugElement.query(By.css('.rating-required-state'));
      expect(ratingElement).toBeFalsy();
    });

    it('should not show inconsistent UI state during race conditions', async () => {
      // Arrange: Setup scenario where category changes but rating status is delayed
      const initialStatusMap = new Map<number, CategoryRatingStatus>();
      initialStatusMap.set(1, { ...mockRatingStatus, hasRated: false });
      initialStatusMap.set(2, { ...mockRatingStatus, categoryId: 2, hasRated: true, canAccessDiscussion: true });
      
      categoryRatingStatusSubject.next(initialStatusMap);
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify initial state (category 1, not rated)
      let ratingRequiredElement = fixture.debugElement.query(By.css('.rating-required-state'));
      expect(ratingRequiredElement).toBeTruthy();

      // Act: Simulate atomic transition - loading state first
      categoryTransitionLoadingSubject.next(true);
      fixture.detectChanges();

      // Assert: During loading, should show loading state, not old category state
      const loadingElement = fixture.debugElement.query(By.css('.loading-state'));
      expect(loadingElement).toBeTruthy();
      
      ratingRequiredElement = fixture.debugElement.query(By.css('.rating-required-state'));
      expect(ratingRequiredElement).toBeFalsy();

      // Complete transition: category and status change atomically
      activeCategorySubject.next(2);
      categoryTransitionLoadingSubject.next(false);
      fixture.detectChanges();

      // Assert: Should now show discussion access for rated category 2
      const discussionElement = fixture.debugElement.query(By.css('.discussion-access-granted'));
      expect(discussionElement).toBeTruthy();
    });

    it('should handle invalid rating status gracefully during transitions', async () => {
      // Arrange: Setup invalid rating status (null or incomplete)
      const invalidStatusMap = new Map<number, CategoryRatingStatus>();
      // Category 1 has null rating status (simulating race condition where status isn't loaded yet)
      categoryRatingStatusSubject.next(invalidStatusMap);
      
      activeCategorySubject.next(1);
      categoryTransitionLoadingSubject.next(false); // Not loading, but no valid status
      fixture.detectChanges();
      await fixture.whenStable();

      // Assert: Should show loading message instead of crashing
      const component_any = component as any;
      component.viewModel$.subscribe(vm => {
        expect(vm.error).toContain('Rating-Status wird geladen');
        expect(vm.hasRated).toBe(false);
        expect(vm.canAccessDiscussion).toBe(false);
      });
    });

    it('should properly validate rating status completeness', async () => {
      // Test different rating status scenarios
      const testCases = [
        {
          name: 'Complete valid status',
          status: mockRatingStatus,
          expectedValid: true,
        },
        {
          name: 'Missing hasRated property',
          status: { ...mockRatingStatus, hasRated: undefined as any },
          expectedValid: false,
        },
        {
          name: 'Null rating status',
          status: null,
          expectedValid: false,
        },
      ];

      for (const testCase of testCases) {
        // Arrange
        const statusMap = new Map<number, CategoryRatingStatus>();
        if (testCase.status) {
          statusMap.set(1, testCase.status);
        }
        categoryRatingStatusSubject.next(statusMap);
        categoryTransitionLoadingSubject.next(false);
        
        fixture.detectChanges();
        await fixture.whenStable();

        // Assert
        component.viewModel$.subscribe(vm => {
          if (testCase.expectedValid) {
            expect(vm.error).toBeNull();
          } else {
            expect(vm.error).toBeTruthy();
          }
        }).unsubscribe();
      }
    });

    it('should use distinctUntilChanged to prevent unnecessary UI updates', async () => {
      // Arrange: Setup tracking of view model emissions
      let viewModelEmissions = 0;
      const subscription = component.viewModel$.subscribe(() => {
        viewModelEmissions++;
      });

      const statusMap = new Map<number, CategoryRatingStatus>();
      statusMap.set(1, mockRatingStatus);
      
      // Act: Emit same status multiple times
      categoryRatingStatusSubject.next(statusMap);
      fixture.detectChanges();
      
      categoryRatingStatusSubject.next(statusMap); // Same status
      fixture.detectChanges();
      
      categoryRatingStatusSubject.next(statusMap); // Same status again
      fixture.detectChanges();

      await fixture.whenStable();

      // Assert: Should only emit once due to distinctUntilChanged
      expect(viewModelEmissions).toBeLessThanOrEqual(2); // Initial + one change at most
      
      subscription.unsubscribe();
    });

    it('should emit rating submitted event correctly without race conditions', async () => {
      // Arrange
      spyOn(component.ratingSubmitted, 'emit');
      spyOn(component.accessGranted, 'emit');

      const statusMap = new Map<number, CategoryRatingStatus>();
      statusMap.set(1, { ...mockRatingStatus, hasRated: false });
      categoryRatingStatusSubject.next(statusMap);
      
      fixture.detectChanges();
      await fixture.whenStable();

      // Act: Submit rating
      const ratingEvent = { rating: 8, score: 8 };
      component.onRatingSubmitted(ratingEvent);

      // Assert: Events should be emitted correctly
      expect(component.ratingSubmitted.emit).toHaveBeenCalledWith({
        categoryId: 1,
        score: 8
      });
      expect(component.accessGranted.emit).toHaveBeenCalledWith({
        categoryId: 1
      });
    });

  });

  describe('Error Handling', () => {

    it('should handle retry mechanism correctly', async () => {
      // Arrange: Setup error state
      component['errorSubject'].next('Test error');
      fixture.detectChanges();
      await fixture.whenStable();

      // Act: Click retry button
      const retryButton = fixture.debugElement.query(By.css('button'));
      expect(retryButton).toBeTruthy();
      
      retryButton.nativeElement.click();
      fixture.detectChanges();

      // Assert: Should call refresh on state service
      expect(mockStateService.refreshRatingStatus).toHaveBeenCalledWith('test-submission-001', 999);
    });

  });

  describe('Component State Consistency', () => {

    it('should maintain consistent component state across category changes', async () => {
      // Arrange: Setup multiple categories with different states
      const statusMap = new Map<number, CategoryRatingStatus>();
      statusMap.set(1, { ...mockRatingStatus, hasRated: false, canAccessDiscussion: false });
      statusMap.set(2, { ...mockRatingStatus, categoryId: 2, hasRated: true, canAccessDiscussion: true });
      
      categoryRatingStatusSubject.next(statusMap);
      fixture.detectChanges();

      // Act & Assert: Switch categories and verify consistent state
      const stateSnapshots: any[] = [];
      const subscription = component.viewModel$.subscribe(vm => {
        stateSnapshots.push({
          hasRated: vm.hasRated,
          canAccess: vm.canAccessDiscussion,
          isLoading: vm.isLoading,
          category: activeCategorySubject.value
        });
      });

      // Category 1: Should show rating required
      activeCategorySubject.next(1);
      categoryTransitionLoadingSubject.next(false);
      fixture.detectChanges();
      await fixture.whenStable();

      // Category 2: Should show discussion access
      activeCategorySubject.next(2);
      categoryTransitionLoadingSubject.next(false);
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify state consistency
      const finalStates = stateSnapshots.slice(-2);
      expect(finalStates[0].hasRated).toBe(false); // Category 1 state
      expect(finalStates[1].hasRated).toBe(true);  // Category 2 state

      subscription.unsubscribe();
    });

  });

});