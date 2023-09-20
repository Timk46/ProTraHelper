import { Component } from '@angular/core';
import { Subscription} from 'rxjs';
import { ContentService } from 'src/app/Services/content/content.service';
import { GraphCommunicationService } from 'src/app/Services/graphCommunication.service';
import { ConceptNodeDTO } from '@DTOs/conceptNode.dto';

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

  // init with dummy node
  activeConceptNode: ConceptNodeDTO = {
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

  private graphCommunicationService: GraphCommunicationService = GraphCommunicationService.getInstance();
  private activeConceptNodeSubscription: Subscription;

  constructor(private contentService: ContentService) {
    // subscribe to activeConceptNode changes in the graph and update the activeConceptNode and contentsForActiveConceptNode accordingly
    this.activeConceptNodeSubscription = this.graphCommunicationService.currentActiveNode.subscribe((activeConceptNode) => {
    if (activeConceptNode.databaseId > -1) {
      this.activeConceptNode = activeConceptNode;
      //this.contentService.fetchContentsForConcept(this.activeConceptNode.databaseId).subscribe(contentsForConcept =>  this.contentsForActiveConceptNode = contentsForConcept );
      }
    });
  }

  onAllQuestions() {
    this.allSelected = true;
    this.filterSelection = false;
    this.filterTitle = 'Filter auswählen';
    this.resetActiveConceptNode();
  }

  onSelectFilter() {
    this.allSelected = false;
    this.filterSelection = !this.filterSelection;
  }

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

  // unsubscribe to prevent memory leaks after component is destroyed
  ngOnDestroy() {
    if (this.activeConceptNodeSubscription) {
      this.activeConceptNodeSubscription.unsubscribe();
    }
  }
}
