import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ContentsForConceptDTO } from '@DTOs/index';

@Component({
  selector: 'app-content-list',
  templateUrl: './content-list.component.html',
  styleUrls: ['./content-list.component.scss']
})
export class ContentListComponent {

  @Input() activeConceptNodeId: any;
  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  // emitter for refreshing
  @Output() fetchContentsForConcept = new EventEmitter<void>();



}
