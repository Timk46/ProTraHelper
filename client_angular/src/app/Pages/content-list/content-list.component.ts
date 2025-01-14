import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ContentsForConceptDTO } from '@DTOs/index';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-content-list',
  templateUrl: './content-list.component.html',
  styleUrls: ['./content-list.component.scss'],
  animations: [
    trigger('contentExpand', [
      state('collapsed', style({
        height: '0',
        opacity: 0,
        overflow: 'hidden'
      })),
      state('expanded', style({
        height: '*',
        opacity: 1
      })),
      transition('collapsed <=> expanded', animate('200ms ease-out'))
    ])
  ]
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
