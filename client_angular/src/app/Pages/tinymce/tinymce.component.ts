import type { OnInit, OnDestroy, SimpleChanges, OnChanges, AfterViewInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

declare let tinymce: any;

@Component({
  selector: 'app-tinymce',
  templateUrl: './tinymce.component.html',
  styleUrls: ['./tinymce.component.scss'],
})
export class TinymceComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  readonly DEFAULT_CONFIG: any = {
    base_url: '/tinymce',
    suffix: '.min',
    menubar: false,
    statusbar: false,
    resize: false,
    branding: false,
  };

  @Input() content: string = '';
  @Input() config: any = {};

  uuid: string = '';
  isReadonly: boolean = false;
  editorInstance: any;
  private readonly contentSubject = new BehaviorSubject<string>('');
  private readonly destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {
    this.uuid = 'editor-' + uuidv4(); // Fügen Sie einen Bindestrich hinzu, um sicherzustellen, dass es kein reiner Zahlen-Selektor ist

    this.contentSubject.pipe(takeUntil(this.destroy$), debounceTime(300)).subscribe(content => {
      if (this.editorInstance) {
        this.editorInstance.setContent(content);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initEditor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      this.contentSubject.next(changes['content'].currentValue);
    }
    if (changes['config'] && this.editorInstance) {
      this.initEditor();
    }
  }

  private initEditor(): void {
    if (typeof tinymce === 'undefined') {
      console.error('TinyMCE is not loaded. Make sure it is properly included in your project.');
      return;
    }

    if (!document.getElementById(this.uuid)) {
      console.error(`Element with id ${this.uuid} not found in the DOM.`);
      return;
    }

    if (this.editorInstance) {
      this.editorInstance.destroy();
    }

    tinymce.init({
      selector: `#${this.uuid}`,
      ...this.DEFAULT_CONFIG,
      ...this.config,
      setup: (editor: any) => {
        this.editorInstance = editor;
        editor.on('init', () => {
          if (this.content !== '') {
            editor.setContent(this.content);
          }
        });
      },
    });
  }

  changeView() {
    if (this.editorInstance?.mode) {
      if (this.isReadonly) {
        this.editorInstance.mode.set('readonly');
      } else {
        this.editorInstance.mode.set('design');
      }
    }
  }

  getContent(): string {
    if (this.editorInstance) {
      const content = this.editorInstance.getContent();
      const textSize = new Blob([content]).size;
      if (textSize < environment.max_html_body_size) {
        return content;
      } else {
        throw new Error('Message size exceeds the maximum allowed size.');
      }
    }
    return '';
  }

  getRawContent(): string {
    if (this.editorInstance) {
      return this.editorInstance.getContent({ format: 'text' });
    }
    return '';
  }

  setContent(content: string): void {
    this.content = content;
    this.contentSubject.next(content);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.editorInstance) {
      this.editorInstance.destroy();
    }
  }
}
