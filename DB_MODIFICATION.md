# DB_MODIFICATION.md - HEFL Evaluation System Refactoring

## 🎯 Executive Summary

**Ziel:** Eliminierung der redundanten `EvaluationSession` Ebene und Vereinfachung der gesamten Evaluation-Architektur.

**Kernproblem:** Eine Submission IST bereits eine Session - die zusätzliche Session-Ebene verursacht unnötige Komplexität.

**Lösung:** 3-Phasen Hybrid-Ansatz mit State Machine und JSON-basierten Kategorien.

---

## 📊 Aktuelle vs. Neue Architektur

### Aktuelle Struktur (5 Tabellen, verschachtelt)
```
EvaluationSession (id, title, phase, categories[])
    └── EvaluationSubmission (sessionId, pdfFileId)
        ├── EvaluationCategory (sessionId, name)
        ├── EvaluationRating (submissionId, categoryId, userId)
        └── EvaluationComment (submissionId, categoryId, parentId)
```

### Neue Struktur (3 Tabellen, flach)
```
PeerReviewSubmission (id, moduleId, state, criteria:JSON)
    ├── PeerReview (submissionId, ratings:JSON, feedback:JSON)
    └── PeerComment (submissionId, threadId, parentId)
```

**Reduktion:** 40% weniger Tabellen, 60% weniger JOINs

---

## 🗄️ Detaillierte Schema-Änderungen

### 1. NEUE TABELLEN

#### PeerReviewSubmission
```prisma
model PeerReviewSubmission {
  id              String          @id @default(cuid())
  title           String
  description     String?
  
  // Direkte Module-Verknüpfung (ohne Session!)
  moduleId        Int
  authorId        Int
  pdfFileId       Int
  
  // State Machine Fields
  state           SubmissionState @default(DRAFT)
  stateData       Json?           // {"transitionedAt": "...", "triggeredBy": ...}
  
  // Kategorien als JSON (flexibel, versionierbar)
  criteria        Json            @default('[
    {
      "id": "completeness",
      "name": "Vollständigkeit",
      "displayName": "Vollständigkeit der Lösung",
      "description": "Wie vollständig ist die eingereichte Lösung?",
      "weight": 0.3,
      "icon": "check_circle",
      "color": "#4CAF50",
      "order": 1
    },
    {
      "id": "quality",
      "name": "Qualität",
      "displayName": "Grafische Darstellungsqualität",
      "description": "Qualität der grafischen Darstellung",
      "weight": 0.4,
      "icon": "palette",
      "color": "#2196F3",
      "order": 2
    },
    {
      "id": "creativity",
      "name": "Kreativität",
      "displayName": "Kreativität & Innovation",
      "description": "Originalität und innovative Ansätze",
      "weight": 0.3,
      "icon": "lightbulb",
      "color": "#FF9800",
      "order": 3
    }
  ]')
  
  // Reviewer Management (nutzt UserGroup!)
  reviewerGroupId Int?
  maxReviewers    Int             @default(5)
  minReviewers    Int             @default(3)
  
  // Zeitmanagement
  submittedAt     DateTime?
  reviewDeadline  DateTime?
  completedAt     DateTime?
  
  // Denormalisierte Felder für Performance
  reviewCount     Int             @default(0)
  avgRating       Float?
  lastActivity    DateTime        @default(now())
  
  // Timestamps
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  // Relations
  module          Module          @relation(fields: [moduleId], references: [id])
  author          User            @relation(fields: [authorId], references: [id])
  pdfFile         File            @relation(fields: [pdfFileId], references: [id])
  reviewerGroup   UserGroup?      @relation(fields: [reviewerGroupId], references: [id])
  
  reviews         PeerReview[]
  comments        PeerComment[]
  assignments     ReviewAssignment[]
  
  // Indexes für Performance
  @@index([moduleId, state])
  @@index([authorId])
  @@index([state, reviewDeadline])
  @@map("peer_review_submissions")
}

enum SubmissionState {
  DRAFT
  SUBMITTED
  ASSIGNING_REVIEWERS
  REVIEWING
  DISCUSSION
  FINALIZING
  COMPLETED
  ARCHIVED
}
```

