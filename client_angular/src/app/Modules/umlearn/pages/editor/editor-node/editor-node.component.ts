import { EditorElement } from '@DTOs/index';
import { ClassNode } from '@DTOs/index';
import { Component, ElementRef, Input, SimpleChanges } from '@angular/core';
import { NotificationService } from '@UMLearnServices/notification.service';


@Component({
  selector: 'app-editor-node',
  templateUrl: './editor-node.component.html',
  styleUrls: ['./editor-node.component.scss']
})
export class EditorNodeComponent {

  @Input() model!: string;
  @Input() backgroundColor: string | undefined;
  @Input() elementData : ClassNode = {
    identification: "",
    type: EditorElement.CD_CLASS,
    id: "",
    position: {x: 0, y: 0},
    width: 0,
    height: 0,
  };

  editorElementEnum = EditorElement;
  updatedTitle: any = null;
  updatedType: any = null;
  addedAttributes: any[] = [];
  updatedAttributes: any[] = [];
  deletedAttributes: any[] = [];
  updatedMethods: any[] = [];
  addedMethods: any[] = [];
  deletedMethods: any[] = [];

  constructor(public el: ElementRef) { }

  ngOnChanges(changes: SimpleChanges){
    if (this.elementData.highlighted) {
      if (this.elementData.highlighted.updated) {
        if (this.elementData.highlighted.updated.title) {
          this.updatedTitle = this.elementData.highlighted.updated.title;
        }
        if (this.elementData.highlighted.updated.attributes) {
          this.updatedAttributes = this.elementData.highlighted.updated.attributes;
        }
        if (this.elementData.highlighted.updated.methods) {
          this.updatedMethods = this.elementData.highlighted.updated.methods;
        }
      }

      if (this.elementData.highlighted.added) {
        if (this.elementData.highlighted.added.attributes) {
          this.addedAttributes = this.elementData.highlighted.added.attributes;
        }
        if (this.elementData.highlighted.added.methods) {
          this.addedMethods = this.elementData.highlighted.added.methods;
        }
      }

      if (this.elementData.highlighted.deleted) {
        if (this.elementData.highlighted.deleted.attributes) {
          this.deletedAttributes = this.elementData.highlighted.deleted.attributes;
        }
        if (this.elementData.highlighted.deleted.methods) {
          this.deletedMethods = this.elementData.highlighted.deleted.methods;
        }
      }

      if(this.elementData.highlighted.code == "missing") {
        this.backgroundColor = "#A9A9A9";
      }
      if(this.elementData.highlighted.code == "not_found") {
        this.backgroundColor = "#FFFFE0";
      }
    }
  }
}


