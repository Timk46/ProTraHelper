import { Component, OnDestroy, OnInit } from '@angular/core';
import { map, Observable, Subscription } from 'rxjs';
import { GraphCommunicationService } from 'src/app/Services/graph/graphCommunication.service';
import { MatTabsModule } from '@angular/material/tabs';
import { ConceptNodeDTO } from '@DTOs/conceptNode.dto';
import { ContentsForConceptDTO } from '@DTOs/content.dto';
import { ContentService } from 'src/app/Services/content/content.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
  selector: 'app-conceptOverview',
  templateUrl: './conceptOverview.component.html',
  styleUrls: ['./conceptOverview.component.css'],
})
export class ConceptOverviewComponent implements OnInit, OnDestroy {
  private graphCommunicationService: GraphCommunicationService = GraphCommunicationService.getInstance();

  private activeConceptNodeSubscription: Subscription;
  activeTab: string = 'content';
  isHandset$: Observable<boolean> = this.bps.observe(Breakpoints.Handset)
  .pipe(
    map(result => result.matches)
  );
  // init with dummy node
  activeConceptNode: ConceptNodeDTO = {
    databaseId: -1,
    name: 'dummy',
    level: 0,
    description: 'dummy',
    expanded: false,
    parentIds: [],
    childIds: [],
    prerequisiteEdgeIds: [],
    successorEdgeIds: [],
    edgeChildIds: [],
  };

  // init empty
  contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };


  constructor(private contentService: ContentService, private bps: BreakpointObserver) {
      // subscribe to activeConceptNode changes in the graph and update the activeConceptNode and contentsForActiveConceptNode accordingly
      this.activeConceptNodeSubscription = this.graphCommunicationService.currentActiveNode.subscribe((activeConceptNode) => {
      if (activeConceptNode.databaseId > 0) { // dummy node is 0 - only update if a real node is selected
        this.activeConceptNode = activeConceptNode;
        this.contentService.fetchContentsForConcept(this.activeConceptNode.databaseId).subscribe(contentsForConcept =>  this.contentsForActiveConceptNode = contentsForConcept );
        }
    });
  }

  ngOnInit() {
    this.bps.observe([
      Breakpoints.Handset,
      Breakpoints.Tablet,
      Breakpoints.Web]).subscribe(result => {
    });
  }


  // unsubscribe to prevent memory leaks after component is destroyed
  ngOnDestroy() {
    if (this.activeConceptNodeSubscription) {
      this.activeConceptNodeSubscription.unsubscribe();
    }
  }
}