#### PeerReview
```prisma
model PeerReview {
  id              String          @id @default(cuid())
  submissionId    String
  reviewerId      Int
  
  // Alle Bewertungen in einem JSON-Objekt
  ratings         Json            // {"completeness": 8, "quality": 7, "creativity": 9}
  
  // Feedback pro Kategorie
  feedback        Json            // {"completeness": "Sehr gut...", "quality": "Könnte..."}
  
  // Gesamt-Feedback (optional)
  overallComment  String?         @db.Text
  
  // Review-Status
  isDraft         Boolean         @default(true)
  isComplete      Boolean         @default(false)
  
  // Anonymität
  isAnonymous     Boolean         @default(true)
  anonymousName   String?         // "Reviewer A", "Reviewer B", etc.
  
  // Zeitstempel
  startedAt       DateTime        @default(now())
  submittedAt     DateTime?
  lastEditedAt    DateTime        @updatedAt
  
  // Relations
  submission      PeerReviewSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  reviewer        User            @relation(fields: [reviewerId], references: [id])
  
  // Constraints
  @@unique([submissionId, reviewerId])
  @@index([submissionId, isComplete])
  @@map("peer_reviews")
}
```

#### PeerComment
```prisma
model PeerComment {
  id              String          @id @default(cuid())
  submissionId    String
  userId          Int
  
  // Thread-Management (ersetzt Discussion)
  threadId        String?         // Gruppiert zusammengehörige Kommentare
  parentId        String?         // Für Antworten auf Kommentare
  
  // Kategorie-Zuordnung (optional)
  criteriaId      String?         // Bezug zu criteria.id im JSON
  
  // Inhalt
  content         String          @db.Text
  
  // Voting (vereinfacht)
  upvotes         Int             @default(0)
  downvotes       Int             @default(0)
  voteDetails     Json?           // {"userVotes": {"123": "UP", "456": "DOWN"}}
  
  // Anonymität
  isAnonymous     Boolean         @default(true)
  anonymousName   String?         // "Student A", "Student B", etc.
  
  // Metadata
  isInitialReview Boolean         @default(false) // Markiert initiale Bewertungen
  isPinned        Boolean         @default(false) // Wichtige Kommentare
  isResolved      Boolean         @default(false) // Für Diskussions-Threads
  
  // Timestamps
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  editedAt        DateTime?       // Wenn bearbeitet
  
  // Relations
  submission      PeerReviewSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  user            User            @relation(fields: [userId], references: [id])
  parent          PeerComment?    @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies         PeerComment[]   @relation("CommentReplies")
  
  // Indexes
  @@index([submissionId, threadId])
  @@index([submissionId, criteriaId])
  @@index([parentId])
  @@map("peer_comments")
}
```

#### ReviewAssignment
```prisma
model ReviewAssignment {
  id              String          @id @default(cuid())
  submissionId    String
  reviewerId      Int
  
  // Assignment-Details
  assignedBy      Int?            // Wer hat zugewiesen (null = System)
  assignmentType  AssignmentType  @default(RANDOM)
  
  // Status
  status          AssignmentStatus @default(PENDING)
  
  // Deadlines
  assignedAt      DateTime        @default(now())
  acceptedAt      DateTime?
  completedAt     DateTime?
  deadline        DateTime
  
  // Notifications
  remindersSent   Int             @default(0)
  lastReminderAt  DateTime?
  
  // Relations
  submission      PeerReviewSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  reviewer        User            @relation(fields: [reviewerId], references: [id])
  
  // Constraints
  @@unique([submissionId, reviewerId])
  @@index([reviewerId, status])
  @@index([deadline, status])
  @@map("review_assignments")
}

enum AssignmentType {
  RANDOM
  MANUAL
  GROUP_BASED
  ROUND_ROBIN
}

enum AssignmentStatus {
  PENDING
  ACCEPTED
  IN_PROGRESS
  COMPLETED
  DECLINED
  EXPIRED
}
```

