# Design Enhancement Plan: Task Collection

## Ziel

Adaption der eleganten Design-Elemente aus `mcSliderTask` in die `task-collection` Komponente, mit Fokus auf moderne Optik und verbesserte Navigation.

## Design-Elemente zu übernehmen

### 1. Visueller Stil & Layout

- **Nord Theme Farbpalette** mit gradient background
- **Roboto Schriftart** für moderne Typographie
- **Erhöhte Container** mit Schatten-Effekten
- **Besseres Spacing** und responsive Proportionen
- **Loading States** mit eleganten Spinner-Animationen

### 2. Navigations-Verbesserungen

- **Progress Dots Navigation** - Klickbare Dots für direkten Sprung zu Aufgaben
- **Visual Status Indicators** - Haken für erledigte Aufgaben
- **Fixed Footer Layout** mit Links/Rechts Navigation
- **Enhanced Progress Display** mit besserer visueller Darstellung

### 3. Interaktive Elemente

- **Close Button** (top-right, modernes Design)
- **Elegante Hover-Effekte** mit smooth Transformationen
- **Status-basierte Farb-Codierung** für Aufgaben

## Implementierung

### Phase 1: SCSS Enhancement

#### 1.1 Nord Theme Integration

```scss
// Neue Variablen hinzufügen
$nord-polar-night-1: #2e3440;
$nord-polar-night-2: #3b4252;
$nord-snow-storm-1: #d8dee9;
$nord-snow-storm-2: #e5e9f0;
$nord-snow-storm-3: #eceff4;
$nord-frost-1: #8fbcbb;
$nord-frost-2: #88c0d0;
$nord-frost-3: #81a1c1;
$nord-aurora-4: #a3be8c; // Grün für erledigte Aufgaben
```

#### 1.2 Container Redesign

```scss
.collection-wrapper {
  background: linear-gradient(135deg, $nord-snow-storm-3 0%, $nord-snow-storm-2 100%);
  font-family: 'Roboto', sans-serif;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

#### 1.3 Progress Dots System

```scss
.progress-dots {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 20px 0;

  .progress-dot {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid $nord-snow-storm-1;
    background: white;
    transition: all 0.3s ease;

    &--current {
      border-color: $nord-frost-3;
      box-shadow: 0 0 0 3px rgba(129, 161, 193, 0.3);
    }

    &--completed {
      background: $nord-aurora-4;
      border-color: $nord-aurora-4;
      color: white;
    }
  }
}
```

### Phase 2: HTML Template Enhancement

#### 2.1 Neue Struktur

```html
<div class="collection-wrapper enhanced">
  <!-- Close Button -->
  <div class="close-button">
    <button mat-icon-button (click)="onClose()">
      <mat-icon>close</mat-icon>
    </button>
  </div>

  <!-- Start Page View (bestehend) -->
  <div class="start-page-container" *ngIf="showStartPage; else taskView">
    <!-- Bestehender Content -->
  </div>

  <!-- Enhanced Task View -->
  <ng-template #taskView>
    <!-- Progress Header -->
    <div class="progress-header">
      <h2 class="progress-title">{{ questionCollection.title }}</h2>
      <div class="progress-info">
        <span class="progress-text"
          >Aufgabe {{ currentIndex + 1 }} von {{ sortedTasks.length }}</span
        >
        <span class="progress-score"
          >{{ getCompletedTasksCount() }} von {{ sortedTasks.length }} abgeschlossen</span
        >
      </div>
    </div>

    <!-- Progress Dots Navigation -->
    <div class="progress-dots" role="tablist">
      <button
        *ngFor="let task of sortedTasks; let i = index"
        class="progress-dot"
        [class.progress-dot--current]="i === currentIndex"
        [class.progress-dot--completed]="isTaskCompleted(i)"
        (click)="goToTask(i)"
        [attr.aria-label]="'Zu Aufgabe ' + (i + 1) + ' gehen'"
      >
        <mat-icon *ngIf="isTaskCompleted(i)">check</mat-icon>
        <span *ngIf="!isTaskCompleted(i)">{{ i + 1 }}</span>
      </button>
    </div>

    <!-- Task Content Container -->
    <div class="task-content-container">
      <ng-template #taskHost></ng-template>
    </div>

    <!-- Fixed Footer -->
    <div class="fixed-footer">
      <div class="footer-content">
        <!-- Left Navigation -->
        <button
          mat-icon-button
          (click)="goToPreviousTask()"
          [disabled]="currentIndex <= 0"
          aria-label="Vorherige Aufgabe"
        >
          <mat-icon>navigate_before</mat-icon>
        </button>

        <!-- Center Progress -->
        <div class="center-progress">
          <mat-progress-bar mode="determinate" [value]="getOverallProgress()"></mat-progress-bar>
        </div>

        <!-- Right Navigation -->
        <button
          mat-flat-button
          color="primary"
          (click)="goToNextTask()"
          [disabled]="!isCurrentTaskCompleted"
        >
          <span *ngIf="currentIndex < sortedTasks.length - 1">Weiter</span>
          <span *ngIf="currentIndex >= sortedTasks.length - 1">Abschließen</span>
          <mat-icon>navigate_next</mat-icon>
        </button>
      </div>
    </div>
  </ng-template>
