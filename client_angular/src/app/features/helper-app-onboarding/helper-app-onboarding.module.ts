import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { HelperAppOnboardingComponent } from './helper-app-onboarding.component';
import { HelperAppOnboardingService } from '../../Services/helper-app-onboarding/helper-app-onboarding.service';

@NgModule({
  declarations: [
    HelperAppOnboardingComponent
  ],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatListModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  providers: [
    HelperAppOnboardingService
  ],
  exports: [
    HelperAppOnboardingComponent
  ]
})
export class HelperAppOnboardingModule { }