### 2. MATERIALIZED VIEWS (für Performance)

```sql
-- Dashboard View
CREATE MATERIALIZED VIEW submission_dashboard_view AS
SELECT 
  s.id,
  s.title,
  s.state,
  u.firstname || ' ' || u.lastname as author_name,
  s.review_count,
  s.avg_rating,
  s.last_activity,
  -- Hot Score Berechnung
  (s.review_count * 0.3 + 
   COALESCE(s.avg_rating, 0) * 0.4 + 
   (SELECT COUNT(*) FROM peer_comments WHERE submission_id = s.id) * 0.3) as hot_score,
  -- Kategorie-Durchschnitte
  (SELECT json_agg(
    json_build_object(
      'criteria_id', criteria->>'id',
      'avg_rating', AVG((r.ratings->>(criteria->>'id'))::float)
    )
  )
  FROM peer_reviews r,
       json_array_elements(s.criteria) as criteria
  WHERE r.submission_id = s.id AND r.is_complete = true
  GROUP BY criteria->>'id'
  ) as criteria_averages
FROM peer_review_submissions s
JOIN users u ON s.author_id = u.id;

CREATE INDEX idx_dashboard_view_state ON submission_dashboard_view(state);
CREATE INDEX idx_dashboard_view_hot_score ON submission_dashboard_view(hot_score DESC);
```

### 3. ZU ENTFERNENDE TABELLEN

```sql
-- Diese Tabellen werden nach erfolgreicher Migration gelöscht:
DROP TABLE IF EXISTS evaluation_comments CASCADE;
DROP TABLE IF EXISTS evaluation_ratings CASCADE;
DROP TABLE IF EXISTS evaluation_categories CASCADE;
DROP TABLE IF EXISTS evaluation_submissions CASCADE;
DROP TABLE IF EXISTS evaluation_sessions CASCADE;
```

---

## 🔄 Migration Strategy

### Phase 1: Parallel Setup (Woche 1)

```typescript
// 1. Prisma Migration erstellen
npx prisma migrate dev --name add_peer_review_tables --create-only

// 2. Migration anpassen für Datenübernahme
async function migrateEvaluationData() {
  // Session -> Submission Migration
  const sessions = await prisma.evaluationSession.findMany({
    include: {
      submissions: true,
      categories: true
    }
  });

  for (const session of sessions) {
    for (const submission of session.submissions) {
      // Erstelle PeerReviewSubmission
      const peerSubmission = await prisma.peerReviewSubmission.create({
        data: {
          id: submission.id, // Behalte IDs
          title: submission.title,
          description: submission.description,
          moduleId: session.moduleId,
          authorId: submission.authorId,
          pdfFileId: submission.pdfFileId,
          state: mapPhaseToState(submission.phase),
          criteria: session.categories.map(cat => ({
            id: cat.name,
            name: cat.name,
            displayName: cat.displayName,
            description: cat.description,
            icon: cat.icon,
            color: cat.color,
            order: cat.order,
            weight: 1 / session.categories.length
          })),
          submittedAt: submission.submittedAt,
          reviewDeadline: session.endDate
        }
      });

      // Migrate Ratings -> Reviews
      const ratings = await prisma.evaluationRating.findMany({
        where: { submissionId: submission.id }
      });

      const ratingsByUser = groupBy(ratings, 'userId');
      
      for (const [userId, userRatings] of Object.entries(ratingsByUser)) {
        await prisma.peerReview.create({
          data: {
            submissionId: peerSubmission.id,
            reviewerId: parseInt(userId),
            ratings: userRatings.reduce((acc, r) => {
              const category = session.categories.find(c => c.id === r.categoryId);
              if (category) {
                acc[category.name] = r.rating;
              }
              return acc;
            }, {}),
            feedback: userRatings.reduce((acc, r) => {
              const category = session.categories.find(c => c.id === r.categoryId);
              if (category && r.comment) {
                acc[category.name] = r.comment;
              }
              return acc;
            }, {}),
            isComplete: true,
            submittedAt: userRatings[0].createdAt
          }
        });
      }

      // Migrate Comments
      const comments = await prisma.evaluationComment.findMany({
        where: { submissionId: submission.id },
        include: { replies: true }
      });

      for (const comment of comments.filter(c => !c.parentId)) {
        const thread = await migratePeerComment(comment, peerSubmission.id);
        
        // Migrate replies
        for (const reply of comment.replies) {
          await migratePeerComment(reply, peerSubmission.id, thread.id);
        }
      }
    }
  }
}

function mapPhaseToState(phase: EvaluationPhase): SubmissionState {
  switch(phase) {
    case 'DISCUSSION': return 'DISCUSSION';
    case 'EVALUATION': return 'REVIEWING';
    default: return 'SUBMITTED';
  }
}
```

