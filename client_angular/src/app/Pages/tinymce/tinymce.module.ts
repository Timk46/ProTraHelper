
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TinymceComponent } from './tinymce.component';

@NgModule({
  declarations: [TinymceComponent],
  imports: [
    CommonModule
  ],
  exports: [TinymceComponent]
})
export class TinymceModule { }
