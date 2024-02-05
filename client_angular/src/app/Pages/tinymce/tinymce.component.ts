import { AfterViewInit, Component, ElementRef, Input, SimpleChanges } from '@angular/core';

declare var tinymce: any;

@Component({
  selector: 'app-tinymce',
  templateUrl: './tinymce.component.html',
  styleUrls: ['./tinymce.component.scss']
})
export class TinymceComponent {

  readonly DEFAULT_CONFIG: any = {
    selector: '#editor',
        base_url: '/tinymce',
        suffix: '.min',
        menubar: false,
        statusbar: false,
        resize: false,
        branding: false,
  };

  @Input() content: string = '';
  @Input() config: any = {};

  isReadonly: boolean = false;
  editorInstance: any;

  constructor(){}

  ngOnInit(): void {
    this.initEditor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      this.content = changes['content'].currentValue;
      if (this.content != undefined) {
        this.setContent(this.content);
      }
    }
    if (changes['config']) {
      this.initEditor();
    }
  }

  /**
   * Initializes the editor.
   */
  private initEditor(): void {
    if (this.editorInstance) {
      this.editorInstance.destroy();
    }
    this.config = Object.assign(this.DEFAULT_CONFIG, this.config);
    tinymce.init({
      ...this.config,
      setup: (editor: any) =>	{
        this.editorInstance = editor;
        editor.on('init', () => {
          editor.setContent(this.content == undefined ? '' : this.content);
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
    console.log("TinymceComponent: getContent");
    if (this.editorInstance) {
      console.log('editor instance', this.editorInstance);
      return this.editorInstance.getContent();
    }
    return '';
  }

  /**
   * Retrieves the raw content from the TinyMCE editor.
   * @returns The raw content as a string.
   */
  getRawContent(): string {
    console.log("TinymceComponent: getRawContent");
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
    console.log('set content', content);
    if (this.editorInstance) {
      this.editorInstance.setContent(content);
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
