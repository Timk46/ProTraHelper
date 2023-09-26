import { Component, Input } from '@angular/core';
import { ContentService } from 'src/app/Services/content/content.service';
import { ConceptNodeDTO } from '@DTOs/conceptNode.dto';
import { ContentDTO } from '@DTOs/content.dto';

@Component({
  selector: 'app-question-filter',
  templateUrl: './question-filter.component.html',
  styleUrls: ['./question-filter.component.scss']
})
export class QuestionFilterComponent {
  allSelected : Boolean = true;
  filterSelection : Boolean = false;
  filterTitle : String = 'Filter auswählen';
  filterSelected : String = 'Python';

  // init with dummy node, but this is too much information
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


  constructor(private contentService: ContentService) {

  }

  /* if the "Alle" button is clicked */
  onAllQuestions() {
    this.allSelected = true;
    this.filterSelection = false;
    this.filterTitle = 'Filter auswählen';
    this.resetActiveConceptNode();
  }

  /* if the button for the filter selection is clicked */
  onSelectFilter() {
    this.allSelected = false;
    this.filterSelection = !this.filterSelection;
  }

  /* deprecated, at least not in use. TODO: reaction if 'filter' package is emitted */
  onFilterSelected(){
    this.filterSelection = false;
    this.allSelected = false;
    this.filterTitle = 'Filter: ' + this.activeConceptNode.name;
  }

  // reset activeConceptNode to dummy node
  resetActiveConceptNode() {
    this.activeConceptNode = {
      databaseId: -1,
      name: 'dummy',
      level: 0,
      expanded: false,
      parentIds: [],
      childIds: [],
      prerequisiteEdgeIds: [],
      successorEdgeIds: [],
      edgeChildIds: [],
    }
  }
}
