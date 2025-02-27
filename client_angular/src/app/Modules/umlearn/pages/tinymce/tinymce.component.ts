import { Component, Input, SimpleChanges } from '@angular/core';

declare var tinymce: any;

@Component({
  selector: 'app-tinymce',
  templateUrl: './tinymce.component.html',
  styleUrls: ['./tinymce.component.scss']
})
export class TinymceComponent {

  @Input() content: string = "";
  @Input() tinymceConfig: any = {};
  @Input() isMarkOnly: boolean = false;

  isReadonly: boolean = false;

  constructor(){}

  ngOnChanges( changes: SimpleChanges): void {
    if (changes['tinymceConfig'] && changes['content']) {
      const content = this.content;
      // do not change this here, change it over the content input
      const defaultConfig = {
        selector: '#tinymce',
        base_url: '/tinymce',
        suffix: '.min',
        branding: false,
        menubar: false,
        statusbar: false,

        // configurable data if injected:
        /* plugins: 'autoresize lists table link image code codesample',
        toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | link image | code codesample',
        min_height: 300,
        max_height: 500,
        resize: false, */

      };

      this.tinymceConfig = Object.assign(defaultConfig, this.tinymceConfig);
      tinymce.init({
        ...this.tinymceConfig,
        setup: (editor: any) => {
          editor.on('init', () => {
            editor.setContent(content == undefined ? '' : content);
          });
          editor.on('keydown', (e: any) => {
            if (this.isMarkOnly && (e.key !== 'ArrowLeft') && (e.key !== 'ArrowRight') && (e.key !== 'ArrowUp') && (e.key !== 'ArrowDown') && (e.key !== 'Shift')) { //!e.ctrlKey && !e.altKey && !e.metaKey
              // prevent arrow keys from moving the cursor
              e.preventDefault();
              return false;
            }
            return true;
          });
        }
      });
    }
  }

  /**
   * Change the view of the editor
   */
  changeView(){
    if (this.isReadonly) {
      tinymce.get("tinymce").mode.set("readonly");
    } else {
      tinymce.get("tinymce").mode.set("design");
    }
  }

  /**
   * Get the content of the editor
   * @returns the content of the editor
   */
  getContent(): string {
    return tinymce.get("tinymce").getContent();
  }

  /**
   * Set the content of the editor
   * @param content the content to set
   */
  setContent(content: string): void {
    tinymce.get("tinymce").setContent(content);
  }

  /**
   * Destroys the editor
   */
  destroy(): void {
    tinymce.get("tinymce").destroy();
  }

  /**
   * Lifecycle hook that is called when the component is destroyed.
   * destroys the TinyMCE instance.
   */
  ngOnDestroy(): void {
    tinymce.get("tinymce").destroy();
  }

}
