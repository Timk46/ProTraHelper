import { Component, Input, OnInit } from '@angular/core';
import { ContentsForConceptDTO } from '@DTOs/content.dto';
@Component({
  selector: 'app-discussion',
  templateUrl: './discussion.component.html',
  styleUrls: ['./discussion.component.css']
})
export class DiscussionComponent implements OnInit {

  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  constructor() { }

  ngOnInit() {
  }

}
