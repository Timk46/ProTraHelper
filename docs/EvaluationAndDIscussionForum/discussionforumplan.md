# Evaluation & Discussion Forum - Technischer Implementierungsplan

## 1. Projektübersicht

### 1.1 Zielsetzung
Die **Evaluation & Discussion Forum Component** ist eine spezialisierte Angular-Komponente zur strukturierten Bewertung und Diskussion von PDF-Abgaben im Rahmen des HEFL E-Learning Systems. Sie ermöglicht es Studierenden und Dozenten, eingereichte Arbeiten nach vier definierten Kategorien zu bewerten und zu diskutieren.

### 1.2 Hauptfunktionen
- **PDF-Viewer Integration**: Anzeige der bewerteten Arbeit direkt in der Komponente
- **Kategorisierte Diskussionen**: Vier separate Diskussionsstränge (Vollständigkeit, Grafische Darstellung, Vergleichbarkeit, Komplexität)
- **Voting-System**: Up-/Downvote-Funktionalität für alle Kommentare
- **Kommentar-Limitierung**: Tracking von verfügbaren/verwendeten Kommentaren pro Benutzer
- **Real-time Updates**: Live-Aktualisierung von Diskussionen über WebSockets
- **Anonyme Teilnahme**: Unterstützung für anonyme Diskussionsteilnehmer

## 2. Technische Architektur

### 2.1 Verzeichnisstruktur
```
client_angular/src/app/Pages/evaluation-discussion-forum/
├── evaluation-discussion-forum.component.ts       # Smart Component
├── evaluation-discussion-forum.component.html     # Haupttemplate
├── evaluation-discussion-forum.component.scss     # Styling
├── evaluation-discussion-forum.component.spec.ts  # Tests
├── evaluation-discussion-forum.module.ts          # Feature Module
├── evaluation-discussion-forum-routing.module.ts  # Routing Config
├── components/                                    # Dumb Components
│   ├── category-tabs/
│   │   ├── category-tabs.component.ts
│   │   ├── category-tabs.component.html
│   │   ├── category-tabs.component.scss
│   │   └── category-tabs.component.spec.ts
│   ├── discussion-thread/
│   │   ├── discussion-thread.component.ts
│   │   ├── discussion-thread.component.html
│   │   ├── discussion-thread.component.scss
│   │   └── discussion-thread.component.spec.ts
│   ├── comment-item/
│   │   ├── comment-item.component.ts
│   │   ├── comment-item.component.html
│   │   ├── comment-item.component.scss
│   │   └── comment-item.component.spec.ts
│   ├── vote-box/
│   │   ├── vote-box.component.ts
│   │   ├── vote-box.component.html
│   │   ├── vote-box.component.scss
│   │   └── vote-box.component.spec.ts
│   ├── comment-input/
│   │   ├── comment-input.component.ts
│   │   ├── comment-input.component.html
│   │   ├── comment-input.component.scss
│   │   └── comment-input.component.spec.ts
│   └── pdf-viewer-panel/
│       ├── pdf-viewer-panel.component.ts
│       ├── pdf-viewer-panel.component.html
│       ├── pdf-viewer-panel.component.scss
│       └── pdf-viewer-panel.component.spec.ts
├── services/
│   ├── evaluation-discussion.service.ts
│   ├── evaluation-discussion.service.spec.ts
│   ├── evaluation-state.service.ts
│   └── evaluation-state.service.spec.ts
├── guards/
│   ├── evaluation-access.guard.ts
│   └── evaluation-access.guard.spec.ts
└── models/
    └── evaluation-models.ts
```

### 2.2 Komponenten-Hierarchie

```
EvaluationDiscussionForumComponent (Smart)
├── PdfViewerPanelComponent (Dumb)
└── Discussion Panel Container
    ├── CategoryTabsComponent (Dumb)
    └── DiscussionThreadComponent (Dumb)
        ├── CommentItemComponent (Dumb)
        │   └── VoteBoxComponent (Dumb)
        └── CommentInputComponent (Dumb)
```

## 3. Detaillierte Komponentenspezifikation

### 3.1 Smart Component: EvaluationDiscussionForumComponent

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { takeUntil, switchMap, map, filter } from 'rxjs/operators';

@Component({
  selector: 'app-evaluation-discussion-forum',
  templateUrl: './evaluation-discussion-forum.component.html',
  styleUrls: ['./evaluation-discussion-forum.component.scss']
})
export class EvaluationDiscussionForumComponent implements OnInit, OnDestroy {
  // Lifecycle
  private destroy$ = new Subject<void>();
  
  // State Observables
  submission$: Observable<EvaluationSubmissionDTO>;
  categories$: Observable<EvaluationCategoryDTO[]>;
  activeCategory$ = new BehaviorSubject<string>('vollstaendigkeit');
  currentUser$: Observable<UserDTO>;
  anonymousUser$: Observable<AnonymousUserDTO | null>;
  
  // Combined State
  activeDiscussions$: Observable<EvaluationDiscussionDTO[]>;
  commentStats$: Observable<CommentStatsDTO>;
  
