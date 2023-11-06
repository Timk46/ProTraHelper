import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ContentService } from 'src/app/Services/content/content.service';
import { ContentDTO } from '@DTOs/content.dto';
import { discussionFilterDTO } from '@DTOs/discussionFilter.dto';

@Component({
  selector: 'app-discussion-filter',
  templateUrl: './discussion-filter.component.html',
  styleUrls: ['./discussion-filter.component.scss']
})
export class DiscussionFilterComponent {
  allSelected : Boolean = true;
  filterSelection : Boolean = false;
  filterTitle : String = 'Filter auswählen';
  filterSelected : String = 'Python';

  // init with dummy node, but this is too much information
  @Input() activeConceptNodeId: number = -1

  // should contain all the content 'cards', but also with too much information
  @Input() contentNodes: ContentDTO[] = [{
    contentNodeId: -1,
    name: "dummy content",
    description: "dummy description",
    contentElements: [],
    contentPrerequisiteIds: [],
    contentSuccessorIds: [],
    requiresConceptIds: [],
    trainsConceptIds: [],
    }
  ];

  @Output() changeFilter = new EventEmitter<discussionFilterDTO>();


  constructor(private contentService: ContentService) {  }

  /**
   * Emits the filter data for all discussions
   */
  onAllDiscussions() {
    this.allSelected = true;
    this.filterSelection = false;
    this.filterTitle = 'Filter auswählen';
    this.changeFilter.emit({
      conceptNodeId: this.activeConceptNodeId,
      contentNodeId: -1,
      authorId: -1,
      onlySolved: false,
      searchString: ""
    });
  }

  /**
   * Switches the filter selection on and off
   */
  onSelectFilter() {
    this.allSelected = false;
    this.filterSelection = !this.filterSelection;
  }

  /**
   * if a filter is selected, the filter title is changed and the filter data is emitted
   * @param filterData
   */
  onFilterSelected(filterData: discussionFilterDTO){
    this.filterSelection = false;
    this.allSelected = false;
    this.filterTitle = 'Filter eingestellt';
    this.changeFilter.emit(filterData);
  }

}