### Phase 2: Dual-Write (Woche 2)

```typescript
// Service Layer mit Dual-Write
@Injectable()
export class MigrationSubmissionService {
  async createSubmission(dto: CreateSubmissionDTO) {
    // Write to OLD system
    const oldSubmission = await this.createOldSubmission(dto);
    
    // Write to NEW system
    const newSubmission = await this.createNewSubmission(dto);
    
    // Log mapping
    await this.logMigrationMapping(oldSubmission.id, newSubmission.id);
    
    return oldSubmission; // Return old for compatibility
  }

  async addReview(submissionId: string, review: ReviewDTO) {
    // Parallel writes
    await Promise.all([
      this.addOldReview(submissionId, review),
      this.addNewReview(submissionId, review)
    ]);
  }
}
```

### Phase 3: Read Migration (Woche 3)

```typescript
// Feature Flag basierte Migration
@Injectable()
export class SubmissionService {
  constructor(
    @Inject('FEATURE_FLAGS') private flags: FeatureFlags
  ) {}

  async getSubmission(id: string) {
    if (this.flags.useNewSchema) {
      return this.getNewSubmission(id);
    }
    return this.getOldSubmission(id);
  }

  private async getNewSubmission(id: string) {
    const submission = await this.prisma.peerReviewSubmission.findUnique({
      where: { id },
      include: {
        reviews: true,
        comments: {
          where: { parentId: null },
          include: { replies: true }
        }
      }
    });

    // Transform to DTO
    return this.mapToDTO(submission);
  }
}
```

### Phase 4: Cleanup (Woche 4)

```sql
-- 1. Verify data integrity
SELECT COUNT(*) as old_submissions FROM evaluation_submissions;
SELECT COUNT(*) as new_submissions FROM peer_review_submissions;

-- 2. Backup old tables
CREATE TABLE backup_evaluation_sessions AS SELECT * FROM evaluation_sessions;
CREATE TABLE backup_evaluation_submissions AS SELECT * FROM evaluation_submissions;
-- etc...

-- 3. Drop old tables
DROP TABLE evaluation_comments CASCADE;
DROP TABLE evaluation_ratings CASCADE;
DROP TABLE evaluation_categories CASCADE;
DROP TABLE evaluation_submissions CASCADE;
DROP TABLE evaluation_sessions CASCADE;

-- 4. Remove old columns from Discussion
ALTER TABLE discussions DROP COLUMN evaluation_submission_id;
ALTER TABLE discussions DROP COLUMN evaluation_category_id;
```

---

## 💻 Code-Änderungen

### Backend Services

