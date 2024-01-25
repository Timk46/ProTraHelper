import { AfterViewInit, Component, ElementRef, Input, SimpleChanges } from '@angular/core';

declare var tinymce: any;

@Component({
  selector: 'app-tinymce',
  templateUrl: './tinymce.component.html',
  styleUrls: ['./tinymce.component.scss']
})
export class TinymceComponent {

  isReadonly: boolean = false;
  @Input() content: string = '';
  @Input() config: any = {};
  

  constructor(){}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content'] && changes['config']) {
      const content = this.content;

      const defaultConfig = {
        selector: '#editor',
        base_url: '/tinymce',
        suffix: '.min',
        menubar: false,
        statusbar: false,
        resize: false,
        branding: false,
      };

      this.config = Object.assign(defaultConfig, this.config);
      tinymce.init({
        ...this.config,
        setup: function (editor: any) {
          editor.on('init', () => {
            editor.setContent(content == undefined ? '' : content);
          });
        }
      })
    }
  }


  /**
   * Initialize tinymce editor
   */
  /* ngAfterViewInit(): void {
    tinymce.init({
      readonly: false,
      selector: '#editor',
      base_url: '/tinymce',
      suffix: '.min',
      plugins: 'autoresize lists table link image code codesample',
      toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | link image | code codesample',
      min_height: 300,
      max_height: 500,
      menubar: false,
      statusbar: false,
      resize: false,
      branding: false,
    });
  } */

  /**
   * Change the view of the editor
   */
  changeView(){
    if (this.isReadonly) {
      tinymce.get("editor").mode.set("readonly");
    } else {
      tinymce.get("editor").mode.set("design");
    }
  }

  /**
   * Get the content of the editor
   * @returns the content of the editor
   */
  getContent(): string {
    console.log("TinymceComponent: getContent");
    return tinymce.get("editor").getContent();
  }

  getRawContent(): string {
    console.log("TinymceComponent: getRawContent");
    return tinymce.get("editor").getContent({format: 'text'});
  }

  /**
   * Set the content of the editor
   * @param content the content to set
   */
  setContent(content: string): void {
    tinymce.get("editor").setContent(content);
  }

  /**
   * Destroys the editor
   */
  destroy(): void {
    tinymce.get("editor").destroy();
  }

  ngOnDestroy(): void {
    tinymce.get("editor").destroy();
  }

}
