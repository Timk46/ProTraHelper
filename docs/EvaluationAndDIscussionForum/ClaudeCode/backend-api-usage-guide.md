# Backend API Usage Guide - Evaluation Discussion Forum

## Overview

This guide explains how to use the newly implemented backend endpoints for the evaluation discussion forum. Two approaches are now available for different use cases.

## 🎯 New Backend Endpoints

### 1. Categories Endpoint
```http
GET /api/evaluation-sessions/{sessionId}/categories
```

**Purpose**: Retrieve all evaluation categories for a specific session

**Parameters**:
- `sessionId` (number): The evaluation session ID

**Response**: `EvaluationCategoryDTO[]`

### 2. Comment Statistics Endpoint
```http
GET /api/evaluation-submissions/{submissionId}/comment-stats
```

**Purpose**: Get comprehensive comment statistics including per-category limits and usage

**Parameters**:
- `submissionId` (string): The submission ID

**Response**: `CommentStatsDTO`

### 3. Submission-Based Phase Switch Endpoint
```http
POST /api/evaluation-submissions/{submissionId}/switch-phase
```

**Purpose**: Switch evaluation session phase using submission context (alternative approach)

**Parameters**:
- `submissionId` (string): The submission ID
- Body: `{ targetPhase: 'DISCUSSION' | 'EVALUATION', reason?: string }`

**Response**: `EvaluationSessionDTO`

## 🚀 Usage Instructions

### Frontend Service Usage

#### Option 1: Session-Based Approach (Traditional)

```typescript
// In your component
constructor(
  private evaluationState: EvaluationStateService,
  private evaluationService: EvaluationDiscussionService
) {}

// Load submission and categories
loadEvaluationData(submissionId: string) {
  // This automatically loads categories when submission loads
  this.evaluationState.loadSubmission(submissionId);
  
  // Or manually load categories if you have sessionId
  this.evaluationService.getSubmission(submissionId).subscribe(submission => {
    this.evaluationService.getCategories(submission.sessionId).subscribe(categories => {
      console.log('Categories loaded:', categories);
    });
  });
}

// Phase switching (session-based)
switchToEvaluation(submissionId: string) {
  this.evaluationState.switchPhase(submissionId, EvaluationPhase.EVALUATION)
    .subscribe({
      next: (response) => console.log('Phase switched:', response),
      error: (error) => console.error('Switch failed:', error)
    });
}
```

#### Option 2: Submission-Based Approach (More Efficient)

```typescript
// Direct submission-based phase switching (recommended)
switchToEvaluationDirect(submissionId: string) {
  this.evaluationState.switchPhaseBySubmission(
    submissionId, 
    EvaluationPhase.EVALUATION,
    'Switching to evaluation phase for final scoring'
  ).subscribe({
    next: (response) => console.log('Phase switched directly:', response),
    error: (error) => console.error('Switch failed:', error)
  });
}

// Get comment statistics
getCommentStatistics(submissionId: string) {
  this.evaluationService.getCommentStats(submissionId).subscribe(stats => {
    console.log('Comment statistics:', stats);
    
    // Access per-category statistics
    stats.categories.forEach(categoryStats => {
      console.log(`Category ${categoryStats.categoryId}:`, {
        totalComments: categoryStats.totalComments,
        availableComments: categoryStats.availableComments,
        usedComments: categoryStats.usedComments,
        percentage: categoryStats.percentage
      });
    });
  });
}
```

### Component Integration Example