#### SubmissionStateService.ts
```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionState } from '@prisma/client';

interface StateConfig {
  next: SubmissionState[];
  guard: (submission: any) => boolean;
  onEnter?: (submission: any) => Promise<void>;
  onExit?: (submission: any) => Promise<void>;
}

@Injectable()
export class SubmissionStateService {
  private readonly stateMachine: Record<SubmissionState, StateConfig> = {
    DRAFT: {
      next: [SubmissionState.SUBMITTED],
      guard: (s) => s.pdfFileId !== null && s.title?.length > 0,
      onExit: async (s) => {
        await this.notificationService.notifySubmissionCreated(s.id);
      }
    },
    SUBMITTED: {
      next: [SubmissionState.ASSIGNING_REVIEWERS],
      guard: (s) => true,
      onEnter: async (s) => {
        await this.assignReviewers(s.id);
      }
    },
    ASSIGNING_REVIEWERS: {
      next: [SubmissionState.REVIEWING],
      guard: (s) => s.assignments?.length >= s.minReviewers,
      onExit: async (s) => {
        await this.notifyReviewersAssigned(s.id);
      }
    },
    REVIEWING: {
      next: [SubmissionState.DISCUSSION, SubmissionState.FINALIZING],
      guard: (s) => {
        const completeReviews = s.reviews?.filter(r => r.isComplete) || [];
        return completeReviews.length >= s.minReviewers;
      }
    },
    DISCUSSION: {
      next: [SubmissionState.FINALIZING],
      guard: (s) => {
        // Check if discussion period is over
        const discussionDays = 7;
        const discussionStart = s.stateData?.enteredAt;
        if (!discussionStart) return false;
        
        const daysPassed = (Date.now() - new Date(discussionStart).getTime()) / (1000 * 60 * 60 * 24);
        return daysPassed >= discussionDays;
      }
    },
    FINALIZING: {
      next: [SubmissionState.COMPLETED],
      guard: (s) => true,
      onEnter: async (s) => {
        await this.calculateFinalScores(s.id);
      }
    },
    COMPLETED: {
      next: [SubmissionState.ARCHIVED],
      guard: (s) => true,
      onEnter: async (s) => {
        await this.notifyCompletion(s.id);
      }
    },
    ARCHIVED: {
      next: [],
      guard: (s) => false
    }
  };

  async transition(
    submissionId: string, 
    targetState: SubmissionState,
    triggeredBy: number
  ): Promise<PeerReviewSubmission> {
    const submission = await this.prisma.peerReviewSubmission.findUnique({
      where: { id: submissionId },
      include: {
        reviews: true,
        assignments: true
      }
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    const currentConfig = this.stateMachine[submission.state];
    
    // Validate transition
    if (!currentConfig.next.includes(targetState)) {
      throw new BadRequestException(
        `Invalid transition: ${submission.state} -> ${targetState}. ` +
        `Valid transitions: ${currentConfig.next.join(', ')}`
      );
    }

    // Check guard
    if (!currentConfig.guard(submission)) {
      throw new BadRequestException(
        `State transition requirements not met for ${submission.state} -> ${targetState}`
      );
    }

    // Execute exit hook
    if (currentConfig.onExit) {
      await currentConfig.onExit(submission);
    }

    // Update state
    const updatedSubmission = await this.prisma.peerReviewSubmission.update({
      where: { id: submissionId },
      data: {
        state: targetState,
        stateData: {
          ...submission.stateData,
          [`${submission.state}_exitedAt`]: new Date(),
          [`${targetState}_enteredAt`]: new Date(),
          lastTransition: {
            from: submission.state,
            to: targetState,
            triggeredBy,
            at: new Date()
          }
        }
      }
    });

    // Execute enter hook
    const newConfig = this.stateMachine[targetState];
    if (newConfig.onEnter) {
      await newConfig.onEnter(updatedSubmission);
    }

    // Log state change
    await this.auditLog.log({
      event: 'SUBMISSION_STATE_CHANGE',
      submissionId,
      from: submission.state,
      to: targetState,
      triggeredBy
    });

    return updatedSubmission;
  }

  async getAvailableTransitions(submissionId: string): Promise<SubmissionState[]> {
    const submission = await this.prisma.peerReviewSubmission.findUnique({
      where: { id: submissionId },
      include: { reviews: true, assignments: true }
    });

    if (!submission) return [];

    const config = this.stateMachine[submission.state];
    return config.next.filter(state => {
      const targetConfig = this.stateMachine[state];
      return !targetConfig.guard || targetConfig.guard(submission);
    });
  }
}
```

