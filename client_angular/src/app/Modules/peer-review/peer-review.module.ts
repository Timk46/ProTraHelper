import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PeerReviewRoutingModule } from './peer-review-routing.module';
import { PeerReviewDashboardComponent } from './components/peer-review-dashboard/peer-review-dashboard.component';
import { PeerReviewService } from './services/peer-review.service';
import { PeerSubmissionService } from './services/peer-submission.service';
import { PeerReviewSessionService } from './services/peer-review-session.service';

@NgModule({
  declarations: [
    PeerReviewDashboardComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PeerReviewRoutingModule,
    // Material modules
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatBadgeModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule
  ],
  providers: [
    PeerReviewService,
    PeerSubmissionService,
    PeerReviewSessionService
  ]
})
export class PeerReviewModule { }