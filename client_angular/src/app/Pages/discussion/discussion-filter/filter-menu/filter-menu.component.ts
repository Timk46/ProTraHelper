import { ContentDTO } from '@DTOs/content.dto';
import { discussionFilterDTO } from '@DTOs/discussionFilter.dto';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FloatLabelType } from '@angular/material/form-field';

@Component({
  selector: 'app-filter-menu',
  templateUrl: './filter-menu.component.html',
  styleUrls: ['./filter-menu.component.scss']
})

export class FilterMenuComponent {

  //selectedContent = new FormControl('-1' as FloatLabelType);
  //solvedChecked = new FormControl(false);
  //@ViewChild('searchInput') searchInput: ElementRef = new ElementRef('');

  @Input() activeConceptNodeId: number = -1;

  // dummy data for the content nodes
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

  /**
   * Emits the filter data based on the selected content node, the search input and the solved checkbox
   * @param contentId
   * @param searchInput
   * @param solvedChecked
   */
  onFilterSelected(contentId: number, searchInput: string, solvedChecked: boolean) {
    const newFilterData: discussionFilterDTO = {
      conceptNodeId: this.activeConceptNodeId,
      contentNodeId: contentId || -1, // || is used to convert undefined to -1
      authorId: -1,
      onlySolved: solvedChecked, // !! converts to boolean
      searchString: searchInput,
    };
    this.changeFilter.emit(newFilterData);
  }
}
