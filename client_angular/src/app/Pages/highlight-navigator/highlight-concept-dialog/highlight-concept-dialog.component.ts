import { OnInit, OnDestroy, Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  CreateHighlightConceptDto,
  HighlightConceptDto,
  UpdateHighlightConceptDto,
} from '@DTOs/index';
import { ConceptSelectionService } from 'src/app/Services/concept-selection/concept-selection.service';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-highlight-concept-dialog',
  templateUrl: './highlight-concept-dialog.component.html',
  styleUrls: ['./highlight-concept-dialog.component.scss'],
})
export class HighlightConceptDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isEditMode: boolean;
  selectedConceptId: number | null = null;
  title: string;
  selectedFileName: string | null = null;
  private readonly subscription: Subscription = new Subscription();

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<HighlightConceptDialogComponent>,
    private readonly conceptSelectionService: ConceptSelectionService,
    private readonly snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      moduleId: number;
      concept?: HighlightConceptDto;
    },
  ) {
    this.isEditMode = !!data.concept;
    this.title = this.isEditMode ? 'Edit Highlight Concept' : 'Add Highlight Concept';

    this.form = this.fb.group({
      alias: [data.concept?.alias || '', Validators.required],
      description: [data.concept?.description || ''],
      pictureData: [data.concept?.pictureData || 'https://via.placeholder.com/300'],
      position: [data.concept?.position || 0],
      isUnlocked: [data.concept?.isUnlocked !== undefined ? data.concept.isUnlocked : true],
    });

    if (this.isEditMode && data.concept) {
      this.selectedConceptId = data.concept.conceptNodeId;
    }
  }

  ngOnInit(): void {
    // Subscribe to concept selection changes
    this.subscription.add(
      this.conceptSelectionService.selectedConceptId$.subscribe(conceptId => {
        if (conceptId !== null) {
          this.selectedConceptId = conceptId;
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.conceptSelectionService.clearSelectedConceptId();
  }

  /**
   * Validates the form and closes the dialog with the result
   */
  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    if (!this.selectedConceptId) {
      // Show error message - concept node selection is required
      return;
    }

    const formValue = this.form.value;

    if (this.isEditMode) {
      const updateDto: UpdateHighlightConceptDto = {
        alias: formValue.alias,
        description: formValue.description,
        pictureData: formValue.pictureData,
        position: formValue.position,
        isUnlocked: formValue.isUnlocked,
      };
      this.dialogRef.close(updateDto);
    } else {
      const createDto: CreateHighlightConceptDto = {
        moduleId: this.data.moduleId,
        conceptNodeId: this.selectedConceptId,
        alias: formValue.alias,
        description: formValue.description,
        pictureData: formValue.pictureData,
        position: formValue.position,
        isUnlocked: formValue.isUnlocked,
      };
      this.dialogRef.close(createDto);
    }
  }

  onSelectionChange($event: number): void {
    this.selectedConceptId = $event;
    console.log('Selected concept ID:', this.selectedConceptId);
  }

  /**
   * Closes the dialog without saving
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Handles file selection for image upload
   * Converts the selected image to a base64 string
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      this.showMessage('Please select an image file');
      return;
    }

    // Check file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      this.showMessage('Image size should be less than 5MB');
      return;
    }

    this.selectedFileName = file.name;

    // Convert the image to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      // Update the form with the base64 string
      this.form.patchValue({
        pictureData: base64String,
      });
      this.showMessage('Image uploaded successfully');
    };

    reader.onerror = () => {
      this.showMessage('Error reading the file');
    };

    reader.readAsDataURL(file);
  }

  /**
   * Shows a snackbar message
   */
  private showMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}