#### PeerReviewService.ts
```typescript
@Injectable()
export class PeerReviewService {
  async submitReview(
    submissionId: string,
    reviewerId: number,
    dto: SubmitReviewDTO
  ): Promise<PeerReview> {
    // Validate submission exists and is in correct state
    const submission = await this.prisma.peerReviewSubmission.findUnique({
      where: { id: submissionId },
      include: { reviews: true }
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.state !== 'REVIEWING' && submission.state !== 'DISCUSSION') {
      throw new BadRequestException(
        `Cannot submit review in state: ${submission.state}`
      );
    }

    // Validate reviewer is assigned
    const assignment = await this.prisma.reviewAssignment.findUnique({
      where: {
        submissionId_reviewerId: {
          submissionId,
          reviewerId
        }
      }
    });

    if (!assignment) {
      throw new ForbiddenException('You are not assigned to review this submission');
    }

    // Validate ratings match criteria
    const criteriaIds = submission.criteria.map(c => c.id);
    const ratingIds = Object.keys(dto.ratings);
    
    const missingRatings = criteriaIds.filter(id => !ratingIds.includes(id));
    if (missingRatings.length > 0) {
      throw new BadRequestException(
        `Missing ratings for criteria: ${missingRatings.join(', ')}`
      );
    }

    // Create or update review
    const review = await this.prisma.peerReview.upsert({
      where: {
        submissionId_reviewerId: {
          submissionId,
          reviewerId
        }
      },
      create: {
        submissionId,
        reviewerId,
        ratings: dto.ratings,
        feedback: dto.feedback,
        overallComment: dto.overallComment,
        isDraft: false,
        isComplete: true,
        submittedAt: new Date(),
        anonymousName: await this.generateAnonymousName(submissionId, reviewerId)
      },
      update: {
        ratings: dto.ratings,
        feedback: dto.feedback,
        overallComment: dto.overallComment,
        isDraft: false,
        isComplete: true,
        submittedAt: new Date()
      }
    });

    // Update assignment status
    await this.prisma.reviewAssignment.update({
      where: {
        submissionId_reviewerId: {
          submissionId,
          reviewerId
        }
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Update submission statistics
    await this.updateSubmissionStats(submissionId);

    // Check if we should auto-transition state
    await this.checkAutoTransition(submissionId);

    return review;
  }

  private async updateSubmissionStats(submissionId: string) {
    const reviews = await this.prisma.peerReview.findMany({
      where: {
        submissionId,
        isComplete: true
      }
    });

    if (reviews.length === 0) return;

    // Calculate average rating
    const allRatings = reviews.flatMap(r => Object.values(r.ratings));
    const avgRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;

    await this.prisma.peerReviewSubmission.update({
      where: { id: submissionId },
      data: {
        reviewCount: reviews.length,
        avgRating,
        lastActivity: new Date()
      }
    });
  }

  private async checkAutoTransition(submissionId: string) {
    const submission = await this.prisma.peerReviewSubmission.findUnique({
      where: { id: submissionId },
      include: { reviews: true }
    });

    const completeReviews = submission.reviews.filter(r => r.isComplete);
    
    if (submission.state === 'REVIEWING' && 
        completeReviews.length >= submission.minReviewers) {
      try {
        await this.stateService.transition(
          submissionId,
          'DISCUSSION',
          0 // System user
        );
      } catch (e) {
        // Log but don't fail
        this.logger.warn(`Auto-transition failed: ${e.message}`);
      }
    }
  }
}
```

### Frontend Services

