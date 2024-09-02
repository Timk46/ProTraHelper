import { Component, OnDestroy, OnInit } from '@angular/core';
import { map, Observable, Subscription } from 'rxjs';
import { GraphCommunicationService } from 'src/app/Services/graph/graphCommunication.service';
import { ConceptNodeDTO, ContentsForConceptDTO, LinkableContentNodeDTO } from '@DTOs/index';
import { ContentService } from 'src/app/Services/content/content.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';
import { UserService } from 'src/app/Services/auth/user.service';
import { MatDialog } from '@angular/material/dialog';
import { CreateContentNodeDialogComponent } from '../lecturersView/create-content-node-dialog/create-content-node-dialog.component';
import { ContentLinkerService } from 'src/app/Services/contentLinker/content-linker.service';

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

  // for lecturers view
  protected isAdmin: boolean = false;
  protected editModeActive: boolean = false;

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


  constructor(
    private contentService: ContentService,
    private bps: BreakpointObserver,
    public sSS: ScreenSizeService,
    private userService: UserService,
    private dialog: MatDialog,
    private contentLinkerSerivce: ContentLinkerService
  ) {
    // subscribe to activeConceptNode changes in the graph and update the activeConceptNode and contentsForActiveConceptNode accordingly
    this.activeConceptNodeSubscription = this.graphCommunicationService.currentActiveNode.subscribe((activeConceptNode) => {
      if (activeConceptNode.databaseId > 0) { // dummy node is 0 - only update if a real node is selected
        this.activeConceptNode = activeConceptNode;
        this.contentService.fetchContentsForConcept(this.activeConceptNode.databaseId).subscribe(contentsForConcept =>  this.contentsForActiveConceptNode = contentsForConcept );
        }
    });

    // for lecturers view - check if user is admin
    this.isAdmin = this.userService.getRole() === 'ADMIN';
    localStorage.getItem('editModeActive') === 'true' ? this.editModeActive = true : this.editModeActive = false;
  }

  ngOnInit() {
    this.bps.observe([
      Breakpoints.Handset,
      Breakpoints.Tablet,
      Breakpoints.Web]).subscribe(result => {
    });
  }

  /**
   * Opens a dialog to create a content node if the user is an admin.
   * Creates a new linked content node based on the dialog result and updates the contents for the active concept node.
   */
  onCreateContentNode() {
    if (this.isAdmin) {
      const dialogRef = this.dialog.open(CreateContentNodeDialogComponent, {
        width: '400px'
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          const linkableContentNode: LinkableContentNodeDTO = {
            conceptNodeId: this.activeConceptNode.databaseId,
            name: result.name,
            description: result.description !== '' ? result.description : undefined,
            awardsLevel: result.difficulty
          };
          this.contentLinkerSerivce.createLinkedContentNode(linkableContentNode).subscribe((newContentNode) => {
            // update the contents for the active concept node
            this.contentService.fetchContentsForConcept(this.activeConceptNode.databaseId).subscribe(contentsForConcept =>  this.contentsForActiveConceptNode = contentsForConcept );
          });
        }
      });
    }
  }

  /**
   * Fetches contents for the active concept node.
   */
  onFetchContentsForConcept() {
    this.contentService.fetchContentsForConcept(this.activeConceptNode.databaseId).subscribe(contentsForConcept =>  this.contentsForActiveConceptNode = contentsForConcept );
  }


  // unsubscribe to prevent memory leaks after component is destroyed
  ngOnDestroy() {
    if (this.activeConceptNodeSubscription) {
      this.activeConceptNodeSubscription.unsubscribe();
    }
  }
}
