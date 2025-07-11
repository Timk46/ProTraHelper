import type { OnChanges } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import type {
  discussionFilterContentNodeDTO,
  discussionFilterDTO,
} from '@DTOs/discussionFilter.dto';
import type { DiscussionListService } from 'src/app/Services/discussion/discussion-list.service';

@Component({
  selector: 'app-discussion-filter',
  templateUrl: './discussion-filter.component.html',
  styleUrls: ['./discussion-filter.component.scss'],
})
export class DiscussionFilterComponent implements OnChanges {
  allSelected: boolean = true;
  filterSelection: boolean = false;
  filterTitle: string = 'Filter auswählen';
  filterSelected: string = 'Python';

  contentNodes: discussionFilterContentNodeDTO[] = [];

  @Input() activeConceptNodeId: number = -1;
  @Output() changeFilter = new EventEmitter<discussionFilterDTO>();

  constructor(private readonly discussionListService: DiscussionListService) {}

  ngOnChanges() {
    if (this.activeConceptNodeId > -1) {
      this.discussionListService
        .getFilterContentNodes(this.activeConceptNodeId)
        .subscribe(contentNodes => {
          this.contentNodes = contentNodes;
        });
    }
  }

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
      searchString: '',
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
  onFilterSelected(contentId: number, searchInput: string, solvedChecked: boolean) {
    this.filterSelection = false;
    this.allSelected = false;
    this.filterTitle = 'Filter eingestellt';
    this.changeFilter.emit({
      conceptNodeId: this.activeConceptNodeId,
      contentNodeId: contentId || -1, // || is used to convert undefined to -1
      authorId: -1,
      onlySolved: solvedChecked, // !! converts to boolean
      searchString: searchInput,
    });
  }
}