#### peer-review.service.ts
```typescript
@Injectable({
  providedIn: 'root'
})
export class PeerReviewService {
  private readonly apiUrl = `${environment.server}/peer-reviews`;

  constructor(private http: HttpClient) {}

  // Simplified API without session references
  getSubmission(id: string): Observable<PeerReviewSubmissionDTO> {
    return this.http.get<PeerReviewSubmissionDTO>(
      `${this.apiUrl}/submissions/${id}`
    );
  }

  getMySubmissions(): Observable<PeerReviewSubmissionDTO[]> {
    return this.http.get<PeerReviewSubmissionDTO[]>(
      `${this.apiUrl}/submissions/my`
    );
  }

  getAssignedReviews(): Observable<ReviewAssignmentDTO[]> {
    return this.http.get<ReviewAssignmentDTO[]>(
      `${this.apiUrl}/assignments/my`
    );
  }

  submitReview(
    submissionId: string,
    review: SubmitReviewDTO
  ): Observable<PeerReviewDTO> {
    return this.http.post<PeerReviewDTO>(
      `${this.apiUrl}/submissions/${submissionId}/reviews`,
      review
    );
  }

  // Comments API (separated from Discussion)
  getComments(
    submissionId: string,
    criteriaId?: string
  ): Observable<PeerCommentDTO[]> {
    const params = criteriaId ? { criteriaId } : {};
    return this.http.get<PeerCommentDTO[]>(
      `${this.apiUrl}/submissions/${submissionId}/comments`,
      { params }
    );
  }

  postComment(
    submissionId: string,
    comment: CreatePeerCommentDTO
  ): Observable<PeerCommentDTO> {
    return this.http.post<PeerCommentDTO>(
      `${this.apiUrl}/submissions/${submissionId}/comments`,
      comment
    );
  }

  // State transitions
  getAvailableTransitions(submissionId: string): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.apiUrl}/submissions/${submissionId}/transitions`
    );
  }

  transitionState(
    submissionId: string,
    targetState: SubmissionState
  ): Observable<PeerReviewSubmissionDTO> {
    return this.http.post<PeerReviewSubmissionDTO>(
      `${this.apiUrl}/submissions/${submissionId}/transition`,
      { targetState }
    );
  }
}
```

### DTOs

#### peer-review.dto.ts
```typescript
export interface PeerReviewSubmissionDTO {
  id: string;
  title: string;
  description?: string;
  
  // Direct references (no session!)
  moduleId: number;
  module?: ModuleDTO;
  authorId: number;
  author?: UserDTO;
  pdfFileId: number;
  pdfUrl?: string;
  
  // State
  state: SubmissionState;
  stateData?: Record<string, any>;
  
  // Criteria (embedded)
  criteria: CriteriaDTO[];
  
  // Stats
  reviewCount: number;
  avgRating?: number;
  lastActivity: Date;
  
  // Relations
  reviews?: PeerReviewDTO[];
  comments?: PeerCommentDTO[];
  assignments?: ReviewAssignmentDTO[];
  
  // Timestamps
  submittedAt?: Date;
  reviewDeadline?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CriteriaDTO {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  weight: number;
  icon?: string;
  color?: string;
  order: number;
}

export interface PeerReviewDTO {
  id: string;
  submissionId: string;
  reviewerId: number;
  reviewer?: UserDTO;
  
  // Ratings per criteria
  ratings: Record<string, number>; // { "completeness": 8, "quality": 7 }
  
  // Feedback per criteria
  feedback: Record<string, string>; // { "completeness": "Good but..." }
  
  overallComment?: string;
  
  // Status
  isDraft: boolean;
  isComplete: boolean;
  isAnonymous: boolean;
  anonymousName?: string;
  
  // Timestamps
  startedAt: Date;
  submittedAt?: Date;
  lastEditedAt: Date;
}

export interface PeerCommentDTO {
  id: string;
  submissionId: string;
  userId: number;
  user?: UserDTO;
  
  // Threading
  threadId?: string;
  parentId?: string;
  replies?: PeerCommentDTO[];
  
  // Content
  criteriaId?: string;
  content: string;
  
  // Voting
  upvotes: number;
  downvotes: number;
  userVote?: 'UP' | 'DOWN' | null;
  
