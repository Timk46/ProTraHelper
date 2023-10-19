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

  selectedContent = new FormControl('-1' as FloatLabelType);
  solvedChecked = new FormControl(false);
  @ViewChild('searchInput') searchInput: ElementRef = new ElementRef('');

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

  /* a temporary savestate to save the latest selection */
  filterData: discussionFilterDTO = {
    conceptNodeId: -1,
    contentNodeId: -1,
    authorId: -1,
    onlySolved: false,
    searchString: ""
  }

  /* debug */
  onClick() {
    console.log(this.selectedContent.value);
    console.log(this.solvedChecked.value);
    console.log(this.searchInput.nativeElement.value);
  }

  /**
   * if a filter is selected, the filter title is changed and the filter data is emitted
   */
  onFilterSelected() {
    const newFilterData: discussionFilterDTO = {
      conceptNodeId: this.activeConceptNodeId,
      contentNodeId: parseInt(this.selectedContent.value || '-1'), // || is used to convert undefined to -1
      authorId: -1,
      onlySolved: !!this.solvedChecked.value, // !! converts to boolean
      searchString: this.searchInput.nativeElement.value,
    };
    if (
        /* newSeleciton.selectedContent !== this.currentSeleciton.selectedContent ||
        newSeleciton.solvedChecked !== this.currentSeleciton.solvedChecked ||
        newSeleciton.searchInput !== this.currentSeleciton.searchInput */
        newFilterData !== this.filterData
    ) {
      this.filterData = newFilterData;
      this.changeFilter.emit(this.filterData);
      console.log("Filter accepted. filterData:");
      console.log(this.filterData);
    }
  }
}
