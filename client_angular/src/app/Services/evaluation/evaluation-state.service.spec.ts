import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { take } from 'rxjs/operators';

import { EvaluationStateService } from './evaluation-state.service';
import { EvaluationDiscussionService } from './evaluation-discussion.service';
import { EvaluationMockDataService } from './evaluation-mock-data.service';
import { UserService } from '../auth/user.service';
import { CategoryRatingStatus, EvaluationStatus, EvaluationPhase } from '@DTOs/index';

describe('EvaluationStateService - Race Condition Prevention', () => {
  let service: EvaluationStateService;
  let mockEvaluationService: jasmine.SpyObj<EvaluationDiscussionService>;
  let mockMockDataService: jasmine.SpyObj<EvaluationMockDataService>;
  let mockUserService: jasmine.SpyObj<UserService>;

  const mockSubmission = {
    id: 1, // Numeric ID
    title: 'Test Submission',
    description: 'Test description',
    authorId: 1,
    pdfFileId: 123,
    sessionId: 1,
    status: EvaluationStatus.SUBMITTED,
    phase: EvaluationPhase.DISCUSSION,
    submittedAt: new Date('2023-01-01'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockCategories = [
    { id: 1, name: 'cat1', displayName: 'Category 1', description: 'Test category 1', icon: 'check_circle', order: 1 },
    { id: 2, name: 'cat2', displayName: 'Category 2', description: 'Test category 2', icon: 'palette', order: 2 },
    { id: 3, name: 'cat3', displayName: 'Category 3', description: 'Test category 3', icon: 'compare', order: 3 },
    { id: 4, name: 'cat4', displayName: 'Komplexität', description: 'Test complexity category', icon: 'settings', order: 4 },
  ];

  const mockAnonymousUser = {
    id: 999,
    userId: 123,
    displayName: 'Anonymous User',
    submissionId: 1, // Numeric ID
    colorCode: '#2196F3',
    createdAt: new Date('2023-01-01'),
  };

  const mockRatingStatuses: CategoryRatingStatus[] = [
    {
      categoryId: 1,
      categoryName: 'cat1',
      displayName: 'Category 1',
      hasRated: false,
      rating: null,
      ratedAt: null,
      lastUpdatedAt: new Date(),
      canAccessDiscussion: false,
      isRequired: true,
    },
    {
      categoryId: 2,
      categoryName: 'cat2',
      displayName: 'Category 2',
      hasRated: true,
      rating: 8,
      ratedAt: new Date(),
      lastUpdatedAt: new Date(),
      canAccessDiscussion: true,
      isRequired: true,
    },
    {
      categoryId: 3,
      categoryName: 'cat3',
      displayName: 'Category 3',
      hasRated: true,
      rating: 7,
      ratedAt: new Date(),
      lastUpdatedAt: new Date(),
      canAccessDiscussion: true,
      isRequired: true,
    },
    {
      categoryId: 4,
      categoryName: 'cat4',
      displayName: 'Komplexität',
      hasRated: true,
      rating: 9,
      ratedAt: new Date(),
      lastUpdatedAt: new Date(),
      canAccessDiscussion: true,
      isRequired: true,
    },
  ];

  beforeEach(() => {
    const evaluationServiceSpy = jasmine.createSpyObj('EvaluationDiscussionService', [
      'getSubmission',
      'getCategories',
      'getCommentStats',
      'getOrCreateAnonymousUser',
      'getUserRatingStatus'
    ]);

    const mockDataServiceSpy = jasmine.createSpyObj('EvaluationMockDataService', [
      'getMockSubmission',
      'getMockCategories',
      'getMockCommentStats',
      'getMockAnonymousUser',
      'getMockVoteLimits'
    ]);

    const userServiceSpy = jasmine.createSpyObj('UserService', ['getTokenID']);

    TestBed.configureTestingModule({
      providers: [
        EvaluationStateService,
        { provide: EvaluationDiscussionService, useValue: evaluationServiceSpy },
        { provide: EvaluationMockDataService, useValue: mockDataServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
      ],
    });

    service = TestBed.inject(EvaluationStateService);
    mockEvaluationService = TestBed.inject(EvaluationDiscussionService) as jasmine.SpyObj<EvaluationDiscussionService>;
    mockMockDataService = TestBed.inject(EvaluationMockDataService) as jasmine.SpyObj<EvaluationMockDataService>;
    mockUserService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;

    // Setup default mock returns
    mockEvaluationService.getUserRatingStatus.and.returnValue(of(mockRatingStatuses));
    mockUserService.getTokenID.and.returnValue('999');

    // Initialize service state for testing
    service['submissionSubject'].next(mockSubmission);
    service['categoriesSubject'].next(mockCategories);
    service['anonymousUserSubject'].next(mockAnonymousUser);
  });

  describe('Atomic Category Transitions', () => {

    it('should complete transition atomically without race conditions', (done) => {
      // Arrange: Setup initial state with category 4 active
      service['activeCategorySubject'].next(4);
      
      // Setup rating status map 
      const initialStatusMap = new Map<number, CategoryRatingStatus>();
      mockRatingStatuses.forEach(status => {
        initialStatusMap.set(status.categoryId, status);
      });
      service['categoryRatingStatusSubject'].next(initialStatusMap);

      let transitionLoadingStates: boolean[] = [];
      let categoryStates: number[] = [];
      let ratingStatusStates: Map<number, CategoryRatingStatus>[] = [];

      // Monitor all state changes during transition
      service.categoryTransitionLoading$.subscribe(loading => {
        transitionLoadingStates.push(loading);
      });

      service.activeCategory$.subscribe(categoryId => {
        categoryStates.push(categoryId);
      });

      service.categoryRatingStatus$.subscribe(statusMap => {
        ratingStatusStates.push(new Map(statusMap));
      });

      // Act: Transition from category 4 to category 1
      service.transitionToCategory(1).subscribe(() => {
        // Assert: Verify atomic transition completed correctly
        expect(transitionLoadingStates).toEqual([false, true, false]); // Initial -> Loading -> Completed
        expect(categoryStates[categoryStates.length - 1]).toBe(1); // Final state is category 1
        expect(mockEvaluationService.getUserRatingStatus).toHaveBeenCalledWith('test-submission-001', 999);
        
        // Verify rating status was updated atomically
        const finalRatingStatus = ratingStatusStates[ratingStatusStates.length - 1];
        expect(finalRatingStatus.get(1)?.hasRated).toBe(false);
        expect(finalRatingStatus.get(4)?.hasRated).toBe(true);
        
        done();
      });
    });

    it('should prevent race conditions when switching rapidly between categories', (done) => {
      // Arrange: Multiple rapid category switches
      service['activeCategorySubject'].next(4);
      
      const statusMap = new Map<number, CategoryRatingStatus>();
      mockRatingStatuses.forEach(status => {
        statusMap.set(status.categoryId, status);
      });
      service['categoryRatingStatusSubject'].next(statusMap);

      let completedTransitions = 0;
      let activeCategories: number[] = [];

      service.activeCategory$.subscribe(categoryId => {
        activeCategories.push(categoryId);
      });

      // Act: Rapidly switch categories
      service.transitionToCategory(1).subscribe(() => {
        completedTransitions++;
        if (completedTransitions === 1) {
          expect(activeCategories[activeCategories.length - 1]).toBe(1);
          
          // Immediately switch to category 2
          service.transitionToCategory(2).subscribe(() => {
            completedTransitions++;
            if (completedTransitions === 2) {
              expect(activeCategories[activeCategories.length - 1]).toBe(2);
              
              // Switch to category 3
              service.transitionToCategory(3).subscribe(() => {
                completedTransitions++;
                if (completedTransitions === 3) {
                  expect(activeCategories[activeCategories.length - 1]).toBe(3);
                  expect(mockEvaluationService.getUserRatingStatus).toHaveBeenCalledTimes(3);
                  done();
                }
              });
            }
          });
        }
      });
    });

    it('should use cached rating status for valid recent data', (done) => {
      // Arrange: Setup fresh rating status (less than 5 minutes old)
      const freshStatus: CategoryRatingStatus = {
        categoryId: 1,
        categoryName: 'cat1',
        displayName: 'Category 1',
        hasRated: false,
        rating: null,
        ratedAt: null,
        lastUpdatedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        canAccessDiscussion: false,
        isRequired: true,
      };

      const statusMap = new Map<number, CategoryRatingStatus>();
      statusMap.set(1, freshStatus);
      service['categoryRatingStatusSubject'].next(statusMap);

      // Act: Transition to category with fresh cached data
      service.transitionToCategory(1).subscribe(() => {
        // Assert: Should not call API for fresh cached data
        expect(mockEvaluationService.getUserRatingStatus).not.toHaveBeenCalled();
        done();
      });
    });

    it('should handle rating status loading errors gracefully', (done) => {
      // Arrange: Setup API error
      mockEvaluationService.getUserRatingStatus.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      let errorOccurred = false;
      service.error$.subscribe(error => {
        if (error) errorOccurred = true;
      });

      // Act: Attempt transition with API error
      service.transitionToCategory(1).subscribe(() => {
        // Assert: Should still complete transition but set error state
        expect(errorOccurred).toBe(true);
        expect(service['activeCategorySubject'].value).toBe(1); // Category still changed
        done();
      });
    });

    it('should not trigger transition for same category', (done) => {
      // Arrange: Set active category to 2
      service['activeCategorySubject'].next(2);
      
      let transitionStarted = false;
      service.categoryTransitionLoading$.subscribe(loading => {
        if (loading) transitionStarted = true;
      });

      // Act: Try to transition to same category
      service.transitionToCategory(2).subscribe(() => {
        // Assert: Should complete immediately without loading
        expect(transitionStarted).toBe(false);
        expect(mockEvaluationService.getUserRatingStatus).not.toHaveBeenCalled();
        done();
      });
    });

    it('should validate rating status freshness correctly', () => {
      // Test cases for isValidRatingStatus private method
      const service_any = service as any;

      // Fresh status (2 minutes old)
      const freshStatus: CategoryRatingStatus = {
        categoryId: 1,
        categoryName: 'cat1',
        displayName: 'Category 1',
        hasRated: true,
        rating: 8,
        ratedAt: new Date(),
        lastUpdatedAt: new Date(Date.now() - 2 * 60 * 1000),
        canAccessDiscussion: true,
        isRequired: true,
      };

      // Stale status (10 minutes old)
      const staleStatus: CategoryRatingStatus = {
        ...freshStatus,
        lastUpdatedAt: new Date(Date.now() - 10 * 60 * 1000),
      };

      // Invalid status (missing hasRated)
      const invalidStatus = {
        ...freshStatus,
        hasRated: undefined,
      } as any;

      expect(service_any.isValidRatingStatus(freshStatus)).toBe(true);
      expect(service_any.isValidRatingStatus(staleStatus)).toBe(false);
      expect(service_any.isValidRatingStatus(invalidStatus)).toBe(false);
      expect(service_any.isValidRatingStatus(null)).toBe(false);
    });

  });

  describe('State Consistency', () => {

    it('should maintain state consistency during concurrent operations', (done) => {
      // Arrange: Setup for concurrent operations
      service['activeCategorySubject'].next(1);
      
      let stateSnapshots: { category: number; loading: boolean; ratingStatus: Map<number, CategoryRatingStatus> }[] = [];

      // Monitor all state changes
      service.activeCategory$.pipe(take(5)).subscribe(category => {
        const loading = service['categoryTransitionLoadingSubject'].value;
        const ratingStatus = service['categoryRatingStatusSubject'].value;
        stateSnapshots.push({ category, loading, ratingStatus });
        
        if (stateSnapshots.length >= 3) {
          // Verify state consistency: loading state should prevent inconsistent UI states
          const hasInconsistentState = stateSnapshots.some((snapshot, index) => {
            if (index === 0) return false;
            const prev = stateSnapshots[index - 1];
            // If category changed but rating status didn't update, and we're not loading, it's inconsistent
            return snapshot.category !== prev.category && 
                   snapshot.ratingStatus === prev.ratingStatus && 
                   !snapshot.loading;
          });

          expect(hasInconsistentState).toBe(false);
          done();
        }
      });

      // Act: Trigger rapid category changes
      service.transitionToCategory(2);
      setTimeout(() => service.transitionToCategory(3), 10);
      setTimeout(() => service.transitionToCategory(4), 20);
    });

  });

  describe('Cache Management', () => {

    it('should properly manage rating status cache', () => {
      // Test cache initialization and updates
      const initialStatusMap = service['categoryRatingStatusSubject'].value;
      expect(initialStatusMap.size).toBe(0);

      // Setup rating status
      const statusMap = new Map<number, CategoryRatingStatus>();
      mockRatingStatuses.forEach(status => {
        statusMap.set(status.categoryId, status);
      });
      service['categoryRatingStatusSubject'].next(statusMap);

      // Verify cache update
      const updatedStatusMap = service['categoryRatingStatusSubject'].value;
      expect(updatedStatusMap.size).toBe(4);
      expect(updatedStatusMap.get(1)?.hasRated).toBe(false);
      expect(updatedStatusMap.get(4)?.hasRated).toBe(true);
    });

  });

});