  // UI State
  isLoading$ = new BehaviorSubject<boolean>(true);
  error$ = new BehaviorSubject<string | null>(null);
  pdfPageNumber$ = new BehaviorSubject<number>(1);
  
  constructor(
    private route: ActivatedRoute,
    private evaluationService: EvaluationDiscussionService,
    private evaluationState: EvaluationStateService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}
  
  ngOnInit(): void {
    // Initialize submission data
    this.submission$ = this.route.params.pipe(
      map(params => params['submissionId']),
      filter(id => !!id),
      switchMap(id => this.evaluationService.getSubmission(id)),
      takeUntil(this.destroy$)
    );
    
    // Setup categories
    this.categories$ = this.evaluationService.getCategories();
    
    // Setup current user
    this.currentUser$ = this.authService.currentUser$;
    
    // Setup anonymous user for this discussion
    this.anonymousUser$ = this.submission$.pipe(
      switchMap(submission => 
        this.evaluationService.getOrCreateAnonymousUser(submission.id)
      )
    );
    
    // Setup active discussions based on category
    this.activeDiscussions$ = combineLatest([
      this.submission$,
      this.activeCategory$
    ]).pipe(
      switchMap(([submission, category]) => 
        this.evaluationState.getDiscussionsForCategory(submission.id, category)
      ),
      takeUntil(this.destroy$)
    );
    
    // Setup comment statistics
    this.commentStats$ = this.submission$.pipe(
      switchMap(submission => 
        this.evaluationService.getCommentStats(submission.id)
      )
    );
    
    // Initialize WebSocket connection for real-time updates
    this.initializeRealtimeUpdates();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // Category Management
  onCategoryChange(category: string): void {
    this.activeCategory$.next(category);
  }
  
  // Comment Submission
  onCommentSubmit(content: string): void {
    combineLatest([
      this.submission$,
      this.activeCategory$,
      this.anonymousUser$
    ]).pipe(
      take(1),
      switchMap(([submission, category, anonymousUser]) => {
        const comment: CreateCommentDTO = {
          submissionId: submission.id,
          category,
          content,
          anonymousUserId: anonymousUser?.id
        };
        return this.evaluationService.createComment(comment);
      })
    ).subscribe({
      next: (comment) => {
        // Comment will be added via WebSocket update
        this.notificationService.showSuccess('Kommentar erfolgreich hinzugefügt');
      },
      error: (error) => {
        this.error$.next('Fehler beim Hinzufügen des Kommentars');
      }
    });
  }
  
  // Voting
  onVote(commentId: string, vote: 'up' | 'down' | null): void {
    this.evaluationService.voteComment(commentId, vote).subscribe({
      next: (result) => {
        // Vote will be updated via WebSocket
      },
      error: (error) => {
        this.error$.next('Fehler beim Abstimmen');
      }
    });
  }
  
  // PDF Navigation
  onPdfPageChange(page: number): void {
    this.pdfPageNumber$.next(page);
  }
  
  // Real-time Updates
  private initializeRealtimeUpdates(): void {
    this.submission$.pipe(
      switchMap(submission => 
        this.evaluationService.subscribeToDiscussionUpdates(submission.id)
      ),
      takeUntil(this.destroy$)
    ).subscribe(update => {
      this.evaluationState.handleRealtimeUpdate(update);
    });
  }
}
```

### 3.2 Dumb Components Spezifikation

#### 3.2.1 CategoryTabsComponent

```typescript
@Component({
  selector: 'app-category-tabs',
  templateUrl: './category-tabs.component.html',
  styleUrls: ['./category-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryTabsComponent {
  @Input() categories: EvaluationCategoryDTO[] = [];
  @Input() activeCategory: string = '';
  @Input() commentStats: CommentStatsDTO | null = null;
  @Output() categoryChanged = new EventEmitter<string>();
  
  getCategoryStats(categoryId: string): CategoryStats | undefined {
    return this.commentStats?.categories.find(c => c.categoryId === categoryId);
  }
  
  onTabClick(categoryId: string): void {
    if (categoryId !== this.activeCategory) {
      this.categoryChanged.emit(categoryId);
    }
  }
}
```

Template:
```html
<mat-tab-group 
  [selectedIndex]="getSelectedIndex()" 
  (selectedIndexChange)="onTabChange($event)"
  class="category-tabs"
  mat-align-tabs="start">
  
  <mat-tab *ngFor="let category of categories" [label]="category.displayName">
    <ng-template mat-tab-label>
      <div class="tab-label" 
           [attr.aria-label]="'Kategorie: ' + category.displayName + ', ' + getCategoryStats(category.id)?.usedComments + ' von ' + getCategoryStats(category.id)?.availableComments + ' Kommentaren verwendet'">
        <mat-icon class="category-icon">{{ category.icon }}</mat-icon>
        <span>{{ category.displayName }}</span>
        <mat-chip-listbox class="comment-stats" *ngIf="getCategoryStats(category.id) as stats">
          <mat-chip 
            [class.limit-reached]="stats.usedComments >= stats.availableComments"
            matTooltip="Verwendete/Verfügbare Kommentare">
            <span class="used">{{ stats.usedComments }}</span>
            <span class="divider">/</span>
            <span class="available">{{ stats.availableComments }}</span>
          </mat-chip>
        </mat-chip-listbox>
      </div>
    </ng-template>
  </mat-tab>
</mat-tab-group>
```

#### 3.2.2 DiscussionThreadComponent

```typescript
@Component({
  selector: 'app-discussion-thread',
  templateUrl: './discussion-thread.component.html',
  styleUrls: ['./discussion-thread.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiscussionThreadComponent implements OnInit {
  @Input() discussions: EvaluationDiscussionDTO[] = [];
  @Input() currentUser: UserDTO | null = null;
  @Input() anonymousUser: AnonymousUserDTO | null = null;
  @Input() category: string = '';
  @Output() commentSubmitted = new EventEmitter<string>();
  @Output() voteChanged = new EventEmitter<{commentId: string, vote: VoteType}>();
  
  // Virtual Scrolling
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;
  
  trackByFn(index: number, item: EvaluationCommentDTO): string {
    return item.id;
  }
  
  isAuthor(comment: EvaluationCommentDTO): boolean {
    if (this.currentUser && comment.author.type === 'user') {
      return comment.author.id === this.currentUser.id;
    }
    if (this.anonymousUser && comment.author.type === 'anonymous') {
      return comment.author.id === this.anonymousUser.id;
    }
    return false;
  }
  
  onCommentSubmit(content: string): void {
    this.commentSubmitted.emit(content);
  }
  
  onVote(commentId: string, vote: VoteType): void {
    this.voteChanged.emit({ commentId, vote });
  }
}
```

#### 3.2.3 CommentItemComponent

```typescript
@Component({
  selector: 'app-comment-item',
  templateUrl: './comment-item.component.html',
  styleUrls: ['./comment-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentItemComponent {
  @Input() comment!: EvaluationCommentDTO;
  @Input() isAuthor: boolean = false;
  @Output() voteChanged = new EventEmitter<VoteType>();
  
  get authorName(): string {
    if (this.comment.author.type === 'user') {
      return `${this.comment.author.firstname} ${this.comment.author.lastname}`;
    }
    return this.comment.author.displayName || 'Anonym';
  }
  
  get formattedDate(): string {
    const date = new Date(this.comment.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `vor ${Math.floor(diffInHours)} Stunden`;
    }
    return date.toLocaleDateString('de-DE');
  }
  
  onVote(vote: VoteType): void {
    this.voteChanged.emit(vote);
  }
}
```

#### 3.2.4 VoteBoxComponent

```typescript
@Component({
  selector: 'app-vote-box',
  templateUrl: './vote-box.component.html',
  styleUrls: ['./vote-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VoteBoxComponent {
  @Input() upvotes: number = 0;
  @Input() downvotes: number = 0;
  @Input() userVote: VoteType = null;
  @Output() voteChanged = new EventEmitter<VoteType>();
  
  // Optimistic UI Update
  private pendingVote: VoteType = null;
  
  get displayUpvotes(): number {
    if (this.pendingVote === 'up' && this.userVote !== 'up') return this.upvotes + 1;
    if (this.pendingVote !== 'up' && this.userVote === 'up') return this.upvotes - 1;
    return this.upvotes;
  }
  
  get displayDownvotes(): number {
    if (this.pendingVote === 'down' && this.userVote !== 'down') return this.downvotes + 1;
    if (this.pendingVote !== 'down' && this.userVote === 'down') return this.downvotes - 1;
    return this.downvotes;
  }
  
  onVote(vote: 'up' | 'down'): void {
    const newVote = this.userVote === vote ? null : vote;
    this.pendingVote = newVote;
    this.voteChanged.emit(newVote);
  }
}
```

Template:
```html
<div class="vote-box" role="group" aria-label="Bewertung">
  <mat-button-toggle-group 
    vertical="true" 
    [value]="userVote"
    (change)="onVote($event.value)"
    class="vote-buttons">
    
    <mat-button-toggle 
      value="up" 
      class="vote-up"
      [attr.aria-label]="'Positive Bewertung (' + displayUpvotes + ')'"
      matRipple
      matTooltip="Positiv bewerten">
      <mat-icon>thumb_up</mat-icon>
      <span class="vote-count">{{ displayUpvotes }}</span>
    </mat-button-toggle>
    
    <mat-button-toggle 
      value="down" 
      class="vote-down"
      [attr.aria-label]="'Negative Bewertung (' + displayDownvotes + ')'"
      matRipple
      matTooltip="Negativ bewerten">
      <mat-icon>thumb_down</mat-icon>
      <span class="vote-count">{{ displayDownvotes }}</span>
    </mat-button-toggle>
    
  </mat-button-toggle-group>
</div>
```

#### 3.2.5 CommentInputComponent

```typescript
@Component({
  selector: 'app-comment-input',
  templateUrl: './comment-input.component.html',
  styleUrls: ['./comment-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentInputComponent implements OnInit {
  @Input() placeholder: string = 'Schreiben Sie einen Kommentar...';
  @Input() maxLength: number = 1000;
  @Input() showRichTextEditor: boolean = false;
  @Output() commentSubmitted = new EventEmitter<string>();
  
  form: FormGroup;
  charactersRemaining$: Observable<number>;
  
  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(this.maxLength)]]
    });
  }
  
  ngOnInit(): void {
    this.charactersRemaining$ = this.form.get('content')!.valueChanges.pipe(
      startWith(''),
      map(value => this.maxLength - (value?.length || 0))
    );
  }
  
  onSubmit(): void {
    if (this.form.valid) {
      const content = this.form.get('content')!.value.trim();
      if (content) {
        this.commentSubmitted.emit(content);
        this.form.reset();
      }
    }
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
    }
  }
}
```

## 4. Service Layer

### 4.1 EvaluationDiscussionService

```typescript
@Injectable({ providedIn: 'root' })
export class EvaluationDiscussionService {
  private apiUrl = '/api/evaluation-discussion';
  
  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}
  
  // Core API Methods
  getSubmission(submissionId: string): Observable<EvaluationSubmissionDTO> {
    return this.http.get<EvaluationSubmissionDTO>(`${this.apiUrl}/submissions/${submissionId}`);
  }
  
  getCategories(): Observable<EvaluationCategoryDTO[]> {
    return this.http.get<EvaluationCategoryDTO[]>(`${this.apiUrl}/categories`);
  }
  
  getDiscussionsByCategory(
    submissionId: string, 
    category: string
  ): Observable<EvaluationDiscussionDTO[]> {
    return this.http.get<EvaluationDiscussionDTO[]>(
      `${this.apiUrl}/submissions/${submissionId}/discussions/${category}`
    );
  }
  
  createComment(comment: CreateCommentDTO): Observable<EvaluationCommentDTO> {
    return this.http.post<EvaluationCommentDTO>(
      `${this.apiUrl}/comments`,
      comment
    );
  }
  
  voteComment(commentId: string, vote: VoteType): Observable<VoteResultDTO> {
    return this.http.post<VoteResultDTO>(
      `${this.apiUrl}/comments/${commentId}/vote`,
      { vote }
    );
  }
  
  getCommentStats(submissionId: string): Observable<CommentStatsDTO> {
    return this.http.get<CommentStatsDTO>(
      `${this.apiUrl}/submissions/${submissionId}/stats`
    );
  }
  
  // Anonymous User Management
  getOrCreateAnonymousUser(submissionId: string): Observable<AnonymousUserDTO> {
    return this.http.post<AnonymousUserDTO>(
      `${this.apiUrl}/anonymous-users`,
      { submissionId }
    );
  }
  
  // Real-time Updates
  subscribeToDiscussionUpdates(submissionId: string): Observable<DiscussionUpdateDTO> {
    return this.notificationService.socket$.pipe(
      filter(notification => 
        notification.type === 'evaluation-discussion-update' &&
        notification.data.submissionId === submissionId
      ),
      map(notification => notification.data as DiscussionUpdateDTO)
    );
  }
}
```

### 4.2 EvaluationStateService

```typescript
@Injectable({ providedIn: 'root' })
export class EvaluationStateService {
  // State Management with Caching
  private discussionCache = new Map<string, BehaviorSubject<EvaluationDiscussionDTO[]>>();
  private statsCache = new Map<string, BehaviorSubject<CommentStatsDTO>>();
  
  constructor(private evaluationService: EvaluationDiscussionService) {}
  
  getDiscussionsForCategory(
    submissionId: string, 
    category: string
  ): Observable<EvaluationDiscussionDTO[]> {
    const cacheKey = `${submissionId}-${category}`;
    
    if (!this.discussionCache.has(cacheKey)) {
      const subject = new BehaviorSubject<EvaluationDiscussionDTO[]>([]);
      this.discussionCache.set(cacheKey, subject);
      
      // Initial load
      this.evaluationService.getDiscussionsByCategory(submissionId, category)
        .subscribe(discussions => subject.next(discussions));
    }
    
    return this.discussionCache.get(cacheKey)!.asObservable();
  }
  
  handleRealtimeUpdate(update: DiscussionUpdateDTO): void {
    const cacheKey = `${update.submissionId}-${update.category}`;
    const subject = this.discussionCache.get(cacheKey);
    
    if (!subject) return;
    
    const currentDiscussions = subject.value;
    
    switch (update.action) {
      case 'comment-added':
        this.addComment(currentDiscussions, update.comment);
        break;
      case 'comment-updated':
        this.updateComment(currentDiscussions, update.comment);
        break;
      case 'vote-changed':
        this.updateVote(currentDiscussions, update.commentId, update.voteData);
        break;
    }
    
    subject.next([...currentDiscussions]);
  }
  
  private addComment(
    discussions: EvaluationDiscussionDTO[], 
    comment: EvaluationCommentDTO
  ): void {
    // Find or create discussion thread
    let discussion = discussions.find(d => d.id === comment.discussionId);
    
    if (!discussion) {
      discussion = {
        id: comment.discussionId,
        category: comment.category,
        comments: [],
        availableComments: 0,
        usedComments: 0
      };
      discussions.push(discussion);
    }
    
    discussion.comments.push(comment);
    discussion.comments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  private updateComment(
    discussions: EvaluationDiscussionDTO[], 
    updatedComment: EvaluationCommentDTO
  ): void {
    for (const discussion of discussions) {
      const index = discussion.comments.findIndex(c => c.id === updatedComment.id);
      if (index !== -1) {
        discussion.comments[index] = updatedComment;
        break;
      }
    }
  }
  
  private updateVote(
    discussions: EvaluationDiscussionDTO[], 
    commentId: string,
    voteData: VoteUpdateData
  ): void {
    for (const discussion of discussions) {
      const comment = discussion.comments.find(c => c.id === commentId);
      if (comment) {
        comment.upvotes = voteData.upvotes;
        comment.downvotes = voteData.downvotes;
        comment.userVote = voteData.userVote;
        break;
      }
    }
  }
}
```

## 5. Data Transfer Objects (DTOs)

```typescript
// shared/dtos/evaluation-discussion.dto.ts

export interface EvaluationSubmissionDTO {
  id: string;
  title: string;
  author: UserDTO;
  pdfUrl: string;
  pdfMetadata: {
    pageCount: number;
    fileSize: number;
  };
  moduleId: string;
  status: 'draft' | 'submitted' | 'in-review' | 'discussion' | 'completed';
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationCategoryDTO {
  id: string;
  name: string;
  displayName: string;
  description: string;
  order: number;
  icon: string; // Material Icons: 'check_circle' | 'palette' | 'compare' | 'settings'
}

export interface EvaluationDiscussionDTO {
  id: string;
  category: string;
  comments: EvaluationCommentDTO[];
  availableComments: number;
  usedComments: number;
}

export interface EvaluationCommentDTO {
  id: string;
  discussionId: string;
  category: string;
  author: AuthorDTO;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  upvotes: number;
  downvotes: number;
  replyCount: number;
  userVote?: VoteType;
  parentId?: string;
  replies?: EvaluationCommentDTO[];
}

export interface AuthorDTO {
  id: string;
  type: 'user' | 'anonymous';
  displayName: string;
  firstname?: string;
  lastname?: string;
  avatar?: string;
}

export interface CreateCommentDTO {
  submissionId: string;
  category: string;
  content: string;
  anonymousUserId?: string;
  parentId?: string;
}

export interface CommentStatsDTO {
  submissionId: string;
  totalAvailable: number;
  totalUsed: number;
  categories: CategoryStats[];
}

export interface CategoryStats {
  categoryId: string;
  availableComments: number;
  usedComments: number;
}

export interface VoteResultDTO {
  commentId: string;
  upvotes: number;
  downvotes: number;
  userVote: VoteType;
}

export interface DiscussionUpdateDTO {
  action: 'comment-added' | 'comment-updated' | 'vote-changed';
  submissionId: string;
  category: string;
  comment?: EvaluationCommentDTO;
  commentId?: string;
  voteData?: VoteUpdateData;
}

export interface VoteUpdateData {
  upvotes: number;
  downvotes: number;
  userVote?: VoteType;
}

export type VoteType = 'up' | 'down' | null;
```

## 6. Routing Configuration

```typescript
// evaluation-discussion-forum-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EvaluationDiscussionForumComponent } from './evaluation-discussion-forum.component';
import { AuthGuard } from '@app/Guards/auth.guard';
import { EvaluationAccessGuard } from './guards/evaluation-access.guard';

const routes: Routes = [
  {
    path: ':submissionId',
    component: EvaluationDiscussionForumComponent,
    canActivate: [AuthGuard, EvaluationAccessGuard],
    data: {
      title: 'Bewertung & Diskussion',
      breadcrumb: 'Bewertung'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EvaluationDiscussionForumRoutingModule { }
```

## 7. Module Configuration

```typescript
// evaluation-discussion-forum.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';

// Angular Flex Layout
import { FlexLayoutModule } from '@angular/flex-layout';

// CDK
import { ScrollingModule } from '@angular/cdk/scrolling';

// Third Party
import { PdfViewerModule } from 'ng2-pdf-viewer';

// Routing
import { EvaluationDiscussionForumRoutingModule } from './evaluation-discussion-forum-routing.module';

// Components
import { EvaluationDiscussionForumComponent } from './evaluation-discussion-forum.component';
import { CategoryTabsComponent } from './components/category-tabs/category-tabs.component';
import { DiscussionThreadComponent } from './components/discussion-thread/discussion-thread.component';
import { CommentItemComponent } from './components/comment-item/comment-item.component';
import { VoteBoxComponent } from './components/vote-box/vote-box.component';
import { CommentInputComponent } from './components/comment-input/comment-input.component';
import { PdfViewerPanelComponent } from './components/pdf-viewer-panel/pdf-viewer-panel.component';

// Services
import { EvaluationDiscussionService } from './services/evaluation-discussion.service';
import { EvaluationStateService } from './services/evaluation-state.service';

// Guards
import { EvaluationAccessGuard } from './guards/evaluation-access.guard';

// Shared Modules
import { SharedModule } from '@app/shared/shared.module';

@NgModule({
  declarations: [
    EvaluationDiscussionForumComponent,
    CategoryTabsComponent,
    DiscussionThreadComponent,
    CommentItemComponent,
    VoteBoxComponent,
    CommentInputComponent,
    PdfViewerPanelComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    EvaluationDiscussionForumRoutingModule,
    
    // Material
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatChipsModule,
    MatListModule,
    MatDividerModule,
    MatExpansionModule,
    MatButtonToggleModule,
    MatToolbarModule,
    MatBottomSheetModule,
    
    // Flex Layout
    FlexLayoutModule,
    
    // CDK
    ScrollingModule,
    
    // Third Party
    PdfViewerModule,
    
    // Shared
    SharedModule
  ],
  providers: [
    EvaluationDiscussionService,
    EvaluationStateService,
    EvaluationAccessGuard
  ]
})
export class EvaluationDiscussionForumModule { }
```

## 8. Styling & Responsive Design

### 8.1 Hauptlayout (evaluation-discussion-forum.component.scss)

```scss
@import 'src/styles/variables';
@import 'src/styles/mixins';

.evaluation-container {
  display: grid;
  grid-template-columns: 1fr 450px;
  gap: 24px;
  height: calc(100vh - #{$header-height});
  padding: 24px;
  background-color: $background-color;
  
  @include tablet {
    grid-template-columns: 1fr;
    grid-template-rows: 50vh 1fr;
    gap: 16px;
    padding: 16px;
  }
  
  @include mobile {
    // Tab-System für Mobile
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    padding: 8px;
    gap: 8px;
    
    .mobile-tab-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background-color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  }
}

.pdf-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: $card-shadow;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  .pdf-header {
    padding: 16px;
    border-bottom: 1px solid $border-color;
    background-color: $background-light;
    
    .submission-title {
      font-size: 18px;
      font-weight: 500;
      color: $text-primary;
      margin: 0 0 8px 0;
    }
    
    .submission-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 14px;
      color: $text-secondary;
      
      .author {
        display: flex;
        align-items: center;
        gap: 8px;
        
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
      
      .submitted-date {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  }
  
  .pdf-viewer-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
}

.discussion-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: $card-shadow;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  .discussion-header {
    padding: 16px;
    border-bottom: 1px solid $border-color;
    
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      color: $text-primary;
    }
  }
  
  .category-tabs-container {
    flex-shrink: 0;
  }
  
  .discussion-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: $background-light;
    }
    
    &::-webkit-scrollbar-thumb {
      background: $scrollbar-thumb;
      border-radius: 3px;
      
      &:hover {
        background: $scrollbar-thumb-hover;
      }
    }
  }
  
  .comment-input-container {
    border-top: 1px solid $border-color;
    padding: 16px;
    background-color: $background-light;
  }
}

// Loading State
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  
  mat-spinner {
    margin: 0 auto;
  }
}

// Error State
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
  
  mat-icon {
    font-size: 48px;
    width: 48px;
    height: 48px;
    color: $error-color;
    margin-bottom: 16px;
  }
  
  .error-message {
    font-size: 16px;
    color: $text-secondary;
    margin-bottom: 24px;
  }
}

// Empty State
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  
  mat-icon {
    font-size: 64px;
    width: 64px;
    height: 64px;
    color: $text-disabled;
    margin-bottom: 16px;
  }
  
  .empty-message {
    font-size: 16px;
    color: $text-secondary;
    margin-bottom: 8px;
  }
  
  .empty-hint {
    font-size: 14px;
    color: $text-disabled;
  }
}
```

### 8.2 Tab-Styling (category-tabs.component.scss)

```scss
@import 'src/styles/variables';

.category-tabs {
  ::ng-deep {
    .mat-tab-label {
      min-width: 120px;
      opacity: 1;
      
      // Animation für Tab-Wechsel
      transition: all 300ms ease-in-out;
      
      &:hover {
        background-color: rgba(0, 0, 0, 0.04);
      }
      
      &.mat-tab-label-active {
        background-color: rgba(63, 81, 181, 0.08);
      }
    }
    
    .mat-tab-label-content {
      width: 100%;
    }
    
    .mat-ink-bar {
      height: 3px;
      transition: all 300ms ease-in-out;
    }
  }
}

.tab-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 8px;
  gap: 8px;
  
  .category-icon {
    color: $primary-color;
    font-size: 18px;
    width: 18px;
    height: 18px;
  }
  
  .comment-stats {
    .mat-chip {
      font-size: 12px;
      height: 20px;
      padding: 0 8px;
      
      .used {
        color: $primary-color;
        font-weight: 500;
      }
      
      .divider {
        color: $text-disabled;
        margin: 0 2px;
      }
      
      .available {
        color: $text-secondary;
      }
      
      &.limit-reached {
        background-color: $error-light;
        
        .used {
          color: $error-color;
        }
      }
    }
  }
}

// Responsive Verhalten
@include mobile {
  .category-tabs {
    ::ng-deep {
      .mat-tab-label {
        min-width: 80px;
        padding: 0 4px;
      }
    }
  }
  
  .tab-label {
    flex-direction: column;
    gap: 4px;
    
    .category-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    span {
      font-size: 12px;
    }
  }
}
```

## 9. Guards

### 9.1 EvaluationAccessGuard

```typescript
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable()
export class EvaluationAccessGuard implements CanActivate {
  constructor(
    private evaluationService: EvaluationDiscussionService,
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const submissionId = route.params['submissionId'];
    
    return this.evaluationService.checkAccess(submissionId).pipe(
      take(1),
      map(hasAccess => {
        if (!hasAccess) {
          this.router.navigate(['/403']);
          return false;
        }
        return true;
      })
    );
  }
}
```

## 10. Performance-Optimierungen

### 10.1 Virtual Scrolling
- Verwendung von `CdkVirtualScrollViewport` für lange Kommentarlisten
- Dynamisches Laden von Kommentaren beim Scrollen
- TrackBy-Funktionen für effizientes Re-Rendering

### 10.2 Caching-Strategie
- BehaviorSubjects für gecachte Diskussionsdaten
- Vermeidung redundanter API-Aufrufe
- Optimistische UI-Updates für Voting und Kommentare

### 10.3 Change Detection
- OnPush Strategy für alle Dumb Components
- Immutable Data Updates
- Async Pipe für automatische Subscription-Verwaltung

### 10.4 Lazy Loading
- Module wird lazy geladen über Routing
- PDF-Viewer wird erst geladen wenn benötigt
- TinyMCE Editor optional und lazy

## 11. Testing-Strategie

### 11.1 Unit Tests
```typescript
// evaluation-discussion-forum.component.spec.ts
describe('EvaluationDiscussionForumComponent', () => {
  let component: EvaluationDiscussionForumComponent;
  let fixture: ComponentFixture<EvaluationDiscussionForumComponent>;
  let evaluationService: jasmine.SpyObj<EvaluationDiscussionService>;
  
  beforeEach(() => {
    const evaluationServiceSpy = jasmine.createSpyObj('EvaluationDiscussionService', [
      'getSubmission',
      'getCategories',
      'getDiscussionsByCategory',
      'createComment',
      'voteComment'
    ]);
    
    TestBed.configureTestingModule({
      declarations: [ EvaluationDiscussionForumComponent ],
      imports: [ RouterTestingModule ],
      providers: [
        { provide: EvaluationDiscussionService, useValue: evaluationServiceSpy }
      ]
    });
    
    fixture = TestBed.createComponent(EvaluationDiscussionForumComponent);
    component = fixture.componentInstance;
    evaluationService = TestBed.inject(EvaluationDiscussionService) as jasmine.SpyObj<EvaluationDiscussionService>;
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('should load submission on init', () => {
    const mockSubmission: EvaluationSubmissionDTO = { /* ... */ };
    evaluationService.getSubmission.and.returnValue(of(mockSubmission));
    
    component.ngOnInit();
    
    expect(evaluationService.getSubmission).toHaveBeenCalled();
  });
  
  // More tests...
});
```

### 11.2 Integration Tests
- Test der Komponenten-Interaktion
- WebSocket-Kommunikation
- State Management Updates

### 11.3 E2E Tests
```typescript
// evaluation-discussion-forum.e2e.spec.ts
describe('Evaluation Discussion Forum', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/evaluation/123');
  });
  
  it('should display PDF and discussion panel', () => {
    cy.get('[data-cy=pdf-viewer]').should('be.visible');
    cy.get('[data-cy=discussion-panel]').should('be.visible');
  });
  
  it('should switch between categories', () => {
    cy.get('[data-cy=category-tab-completeness]').click();
    cy.get('[data-cy=active-category]').should('contain', 'Vollständigkeit');
  });
  
  it('should submit a comment', () => {
    cy.get('[data-cy=comment-input]').type('Test comment');
    cy.get('[data-cy=submit-comment]').click();
    cy.get('[data-cy=comment-list]').should('contain', 'Test comment');
  });
});
```

## 12. Accessibility & User Experience Features

### 12.1 Accessibility (WCAG 2.1 AA)
- **ARIA-Labels**: Aussagekräftige Labels für Screen Reader
- **Tastaturnavigation**: Vollständige Keyboard-Unterstützung
- **Fokus-Management**: Sichtbare Fokus-Indikatoren
- **Farbkontrast**: Mindestens 4.5:1 Kontrastverhältnis
- **Screen Reader**: Optimierte Struktur für Screenreader
- **Semantic HTML**: Verwendung semantischer HTML-Elemente

### 12.2 Animations & Micro-Interactions
- **Tab-Wechsel**: Smooth Slide-Animation (300ms ease-in-out)
- **Kommentar-Expand**: Expand-Animation (250ms ease-out)
- **Hover-States**: Subtile Elevation-Änderungen
- **Ripple-Effects**: Material Design Ripple für Buttons
- **Loading States**: Skeleton Loading für bessere Perceived Performance

### 12.3 Responsive Design Features
- **Desktop (>1200px)**: Zwei-Spalten Layout
- **Tablet (768px-1200px)**: Kompaktere Darstellung
- **Mobile (<768px)**: Tab-System zwischen PDF und Diskussion
- **Bottom Sheet**: Mobile-optimierte Kommentar-Eingabe
- **Swipe-Gesten**: Touch-friendly Navigation
- **Sticky Header**: Fixierte Kategorie-Navigation

### 12.4 Performance Optimizations
- **Virtual Scrolling**: Effiziente Darstellung langer Listen
- **Lazy Loading**: On-demand Laden von Komponenten
- **Optimistic Updates**: Sofortige UI-Reaktion bei Voting
- **Skeleton Loading**: Verbesserte Perceived Performance
- **HTTP Caching**: Intelligente Caching-Strategie

## 13. Sicherheitsaspekte

### 13.1 XSS-Schutz
- DOMPurify für HTML-Content Sanitization
- Strict Content Security Policy
- Angular's eingebaute Sicherheitsmechanismen

### 13.2 Authentifizierung & Autorisierung
- JWT-basierte Authentifizierung
- Guards für Zugriffskontrolle
- Anonyme Benutzer-Verwaltung

### 13.3 Input Validation
- Frontend-Validierung mit Angular Validators
- Maximal-Längen für Kommentare
- Rate Limiting für API-Aufrufe

## 14. Deployment & Integration

### 14.1 Build-Prozess
```bash
# Development Build
ng build --configuration=development

# Production Build
ng build --configuration=production --optimization --build-optimizer
```

### 14.2 Environment Configuration
```typescript
// environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3000'
};
```

### 14.3 Integration in App-Routing
```typescript
// app-routing.module.ts
{
  path: 'evaluation',
  loadChildren: () => import('./Pages/evaluation-discussion-forum/evaluation-discussion-forum.module')
    .then(m => m.EvaluationDiscussionForumModule),
  canActivate: [AuthGuard]
}
```

## 15. Zukünftige Erweiterungen

### 15.1 Geplante Features
- **Markdown-Support**: Rich-Text-Formatierung für Kommentare
- **Datei-Anhänge**: Upload von Bildern und Dokumenten
- **@-Mentions**: Benutzer-Erwähnungen mit Benachrichtigungen
- **Comment-Threading**: Verschachtelte Antworten auf Antworten
- **Export-Funktion**: PDF/Word-Export für Diskussionen
- **KI-Integration**: Automatische Zusammenfassungen und Sentiment-Analyse
- **Collaboration-Tools**: Shared Annotations im PDF

### 15.2 Technische Verbesserungen
- **Service Worker**: Offline-Support und Push-Notifications
- **IndexedDB**: Lokales Caching für bessere Performance
- **WebRTC**: Echtzeit-Kollaboration und Voice-Chat
- **Progressive Web App**: App-like Experience auf Mobile
- **Dark Mode**: Automatische Theme-Umschaltung
- **Internationalization**: Multi-Language Support

### 15.3 Advanced UX Features
- **Drag & Drop**: Intuitive Datei-Uploads
- **Keyboard Shortcuts**: Power-User-Funktionen
- **Customizable Layout**: Benutzer-definierte Panel-Größen
- **Advanced Filtering**: Erweiterte Such- und Filteroptionen
- **Notification Center**: Centralized Benachrichtigungsverwaltung

## 16. Zusammenfassung

Die Evaluation & Discussion Forum Component ist eine umfassende, moderne Lösung für strukturierte PDF-Bewertungen mit kategorisierten Diskussionen. Die Integration der Design-Verbesserungen aus `design.md` macht sie zu einer benutzerfreundlichen, barrierefreien und performanten Anwendung.

### ✅ Kernfeatures:
- **Vollständige Type-Safety** durch DTOs
- **Modulare, wiederverwendbare** Komponenten
- **Performante State-Management-Lösung**
- **Real-time Updates** über WebSockets
- **Responsive Design** für alle Geräte
- **WCAG 2.1 AA-konforme Accessibility**
- **Material Design 3** UI-Components
- **Animations & Micro-Interactions**
- **Optimistic UI-Updates**
- **Umfassende Test-Abdeckung**
- **Skalierbare Architektur**

### 🎨 Design-Verbesserungen integriert:
- **Erweiterte Material Components** (Cards, Chips, Lists, etc.)
- **Accessibility-Features** (ARIA, Keyboard Navigation)
- **Responsive Design-Patterns** (Mobile Tab-System, Bottom Sheets)
- **Animations & Transitions** (Smooth UX)
- **Category Icons** für bessere Erkennbarkeit
- **Optimierte Templates** mit Material Design

Die Implementierung baut auf der bestehenden HEFL-Infrastruktur auf und integriert sich nahtlos in das Gesamtsystem, während sie moderne UX-Standards und Best Practices befolgt.