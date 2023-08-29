import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { GraphCommunicationService } from 'src/app/Services/graphCommunication.service';
import { MatTabsModule } from '@angular/material/tabs';
import { ConceptNodeDTO } from '@DTOs/conceptNode.dto';

@Component({
  selector: 'app-conceptOverview',
  templateUrl: './conceptOverview.component.html',
  styleUrls: ['./conceptOverview.component.css'],
})
export class ConceptOverviewComponent implements OnInit, OnDestroy {
  private graphCommunicationService: GraphCommunicationService = GraphCommunicationService.getInstance();

  private activeNodeSubscription: Subscription;

  activeNodeTestDisplay: String = ''; // for testing only

  // init with dummy node
  activeNode: ConceptNodeDTO = {
    databaseId: 0,
    name: 'dummy',
    level: 0,
    expanded: false,
    parentIds: [],
    childIds: [],
    prerequisiteEdgeIds: [],
    successorEdgeIds: [],
    edgeChildIds: [],
  };

  constructor() {
    this.activeNodeSubscription = this.graphCommunicationService.currentActiveNode.subscribe((ActiveNode) => {
      if (ActiveNode != null) {
        this.activeNode = ActiveNode; // TODO: type
        this.activeNodeTestDisplay = JSON.stringify(this.activeNode);
      }
    });
  }

  ngOnInit() {
  }

  // unsubscribe to prevent memory leaks after component is destroyed
  ngOnDestroy() {
    if (this.activeNodeSubscription) {
      this.activeNodeSubscription.unsubscribe();
    }
  }
}
