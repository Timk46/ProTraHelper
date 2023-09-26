import { ContentDTO } from '@DTOs/content.dto';
import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ThemePalette } from '@angular/material/core';
import { FloatLabelType } from '@angular/material/form-field';

@Component({
  selector: 'app-filter-menu',
  templateUrl: './filter-menu.component.html',
  styleUrls: ['./filter-menu.component.scss']
})

export class FilterMenuComponent {

  /* a temporary savestate to save the latest selection */
  currentSeleciton = {
    selectedContent: '-1',
    solvedChecked: false,
    searchInput: '',
  };

  selectedContent = new FormControl('-1' as FloatLabelType);
  solvedChecked = new FormControl(false);
  @ViewChild('searchInput') searchInput: ElementRef = new ElementRef('');

  // dummy data for the content 'cards'
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

  /* debug */
  onClick() {
    console.log(this.selectedContent.value);
    console.log(this.solvedChecked.value);
    console.log(this.searchInput.nativeElement.value);
  }

  /* checks if the new selection differs from the last one, only then a filter signal should be emitted */
  onFilterSelected() {
    let newSeleciton = {
        selectedContent: this.selectedContent.value as string,
        solvedChecked: this.solvedChecked.value as boolean,
        searchInput: this.searchInput.nativeElement.value as string,
    }
    if (
        newSeleciton.selectedContent !== this.currentSeleciton.selectedContent ||
        newSeleciton.solvedChecked !== this.currentSeleciton.solvedChecked ||
        newSeleciton.searchInput !== this.currentSeleciton.searchInput
    ) {
      this.currentSeleciton = newSeleciton;
      console.log("Filter accepted");
    }
  }
}
