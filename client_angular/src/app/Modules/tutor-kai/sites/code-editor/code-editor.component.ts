import type { AfterViewInit, ChangeDetectorRef, ElementRef, OnInit } from '@angular/core';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';

/**
 * A component that wraps the ngx-monaco-editor and provides additional functionality.
 */
@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.scss'],
})
export class CodeEditorComponent implements AfterViewInit, OnInit {
  @ViewChild('resizeHandle', { static: false }) resizeHandle!: ElementRef;
  @ViewChild('monacoEditor', { static: false }) monacoEditor!: any;

  @Input() selectedLanguage: string | undefined = 'java';
  @Input() code: string = '';
  @Output() codeChange = new EventEmitter<string>();

  editorHeight: number = 800; // Default height
  private isDragging: boolean = false;
  private startY: number = 0;
  private startHeight: number = 0;

  // For Monaco Code Editor
  editorOptions = {
    theme: 'vs',
    language: this.selectedLanguage,
    minimap: { enabled: false },
    automaticLayout: true,
  };

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.setupResizeListener();
  }

  ngOnInit(): void {
    this.editorOptions = {
      ...this.editorOptions,
      language: this.selectedLanguage,
    };
  }

  /**
   * Sets up event listeners for resizing the editor.
   */
  private setupResizeListener(): void {
    const resizeHandle = this.resizeHandle.nativeElement;

    resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true;
      this.startY = e.clientY;
      this.startHeight = this.editorHeight;
      document.addEventListener('mousemove', this.resize);
      document.addEventListener('mouseup', this.stopResize);
    });
  }

  /**
   * Handles the resizing of the editor.
   */
  private readonly resize = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const deltaY = e.clientY - this.startY;
    this.editorHeight = Math.max(200, Math.min(800, this.startHeight + deltaY));
    this.cdr.detectChanges(); // Trigger change detection
    if (this.monacoEditor?.editor) {
      this.monacoEditor.editor.layout();
    }
  };

  /**
   * Stops the resizing operation.
   */
  private readonly stopResize = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.resize);
    document.removeEventListener('mouseup', this.stopResize);
  };

  /**
   * Change the language of the editor.
   * @param language - The new language to set for the editor.
   */
  changeLanguage(language: string | undefined): void {
    if (language === undefined) return;
    this.selectedLanguage = language;
    this.editorOptions = {
      ...this.editorOptions,
      language: this.selectedLanguage,
    };
  }

  /**
   * Emit the new code to the parent component (student-workspace) when the code is changed.
   * @param code - The updated code from the editor.
   */
  changeCode(code: string): void {
    this.codeChange.emit(code);
  }
}
