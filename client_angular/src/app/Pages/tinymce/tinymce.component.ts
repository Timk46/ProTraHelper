import { AfterViewInit, Component, ElementRef } from '@angular/core';

declare var tinymce: any;

@Component({
  selector: 'app-tinymce',
  templateUrl: './tinymce.component.html',
  styleUrls: ['./tinymce.component.scss']
})
export class TinymceComponent implements AfterViewInit {

  isReadonly: boolean = false;

  constructor(){}

  /**
   * Initialize tinymce editor
   */
  ngAfterViewInit(): void {
    tinymce.init({
      readonly: false,
      selector: '#editor',
      base_url: '/tinymce',
      suffix: '.min',
      plugins: 'lists table link image code codesample',
      toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | numlist bullist | table | link image | code codesample',
      height: 400,
      menubar: false,
      statusbar: false,
      resize: false,
      branding: false,
    });
  }

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
