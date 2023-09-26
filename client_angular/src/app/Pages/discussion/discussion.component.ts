import { Component, Input, OnInit } from '@angular/core';
import { ContentsForConceptDTO } from '@DTOs/content.dto';
import { ConceptNodeDTO } from '@DTOs/conceptNode.dto';
@Component({
  selector: 'app-discussion',
  templateUrl: './discussion.component.html',
  styleUrls: ['./discussion.component.css']
})
export class DiscussionComponent implements OnInit {

  //used to pass available content 'cards' to the filter, but only 'trainedBy' is passed through
  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  //dummy content, used to pass the active concept node to the filter
  @Input() activeConceptNode: ConceptNodeDTO = {
    databaseId: -1,
    name: 'dummy',
    level: 0,
    expanded: false,
    parentIds: [],
    childIds: [],
    prerequisiteEdgeIds: [],
    successorEdgeIds: [],
    edgeChildIds: [],
  };

  constructor() { }

  ngOnInit() {
  }

}