```typescript
export class EvaluationDiscussionForumComponent implements OnInit {
  submissionId = 'eval-sub-1';
  
  constructor(
    private evaluationState: EvaluationStateService,
    private evaluationService: EvaluationDiscussionService
  ) {}

  ngOnInit() {
    // Load all evaluation data
    this.loadEvaluationData();
    
    // Subscribe to observables
    this.evaluationState.submission$.subscribe(submission => {
      if (submission) {
        console.log('Current phase:', submission.phase);
      }
    });
    
    this.evaluationState.commentStats$.subscribe(stats => {
      if (stats) {
        console.log('Comment statistics updated:', stats);
      }
    });
  }
  
  private loadEvaluationData() {
    // This will automatically trigger:
    // 1. Load submission
    // 2. Load categories (using sessionId from submission)
    // 3. Load comment statistics
    // 4. Load anonymous user
    this.evaluationState.loadSubmission(this.submissionId);
  }
  
  onSwitchPhase(targetPhase: EvaluationPhase) {
    // Use the more efficient submission-based approach
    this.evaluationState.switchPhaseBySubmission(this.submissionId, targetPhase)
      .subscribe({
        next: () => console.log(`Switched to ${targetPhase} phase`),
        error: (error) => console.error('Phase switch failed:', error)
      });
  }
}
```

## 📊 When to Use Each Approach

### Session-Based Approach (`switchPhase`)
**Use when**:
- You need compatibility with existing frontend code
- You're working with session-level operations
- You need the traditional two-step process

**Characteristics**:
- Requires 2 API calls (get submission → switch phase)
- More network overhead
- Traditional approach

### Submission-Based Approach (`switchPhaseBySubmission`)
**Use when**:
- You want optimal performance
- You're working primarily with submission context
- You want to minimize API calls

**Characteristics**:
- Single API call
- Better performance
- More direct approach
- **Recommended for new implementations**

## 🔧 Backend Implementation Details

### Categories Endpoint
- Retrieves categories ordered by `displayOrder`
- Includes comprehensive error handling
- Validates session existence
- Access: Any authenticated user

### Comment Statistics Endpoint
- Provides detailed per-category statistics
- Includes progress indicators and visual elements
- Calculates usage percentages
- Future-ready for CommentLimit model integration
- Access: Any authenticated user

### Submission Phase Switch Endpoint
- Direct phase switching without session lookup
- Triggers notifications to all session participants
- Comprehensive error handling and validation
- Access: Teachers and Administrators only

## 🚨 Error Handling

All endpoints include proper error handling:

```typescript
// Example error handling
this.evaluationService.getCommentStats(submissionId).subscribe({
  next: (stats) => {
    // Handle success
    this.commentStats = stats;
  },
  error: (error) => {
    // Handle specific errors
    if (error.status === 404) {
      console.error('Submission not found');
    } else if (error.status === 403) {
      console.error('Access denied');
    } else {
      console.error('Unexpected error:', error);
    }
  }
});
```

## 🔄 Real-time Updates

Both approaches support real-time updates through the existing notification system:

```typescript
// The state service automatically handles real-time updates
this.evaluationState.handleRealtimeUpdate({
  type: 'phase-switched',
  submissionId: 'eval-sub-1',
  previousPhase: EvaluationPhase.DISCUSSION,
  currentPhase: EvaluationPhase.EVALUATION,
  switchedAt: new Date()
});
```

## ✅ Testing Commands

### Frontend Testing
```bash
# Start the frontend development server
cd client_angular
npm start

# Navigate to the evaluation forum
# http://localhost:4200/evaluation-forum
```

### Backend Testing
```bash
# Start the backend in development mode
cd server_nestjs
npm run start:dev

# Test the new endpoints with curl
curl -X GET "http://localhost:3000/api/evaluation-sessions/1/categories"
curl -X GET "http://localhost:3000/api/evaluation-submissions/eval-sub-1/comment-stats"
curl -X POST "http://localhost:3000/api/evaluation-submissions/eval-sub-1/switch-phase" \
  -H "Content-Type: application/json" \
  -d '{"targetPhase": "EVALUATION"}'
```

## 📝 Summary

- **3 new backend endpoints** implemented with comprehensive documentation
- **2 frontend approaches** available for different use cases
- **Backward compatibility** maintained with existing code
- **Performance optimized** with the new submission-based approach
- **Real-time updates** supported through existing notification system
- **Type safety** ensured with shared DTOs

The **submission-based approach is recommended** for new implementations due to its efficiency and direct API calls.