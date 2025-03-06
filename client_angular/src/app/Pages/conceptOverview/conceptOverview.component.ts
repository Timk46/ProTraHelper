import { Component, OnDestroy, OnInit } from '@angular/core';
import { filter, map, Observable, Subscription } from 'rxjs';
import { GraphCommunicationService } from 'src/app/Services/graph/graphCommunication.service';
import { ConceptNodeDTO, ContentsForConceptDTO, LinkableContentNodeDTO, QuestionDTO } from '@DTOs/index';
import { ContentService } from 'src/app/Services/content/content.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';
import { UserService } from 'src/app/Services/auth/user.service';
import { MatDialog } from '@angular/material/dialog';
import { CreateContentNodeDialogComponent } from '../lecturersView/create-content-node-dialog/create-content-node-dialog.component';
import { ContentLinkerService } from 'src/app/Services/contentLinker/content-linker.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { GraphDataService } from 'src/app/Services/graph/graph-data.service';

@Component({
  selector: 'app-conceptOverview',
  templateUrl: './conceptOverview.component.html',
  styleUrls: ['./conceptOverview.component.css'],
})
export class ConceptOverviewComponent implements OnInit, OnDestroy {
  private graphCommunicationService: GraphCommunicationService =
  GraphCommunicationService.getInstance();
  isQuestionRoute = false;
  private activeConceptNodeSubscription: Subscription;
  activeTab: string = 'content';
  isHandset$: Observable<boolean> = this.bps
    .observe(Breakpoints.Handset)
    .pipe(map((result) => result.matches));

  // for lecturers view
  protected isAdmin: boolean = false;
  protected editModeActive: boolean = false;

  // init with dummy node
  activeConceptNode: ConceptNodeDTO = {
    databaseId: -1,
    name: 'dummys',
    level: 0,
    description: 'dummy',
    expanded: false,
    parentIds: [],
    childIds: [],
    prerequisiteEdgeIds: [],
    successorEdgeIds: [],
    edgeChildIds: [],
  };
  activeQuestionId: number | null = null;
  activeQuestion: any;
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
    private contentLinkerSerivce: ContentLinkerService,
    private route: ActivatedRoute,
    private questionService: QuestionDataService,
    private router: Router,
    private graphDataService: GraphDataService
  ) {
    // subscribe to activeConceptNode changes in the graph and update the activeConceptNode and contentsForActiveConceptNode accordingly
    this.activeConceptNodeSubscription =
      this.graphCommunicationService.currentActiveNode.subscribe(
        (activeConceptNode) => {
          if (activeConceptNode.databaseId > 0) {
            // dummy node is 0 - only update if a real node is selected
            this.activeConceptNode = activeConceptNode;
            this.contentService
              .fetchContentsForConcept(this.activeConceptNode.databaseId)
              .subscribe(
                (contentsForConcept) =>
                  (this.contentsForActiveConceptNode = contentsForConcept)
              );
          }
        }
      );
      this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.isQuestionRoute = this.router.url.includes('/question/');
    });
  }

  ngOnInit() {
    //this.isAdmin = this.userService.isAdmin();

    // Prüfen auf 'id' Parameter in der Route
    this.route.paramMap.subscribe((params) => {
      const conceptId = params.get('conceptId');
      const questionId = params.get('questionId');

      if (conceptId) {
        this.activeConceptNode.databaseId = +conceptId;
        this.loadConceptNode(this.activeConceptNode.databaseId);
      }

      if (questionId) {
        this.activeQuestionId = +questionId;
        console.log(typeof this.activeQuestionId);
        this.loadQuestion(this.activeQuestionId);
      }
    });
    this.bps
      .observe([Breakpoints.Handset, Breakpoints.Tablet, Breakpoints.Web])
      .subscribe((result) => {});
    this.userService.hasEditModeActive$.subscribe((hasEditModeActive) => {
      this.editModeActive = hasEditModeActive;
    });
  }

  /**
   * Navigates to the dynamic question route with questionType
   */
  loadQuestion(questionId: number) {
    this.questionService.getQuestionData(questionId).subscribe((question: QuestionDTO) => {
      this.navigateToQuestion(this.activeConceptNode.databaseId, question.id);
    });
  }

  /**
   * Navigates to the dynamic question route
   * @param conceptId
   * @param questionId
   * @param questionType
   */
  navigateToQuestion(conceptId: number, questionId: number): void {

    this.router.navigate([
      '/dashboard/concept',
      conceptId,
      'question',
      questionId,
    ]);
  }

  loadConceptNode(conceptNodeId: number) {
    // First, fetch contents for the concept
    this.contentService
      .fetchContentsForConcept(conceptNodeId)
      .subscribe((contentsForConcept) => {
        this.contentsForActiveConceptNode = contentsForConcept;
      });

    // When navigating directly to a concept URL, we need to fetch concept node data
    // and update the activeConceptNode instead of showing dummy values
    if (this.activeConceptNode.databaseId === -1 || this.activeConceptNode.name === 'dummys') {
      // We'll use GraphDataService to fetch the concept graph and extract the node
      this.graphDataService.fetchUserGraph(1) // Using module ID 1 as default; adjust if needed
        .subscribe((graph) => {
          // Check if the concept node exists in the graph
          if (graph.nodeMap[conceptNodeId]) {
            const conceptNode = graph.nodeMap[conceptNodeId];
            // Update the active concept node
            this.activeConceptNode = conceptNode;
            // Also notify the GraphCommunicationService to keep state consistent
            this.graphCommunicationService.changeActiveNode(conceptNode);
          }
        });
    }
  }

  /**
   * Opens a dialog to create a content node if the user is an admin.
   * Creates a new linked content node based on the dialog result and updates the contents for the active concept node.
   */
  onCreateContentNode() {
    if (this.isAdmin) {
      const dialogRef = this.dialog.open(CreateContentNodeDialogComponent, {
        width: '400px',
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          const linkableContentNode: LinkableContentNodeDTO = {
            conceptNodeId: this.activeConceptNode.databaseId,
            name: result.name,
            description:
              result.description !== '' ? result.description : undefined,
            awardsLevel: result.difficulty,
          };
          this.contentLinkerSerivce
            .createLinkedContentNode(linkableContentNode)
            .subscribe((newContentNode) => {
              // update the contents for the active concept node
              this.contentService
                .fetchContentsForConcept(this.activeConceptNode.databaseId)
                .subscribe(
                  (contentsForConcept) =>
                    (this.contentsForActiveConceptNode = contentsForConcept)
                );
            });
        }
      });
    }
  }

  /**
   * Fetches contents for the active concept node.
   */
  onFetchContentsForConcept() {
    this.contentService
      .fetchContentsForConcept(this.activeConceptNode.databaseId)
      .subscribe(
        (contentsForConcept) =>
          (this.contentsForActiveConceptNode = contentsForConcept)
      );
  }

  // unsubscribe to prevent memory leaks after component is destroyed
  ngOnDestroy() {
    if (this.activeConceptNodeSubscription) {
      this.activeConceptNodeSubscription.unsubscribe();
    }
  }
}
