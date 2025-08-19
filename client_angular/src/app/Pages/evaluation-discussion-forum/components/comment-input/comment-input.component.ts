import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

// Angular Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-comment-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule
  ],
  templateUrl: './comment-input.component.html',
  styleUrl: './comment-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentInputComponent implements OnInit, OnDestroy, OnChanges {
  
  // =============================================================================
  // INPUTS - CONFIGURATION FROM PARENT
  // =============================================================================
  
  @Input() placeholder: string = 'Schreiben Sie einen Kommentar...';
  @Input() maxLength: number = 1000;
  @Input() minLength: number = 3;
  @Input() disabled: boolean = false;
  @Input() isSubmitting: boolean = false;
  @Input() autofocus: boolean = false;
  @Input() showCharacterCount: boolean = true;
  @Input() showSubmitButton: boolean = true;
  @Input() allowEmpty: boolean = false;
  @Input() rows: number = 3;
  @Input() submitButtonText: string = 'Senden';
  
  // 🚀 PHASE 4: Reply mode support
  @Input() parentCommentId: string | null = null;
  @Input() depth: number = 0;
  @Input() isReplyMode: boolean = false;
  @Input() showCancelButton: boolean = false;

  // =============================================================================
  // OUTPUTS - EVENTS TO PARENT
  // =============================================================================
  
  @Output() commentSubmitted = new EventEmitter<string>();
  @Output() textChanged = new EventEmitter<string>();
  @Output() focusChanged = new EventEmitter<boolean>();
  
  // 🚀 PHASE 4: Reply mode events
  @Output() cancelled = new EventEmitter<void>();

  // =============================================================================
  // COMPONENT STATE
  // =============================================================================
  
  commentForm: FormGroup;
  currentLength: number = 0;
  isFocused: boolean = false;
  private destroy$ = new Subject<void>();

  // =============================================================================
  // TEMPLATE REFERENCES
  // =============================================================================
  
  @ViewChild('textareaElement', { static: false }) textareaElement!: ElementRef<HTMLTextAreaElement>;

  // =============================================================================
  // CONSTRUCTOR
  // =============================================================================
  
  constructor(private formBuilder: FormBuilder) {
    this.commentForm = this.createForm();
  }

  // =============================================================================
  // LIFECYCLE METHODS
  // =============================================================================
  
  ngOnInit(): void {
    this.setupFormValidation();
    this.setupValueChanges();
    this.updateFormControlState();
    
    // 🚀 PHASE 4: Auto-detect reply mode and enable cancel button
    if (this.parentCommentId) {
      this.isReplyMode = true;
      this.showCancelButton = true;
      this.autofocus = true; // Auto-focus reply inputs
    }
    
    if (this.autofocus) {
      setTimeout(() => this.focusTextarea(), 100);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled'] && this.commentForm) {
      this.updateFormControlState();
    }
    
    // 🚀 PHASE 4: Update reply mode when parentCommentId changes
    if (changes['parentCommentId']) {
      this.isReplyMode = !!this.parentCommentId;
      if (this.isReplyMode) {
        this.showCancelButton = true;
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =============================================================================
  // FORM SETUP
  // =============================================================================
  
  private createForm(): FormGroup {
    return this.formBuilder.group({
      content: ['', [
        this.allowEmpty ? [] : Validators.required,
        Validators.minLength(this.minLength),
        Validators.maxLength(this.maxLength)
      ]]
    });
  }

  private setupFormValidation(): void {
    // Update validators when inputs change
    const contentControl = this.commentForm.get('content');
    if (contentControl) {
      const validators = [
        this.allowEmpty ? null : Validators.required,
        Validators.minLength(this.minLength),
        Validators.maxLength(this.maxLength)
      ].filter(v => v !== null) as any[];
      
      contentControl.setValidators(validators);
      contentControl.updateValueAndValidity();
    }
  }

  private setupValueChanges(): void {
    this.commentForm.get('content')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100)
      )
      .subscribe(value => {
        this.currentLength = value ? value.length : 0;
        this.textChanged.emit(value);
      });
  }

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================
  
  onSubmit(): void {
    if (this.commentForm.valid && !this.isSubmitting) {
      const content = this.commentForm.get('content')?.value?.trim() || '';
      
      if (content || this.allowEmpty) {
        this.commentSubmitted.emit(content);
        this.clearContent();
      }
    }
  }
  
  // 🚀 PHASE 4: Cancel reply input
  onCancel(): void {
    this.clearContent();
    this.cancelled.emit();
  }

  onTextareaFocus(): void {
    this.isFocused = true;
    this.focusChanged.emit(true);
  }

  onTextareaBlur(): void {
    this.isFocused = false;
    this.focusChanged.emit(false);
  }

  onKeyDown(event: KeyboardEvent): void {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.onSubmit();
      return;
    }
    
    // 🚀 PHASE 4: Cancel on Escape key in reply mode
    if (event.key === 'Escape' && this.isReplyMode) {
      event.preventDefault();
      this.onCancel();
      return;
    }
    
    // Prevent typing when at max length (except for deletion/navigation keys)
    if (this.currentLength >= this.maxLength && 
        !this.isNavigationKey(event) && 
        !this.isDeletionKey(event)) {
      event.preventDefault();
    }
  }

  onPaste(event: ClipboardEvent): void {
    // Handle paste events to respect max length
    const pastedText = event.clipboardData?.getData('text') || '';
    const currentText = this.commentForm.get('content')?.value || '';
    const selectionStart = this.textareaElement.nativeElement.selectionStart || 0;
    const selectionEnd = this.textareaElement.nativeElement.selectionEnd || 0;
    
    const textBeforeSelection = currentText.substring(0, selectionStart);
    const textAfterSelection = currentText.substring(selectionEnd);
    const newText = textBeforeSelection + pastedText + textAfterSelection;
    
    if (newText.length > this.maxLength) {
      event.preventDefault();
      
      // Truncate pasted text to fit within max length
      const availableSpace = this.maxLength - textBeforeSelection.length - textAfterSelection.length;
      const truncatedPaste = pastedText.substring(0, availableSpace);
      const finalText = textBeforeSelection + truncatedPaste + textAfterSelection;
      
      this.commentForm.get('content')?.setValue(finalText);
      
      // Set cursor position after pasted text
      setTimeout(() => {
        const newCursorPosition = textBeforeSelection.length + truncatedPaste.length;
        this.textareaElement.nativeElement.setSelectionRange(newCursorPosition, newCursorPosition);
      });
    }
  }

  // =============================================================================
  // PUBLIC METHODS
  // =============================================================================
  
  /**
   * Programmatically focus the textarea
   */
  focusTextarea(): void {
    if (this.textareaElement?.nativeElement) {
      this.textareaElement.nativeElement.focus();
    }
  }

  /**
   * Clear the comment content
   */
  clearContent(): void {
    this.commentForm.get('content')?.setValue('');
    this.currentLength = 0;
  }

  /**
   * Set the comment content programmatically
   */
  setContent(content: string): void {
    this.commentForm.get('content')?.setValue(content);
  }

  /**
   * Get the current comment content
   */
  getContent(): string {
    return this.commentForm.get('content')?.value || '';
  }

  // =============================================================================
  // TEMPLATE HELPER METHODS
  // =============================================================================
  
  /**
   * Checks if the form is valid for submission
   */
  isFormValid(): boolean {
    const content = this.getContent().trim();
    return this.commentForm.valid && (content.length > 0 || this.allowEmpty);
  }

  /**
   * Gets the remaining character count
   */
  getRemainingCharacters(): number {
    return this.maxLength - this.currentLength;
  }

  /**
   * Gets the character count display text
   */
  getCharacterCountText(): string {
    return `${this.currentLength}/${this.maxLength}`;
  }

  /**
   * Gets the character count color class
   */
  getCharacterCountClass(): string {
    const remaining = this.getRemainingCharacters();
    
    if (remaining < 0) {
      return 'over-limit';
    } else if (remaining < 50) {
      return 'warning';
    } else if (remaining < 100) {
      return 'caution';
    }
    
    return 'normal';
  }

  /**
   * Gets form validation error messages
   */
  getErrorMessage(): string {
    const contentControl = this.commentForm.get('content');
    
    if (contentControl?.hasError('required')) {
      return 'Kommentar darf nicht leer sein';
    }
    
    if (contentControl?.hasError('minlength')) {
      return `Kommentar muss mindestens ${this.minLength} Zeichen lang sein`;
    }
    
    if (contentControl?.hasError('maxlength')) {
      return `Kommentar darf maximal ${this.maxLength} Zeichen lang sein`;
    }
    
    return '';
  }

  /**
   * Checks if there are validation errors
   */
  hasErrors(): boolean {
    const contentControl = this.commentForm.get('content');
    return !!(contentControl?.invalid && (contentControl?.dirty || contentControl?.touched));
  }

  /**
   * Gets the submit button tooltip
   */
  getSubmitTooltip(): string {
    if (this.disabled) {
      return 'Kommentare sind momentan deaktiviert';
    }
    
    if (this.isSubmitting) {
      return this.isReplyMode ? 'Antwort wird gesendet...' : 'Kommentar wird gesendet...';
    }
    
    if (!this.isFormValid()) {
      return this.isReplyMode ? 'Bitte geben Sie eine gültige Antwort ein' : 'Bitte geben Sie einen gültigen Kommentar ein';
    }
    
    return this.isReplyMode ? 'Antwort senden (Strg+Enter)' : 'Kommentar senden (Strg+Enter)';
  }
  
  // 🚀 PHASE 4: Reply mode specific helpers
  
  /**
   * Gets the submit button text based on mode
   */
  getSubmitButtonText(): string {
    if (this.isReplyMode) {
      return this.isSubmitting ? 'Antworten...' : 'Antworten';
    }
    return this.isSubmitting ? 'Senden...' : this.submitButtonText;
  }
  
  /**
   * Gets the cancel button tooltip
   */
  getCancelTooltip(): string {
    return 'Antwort abbrechen (Escape)';
  }
  
  /**
   * Checks if component is in reply mode
   */
  isInReplyMode(): boolean {
    return this.isReplyMode || !!this.parentCommentId;
  }
  
  /**
   * Gets depth-based styling class
   */
  getDepthClass(): string {
    if (this.depth <= 0) return 'depth-0';
    if (this.depth === 1) return 'depth-1';
    if (this.depth === 2) return 'depth-2';
    if (this.depth === 3) return 'depth-3';
    return 'depth-max';
  }

  /**
   * Gets the textarea placeholder text
   */
  getPlaceholderText(): string {
    if (this.disabled) {
      return 'Kommentare sind momentan nicht möglich';
    }
    
    return this.placeholder;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================
  
  private isNavigationKey(event: KeyboardEvent): boolean {
    const navigationKeys = [
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'PageUp', 'PageDown', 'Tab'
    ];
    return navigationKeys.includes(event.key);
  }

  private isDeletionKey(event: KeyboardEvent): boolean {
    return event.key === 'Backspace' || event.key === 'Delete';
  }

  /**
   * Updates the form control enabled/disabled state based on the disabled input
   */
  private updateFormControlState(): void {
    const contentControl = this.commentForm.get('content');
    if (contentControl) {
      if (this.disabled) {
        contentControl.disable();
      } else {
        contentControl.enable();
      }
    }
  }

  /**
   * Auto-resize textarea based on content
   */
  autoResize(): void {
    if (this.textareaElement?.nativeElement) {
      const textarea = this.textareaElement.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(textarea.scrollHeight, this.rows * 20) + 'px';
    }
  }
}
