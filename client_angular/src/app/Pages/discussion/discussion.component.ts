import { Component, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { ContentsForConceptDTO } from '@DTOs/content.dto';
import { discussionFilterDTO } from '@DTOs/discussionFilter.dto';
import { DiscussionListComponent } from './discussion-list/discussion-list.component';
@Component({
  selector: 'app-discussion',
  templateUrl: './discussion.component.html',
  styleUrls: ['./discussion.component.css']
})
export class DiscussionComponent implements OnInit, OnChanges {

  //used to pass the filter data to the discussion list, ! is used to tell typescript that the variable is initialized in the html
  @ViewChild(DiscussionListComponent) discussionList!: DiscussionListComponent

  //used to pass available content 'cards' to the filter, but only 'trainedBy' is passed through
  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  //dummy content, used to pass the active concept node to the filter
  @Input() activeConceptNodeId: number = -1;

  @Input() filterData: discussionFilterDTO = {
    conceptNodeId: -1,
    contentNodeId: -1,
    authorId: -1,
    onlySolved: false,
    searchString: ""
  }

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges() {
    console.log("discussion component: " + this.activeConceptNodeId);
    if (this.activeConceptNodeId != -1 && this.filterData.conceptNodeId != this.activeConceptNodeId) {
      console.log("changing filter data");
      this.filterData.conceptNodeId = this.activeConceptNodeId;
      this.discussionList.listDiscussions(this.filterData);
    }
  }

  changeFilter(filterData: discussionFilterDTO) {
    //this.filterData = filterData;
    this.discussionList.listDiscussions(filterData);
  }

}
