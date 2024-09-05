import { AfterViewInit, Component, ElementRef, Input, SimpleChanges } from '@angular/core';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';

declare var tinymce: any;

@Component({
  selector: 'app-tinymce',
  templateUrl: './tinymce.component.html',
  styleUrls: ['./tinymce.component.scss']
})
export class TinymceComponent {



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
  isInitialized: boolean = false;

  constructor(){}

  ngOnInit(): void {
    this.uuid = "editor" + uuidv4();
  }

  ngAfterViewInit(): void {
    this.isInitialized = true;
    this.initEditor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isInitialized){
      if (changes['content']) {
        this.content = changes['content'].currentValue;
        if (this.content != '') {
          this.setContent(this.content);
        }
      }
      if (changes['config']) {
        this.initEditor();
      }
    }
  }

  /**
   * Initializes the editor.
   */
  private initEditor(): void {
    console.log('init editor', this.uuid);
    if (this.editorInstance) {
      this.editorInstance.destroy();
    }
    //this.config = Object.assign(this.DEFAULT_CONFIG, this.config);
    tinymce.init({
      selector: `#${this.uuid}`,
      ...this.DEFAULT_CONFIG,
      ...this.config,
      setup: (editor: any) =>	{
        this.editorInstance = editor;
        editor.on('init', () => {
          if (this.content != '') {
            editor.setContent(this.content);
          }
        });
      }
    });
  }


  /**
   * Change the view of the editor
   */
  changeView() {
    if (this.editorInstance){
      if (this.isReadonly) {
        this.editorInstance.mode.set("readonly");
      } else {
        this.editorInstance.mode.set("design");
      }
    }
  }

  /**
   * Get the content of the editor
   * @returns the content of the editor
   */
  getContent(): string {
    //console.log("TinymceComponent: getContent");
    if (this.editorInstance) {
      //console.log('editor instance', this.editorInstance);
      const content = this.editorInstance.getContent();
      const textSize = new Blob([content]).size;
      if (textSize < environment.max_html_body_size) {
        return this.editorInstance.getContent();
      } else {
        throw new Error('Message size exceeds the maximum allowed size.');
      }
    }
    return '';
  }

  /**
   * Retrieves the raw content from the TinyMCE editor.
   * @returns The raw content as a string.
   */
  getRawContent(): string {
    //console.log("TinymceComponent: getRawContent");
    if (this.editorInstance) {
      return this.editorInstance.getContent({format: 'text'});
    }
    return '';
  }

  /**
   * Set the content of the editor
   * @param content the content to set
   */
  setContent(content: string): void {
    console.log("AUFTRAG:", this.isInitialized, this.editorInstance, content);
    if (this.editorInstance) {
      this.content = content;
    }
  }

  /**
   * Destroys the editor
   */
  destroy(): void {
    if (this.editorInstance) {
      this.editorInstance.destroy();
    }
  }

  ngOnDestroy(): void {
    if (this.editorInstance) {
      this.editorInstance.destroy();
    }
  }

}