  // Metadata
  isAnonymous: boolean;
  anonymousName?: string;
  isInitialReview: boolean;
  isPinned: boolean;
  isResolved: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
}

export type SubmissionState = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ASSIGNING_REVIEWERS'
  | 'REVIEWING'
  | 'DISCUSSION'
  | 'FINALIZING'
  | 'COMPLETED'
  | 'ARCHIVED';
```

---

## ⚠️ Risiken und Mitigationen

### Risiko 1: Datenverlust bei Migration
**Mitigation:**
- Vollständige Backups vor jeder Phase
- Dual-Write für 2 Wochen
- Rollback-Scripts vorbereitet

### Risiko 2: Performance-Degradation
**Mitigation:**
- Materialized Views für häufige Queries
- JSON-Indizierung für criteria
- Caching-Layer (Redis)

### Risiko 3: Frontend-Inkompatibilität
**Mitigation:**
- API-Versionierung (v1 vs v2)
- Adapter-Layer für Übergangsphase
- Feature Flags für schrittweise Aktivierung

### Risiko 4: State Machine Deadlocks
**Mitigation:**
- Timeout für jede State
- Manual override für Admins
- Comprehensive logging

---

## 📅 Detaillierter Zeitplan

### Woche 1: Foundation
- **Tag 1-2**: Schema-Design finalisieren, Prisma-Models erstellen
- **Tag 3-4**: Migration-Scripts schreiben und testen
- **Tag 5**: State Machine Service implementieren

### Woche 2: Backend Implementation
- **Tag 1-2**: PeerReviewService implementieren
- **Tag 3**: CommentService implementieren
- **Tag 4**: REST-Controller erstellen
- **Tag 5**: Unit Tests schreiben

### Woche 3: Frontend Migration
- **Tag 1-2**: Services migrieren
- **Tag 3-4**: Components anpassen
- **Tag 5**: E2E Tests

### Woche 4: Data Migration & Testing
- **Tag 1**: Produktivdaten-Migration testen
- **Tag 2-3**: Dual-Write aktivieren
- **Tag 4**: Performance-Tests
- **Tag 5**: Go-Live Vorbereitung

### Woche 5: Cleanup
- **Tag 1-3**: Monitoring und Bugfixes
- **Tag 4**: Alte Tabellen deaktivieren
- **Tag 5**: Post-Mortem

---

## 🔄 Rollback-Strategie

```bash
# Rollback Script
#!/bin/bash

# 1. Stop application
pm2 stop hefl-backend

# 2. Restore database
psql -U postgres -d hefl < backup_pre_migration.sql

# 3. Revert code
git revert --no-commit HEAD~5..HEAD
git commit -m "Rollback: Peer Review Migration"

# 4. Restart with old schema
npm run prisma:generate
pm2 restart hefl-backend

# 5. Notify team
curl -X POST $SLACK_WEBHOOK -d '{"text":"⚠️ Rollback executed for Peer Review migration"}'
```

---

## ✅ Success Criteria

1. **Alle Daten migriert**: 100% der Sessions/Submissions übertragen
2. **Performance verbessert**: Query-Zeit < 100ms für Dashboard
3. **Keine Datenverluste**: Checksums vor/nach Migration identisch
4. **Frontend funktional**: Alle E2E Tests grün
5. **State Machine stabil**: Keine Deadlocks in 7 Tagen

---

## 📞 Kontakte & Verantwortlichkeiten

- **Lead Developer**: [Name] - Schema & Migration
- **Backend Team**: [Names] - Services & APIs
- **Frontend Team**: [Names] - UI Migration
- **DevOps**: [Name] - Deployment & Monitoring
- **QA**: [Name] - Testing & Validation

---

## 🔗 Referenzen

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [NestJS State Machine Pattern](https://docs.nestjs.com/recipes/state-machine)
- [PostgreSQL JSON Performance](https://www.postgresql.org/docs/current/datatype-json.html)
- [HEFL Architecture Docs](internal-link)

---

*Dokument Version: 1.0.0*
*Erstellt: [Datum]*
*Letzte Änderung: [Datum]*
*Status: DRAFT - Awaiting Review*