</div>
```

### Phase 3: TypeScript Enhancement

#### 3.1 Neue Properties & Methods

```typescript
// State Management
isLoading = false;
completedTasks: Set<number> = new Set();

// Navigation Methods
goToTask(index: number): void {
  if (index >= 0 && index < this.sortedTasks.length) {
    this.currentIndex = index;
    this.loadCurrentTask();
  }
}

isTaskCompleted(index: number): boolean {
  const task = this.sortedTasks[index];
  return task?.progress >= 100 || this.completedTasks.has(index);
}

getCompletedTasksCount(): number {
  return this.sortedTasks.filter((_, index) => this.isTaskCompleted(index)).length;
}

getOverallProgress(): number {
  const completedCount = this.getCompletedTasksCount();
  return (completedCount / this.sortedTasks.length) * 100;
}

// Close functionality
onClose(): void {
  // Dialog schließen oder Navigation zurück
  if (this.dialogRef) {
    this.dialogRef.close();
  }
}
```

#### 3.2 Enhanced Task Loading

```typescript
private loadCurrentTask(): void {
  this.isLoading = true;

  // Loading animation für bessere UX
  setTimeout(() => {
    // Bestehende loadCurrentTask Logik
    this.isLoading = false;
  }, 300);
}
```

### Phase 4: Loading States & Animations

#### 4.1 Loading Component

```html
<!-- Loading State -->
<div *ngIf="isLoading" class="loading-container">
  <div class="loading">
    <div class="loading__spinner"></div>
    <p class="loading__text">Aufgabe wird geladen...</p>
  </div>
</div>
```

#### 4.2 Smooth Transitions

```scss
.task-content-container {
  transition: opacity 0.3s ease;

  &.loading {
    opacity: 0.5;
  }
}

.progress-dot {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
```

## Prioritäten

### Hoch (Must-Have)

1. ✅ Progress Dots Navigation mit Klick-Funktionalität
2. ✅ Visual Status Indicators (Haken für erledigte Aufgaben)
3. ✅ Nord Theme Integration
4. ✅ Close Button
5. ✅ Fixed Footer Layout

### Mittel (Should-Have)

1. ✅ Enhanced Progress Display
2. ✅ Loading States
3. ✅ Hover-Effekte und Animationen
4. ✅ Gradient Background

### Niedrig (Nice-to-Have)

1. Confetti-Animation bei Abschluss
2. Erweiterte Tastatur-Navigation
3. Responsive Breakpoints für Mobile

## Testen

### Funktionale Tests

- [ ] Progress Dots Navigation funktioniert
- [ ] Status-Anzeige aktualisiert sich korrekt
- [ ] Close Button funktioniert
- [ ] Loading States werden angezeigt

### Visuelle Tests

- [ ] Nord Theme wird korrekt angezeigt
- [ ] Animationen laufen smooth
- [ ] Responsive Design funktioniert
- [ ] Accessibility ist gewährleistet

## Implementierungsreihenfolge

1. **SCSS Enhancement** (Nord Theme + Base Styling)
2. **HTML Template Update** (Progress Dots + Layout)
3. **TypeScript Logic** (Navigation + State Management)
4. **Loading States** (UX Verbesserungen)
5. **Testing & Refinement** (Polish + Bug Fixes)

Geschätzter Aufwand: **2-3 Tage**
