import { ConceptGraphDTO } from '@DTOs/conceptGraph.dto';
import { ConceptNodeDTO } from '@DTOs/conceptNode.dto';
import { Component, ViewChild, Input, Output, OnInit, ElementRef, AfterViewChecked } from '@angular/core';
import { GraphDataService } from 'src/app/Services/graph/graph-data.service';
import { GraphCommunicationService } from 'src/app/Services/graph/graphCommunication.service';
import { debounceTime, Subject } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mobile-navigator',
  templateUrl: './mobile-navigator.component.html',
  styleUrls: ['./mobile-navigator.component.scss'],
  animations: [
    trigger('searchAnimation', [
      transition(':enter', [
        style({ opacity: 0, width: '0%' }),
        animate('200ms ease-out', style({ opacity: 1, width: '100%' })),
      ]),
      transition(':leave', [
        style({ opacity: 1, width: '100%' }),
        animate('200ms ease-in', style({ opacity: 0, width: '0%' })),
      ]),
    ]),
  ],
})
export class MobileNavigatorComponent implements OnInit, AfterViewChecked {
  // Search functionality
  searchQuery: string = '';
  searchResults: ConceptNodeDTO[] = [];
  isSearchVisible: boolean = false;
  private readonly searchSubject = new Subject<string>();

  @ViewChild('searchInput') searchInput!: ElementRef;
  @Input() selectionMode: boolean = false; // If true, only return the concept ID on selection, no navigation
  @Output() selectionChange: Subject<number> = new Subject<number>();

  private readonly graphCommunicationService: GraphCommunicationService =
    GraphCommunicationService.getInstance();
  loadingDone: boolean = false;

  userGraphData: ConceptGraphDTO = {
    id: -1,
    name: 'Loading...',
    trueRootId: -1,
    nodeMap: {},
    edgeMap: {},
    currentConceptId: -1,
  };
  openLayers: { id: number; name: string; isRoot: boolean; nodes: ConceptNodeDTO[] }[] = [];
  currentLayer: number = -1;
  currentNodeId: number = -1;
  lastActiveNodeId: number = -1;
  currUserModule: number = 1; //NEEDS TO BE CHANGED if multiple modules are implemented

  constructor(
    private readonly graphDataService: GraphDataService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    // Fetch graph data
    this.graphDataService.fetchUserGraph(this.currUserModule).subscribe({
      next: (data: ConceptGraphDTO) => {
        if (!data?.nodeMap || Object.keys(data.nodeMap).length === 0) {
          console.error('Received invalid or empty graph data structure.', data);
          this.userGraphData.name = 'Error Loading Graph';
          this.loadingDone = true;
          return;
        }
        this.userGraphData = data;
        console.log('User Graph Data Loaded:', this.userGraphData);

        // --- Initialization Logic to Show Node 2 ---
        const targetNodeId = 2;
        let initialNodeId = -1;
        let initialLayerId = -1;

        if (data.nodeMap[targetNodeId]) {
          console.log(`Target node ${targetNodeId} found. Setting initial state.`);
          initialNodeId = targetNodeId;
          const targetNode = data.nodeMap[targetNodeId];
          // Determine the layer: parent if leaf, self if has children
          if (
            targetNode.childIds.length === 0 &&
            targetNode.parentIds.length > 0 &&
            data.nodeMap[targetNode.parentIds[0]]
          ) {
            initialLayerId = targetNode.parentIds[0];
          } else {
            initialLayerId = targetNodeId; // Node itself is the layer or it's a root leaf
          }
          console.log(`Initial Node ID: ${initialNodeId}, Initial Layer ID: ${initialLayerId}`);
        } else {
          // Fallback logic if node 2 doesn't exist
          console.warn(
            `Target node ${targetNodeId} not found in graph data. Falling back to default logic.`,
          );
          if (
            data.currentConceptId &&
            data.currentConceptId !== -1 &&
            data.nodeMap[data.currentConceptId]
          ) {
            initialNodeId = data.currentConceptId;
            const initialNode = data.nodeMap[initialNodeId];
            if (
              initialNode.childIds.length === 0 &&
              initialNode.parentIds.length > 0 &&
              data.nodeMap[initialNode.parentIds[0]]
            ) {
              initialLayerId = initialNode.parentIds[0];
            } else {
              initialLayerId = initialNodeId;
            }
          } else if (data.trueRootId !== -1 && data.nodeMap[data.trueRootId]) {
            initialNodeId = data.trueRootId;
            initialLayerId = data.trueRootId;
            console.log(
              `CurrentConceptId invalid or missing (${data.currentConceptId}), falling back to trueRootId: ${initialNodeId}`,
            );
          } else {
            console.error(
              'Could not determine a valid initial node. Both currentConceptId and trueRootId are invalid or missing, and target node 2 was not found.',
            );
            this.userGraphData.name = 'Error: No Valid Start Node';
            this.loadingDone = true;
            return;
          }
        }

        // Set state based on determined IDs
        if (initialLayerId !== -1 && data.nodeMap[initialLayerId] && initialNodeId !== -1) {
          this.currentLayer = initialLayerId;
          this.openLayers = this.getOpenedLayers(initialLayerId);
          console.log('Initial Layers:', this.openLayers);

          this.currentNodeId = initialNodeId;

          if (!this.selectionMode) {
            // Use setTimeout to ensure the view updates before changing active node and navigating
            setTimeout(() => {
              this.changeActiveNode(initialNodeId).then(() => {
                console.log(
                  `Navigating to initial concept route: /dashboard/concept/${initialNodeId}`,
                );
                this.router
                  .navigate(['/dashboard/concept', initialNodeId], { replaceUrl: true })
                  .then(success => {
                    if (!success) {
                      console.error(
                        `Navigation to /dashboard/concept/${initialNodeId} failed! Check routes.`,
                      );
                    }
                  })
                  .catch(error => console.error('Error during initial navigation:', error));
              });
            }, 0);
          }
        } else {
          console.error(
            `Calculated initialLayerId (${initialLayerId}) or initialNodeId (${initialNodeId}) is invalid or node does not exist in nodeMap.`,
          );
          this.userGraphData.name = 'Error: Invalid Start Layer/Node';
        }

        this.loadingDone = true;
      },
      error: err => {
        console.error('Error fetching user graph data:', err);
        this.userGraphData.name = 'Error Fetching Graph';
        this.loadingDone = true;
      },
    });

    // Setup search with debounce
    this.searchSubject
      .pipe(
        debounceTime(300), // Wait for 300ms pause in events
      )
      .subscribe(searchTerm => {
        this.performSearch(searchTerm);
      });

    // Listen for escape key to close search
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.isSearchVisible) {
        this.hideSearch();
      }
    });
  }

  ngAfterViewChecked(): void {
    // Focus the search input when it becomes visible
    if (this.isSearchVisible && this.searchInput?.nativeElement) {
      try {
        setTimeout(() => {
          if (this.searchInput?.nativeElement) {
            this.searchInput.nativeElement.focus();
          }
        }, 0);
      } catch (err) {
        // Ignore focus errors - they can happen during transitions
        console.debug('Focus error ignored:', err);
      }
    }
  }

  /**
   * Handles input in the search field
   */
  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  /**
   * Shows the search input and hides the breadcrumb
   */
  showSearch(): void {
    this.isSearchVisible = true;
  }

  /**
   * Hides the search input and shows the breadcrumb
   */
  hideSearch(): void {
    this.isSearchVisible = false;
    this.clearSearch();
  }

  /**
   * Performs the actual search and populates search results
   */
  private performSearch(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.searchResults = [];
      return;
    }
    if (!this.userGraphData?.nodeMap) {
      this.searchResults = [];
      return;
    }
    this.searchResults = Object.values(this.userGraphData.nodeMap)
      .filter(node => node.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 10); // Limit to 10 results
  }

  /**
   * Clears the search query and results
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
  }

  /**
   * Navigates to a selected search result
   */
  navigateToSearchResult(node: ConceptNodeDTO): void {
    if (!this.userGraphData.nodeMap[node.databaseId]) {
      console.error(
        `Cannot navigate to search result: Node ${node.databaseId} not found in graph.`,
      );
      return;
    }

    const targetNode = this.userGraphData.nodeMap[node.databaseId];
    let targetLayerId: number;

    if (targetNode.childIds.length > 0) {
      targetLayerId = targetNode.databaseId;
    } else if (
      targetNode.parentIds.length > 0 &&
      this.userGraphData.nodeMap[targetNode.parentIds[0]]
    ) {
      targetLayerId = targetNode.parentIds[0];
    } else {
      targetLayerId = targetNode.databaseId; // Fallback: node is the layer (root leaf?)
    }

    this.currentLayer = targetLayerId;
    this.openLayers = this.getOpenedLayers(this.currentLayer);
    this.currentNodeId = targetNode.databaseId;

    this.hideSearch();

    if (this.selectionMode) {
      // If in selection mode, emit the selected concept ID
      this.selectionChange.next(this.currentNodeId);
      console.log('Selection Mode: Emitted currentNodeId:', this.currentNodeId);
    } else {
      this.changeActiveNode(this.currentNodeId).then(() => {
        this.router.navigate(['/dashboard/concept', this.currentNodeId]);
      });
    }
  }

  /**
   * Retrieves the opened layers for a given node ID.
   * Each layer contains information about the layer ID, name, nodes, and whether it is the root layer.
   * @param nodeId - The ID of the node to retrieve the opened layers for.
   * @returns An array of objects representing the opened layers, sorted in reverse order.
   */
  getOpenedLayers(
    nodeId: number,
  ): { id: number; name: string; nodes: ConceptNodeDTO[]; isRoot: boolean }[] {
    const layers: { id: number; name: string; nodes: ConceptNodeDTO[]; isRoot: boolean }[] = [];
    let currentId = nodeId;
    let layerIndex = 0;
    const maxDepth = 20; // Safety break for potential cycles or deep graphs

    // Ensure the starting node exists
    if (!this.userGraphData.nodeMap[currentId]) {
      console.error(`getOpenedLayers: Starting node ${currentId} does not exist.`);
      return [];
    }

    while (currentId !== -1 && this.userGraphData.nodeMap[currentId] && layerIndex < maxDepth) {
      const currentNode = this.userGraphData.nodeMap[currentId];
      const nodesInLayer: ConceptNodeDTO[] = this.getNodeLayer(currentId); // Get nodes for the *current* layer (parent perspective)
      layers[layerIndex] = {
        id: currentId,
        name: currentNode.name,
        nodes: nodesInLayer, // Store nodes belonging to this layer view
        isRoot: currentNode.parentIds.length === 0,
      };
      currentId = currentNode.parentIds.length > 0 ? currentNode.parentIds[0] : -1;
      layerIndex++;
    }

    if (layerIndex >= maxDepth) {
      console.warn('getOpenedLayers reached max depth, possible cycle or very deep graph.');
    }
    return layers.reverse(); // Reverse to get root -> current path
  }

  /**
   * Adds a new layer to the openLayers array when navigating deeper.
   */
  addOpenedLayer(nodeId: number): void {
    if (this.userGraphData.nodeMap[nodeId]) {
      const nodes = this.getNodeLayer(nodeId);
      // Avoid adding duplicate layers if already present
      if (this.openLayers.findIndex(layer => layer.id === nodeId) === -1) {
        this.openLayers.push({
          id: nodeId,
          name: this.userGraphData.nodeMap[nodeId].name,
          nodes: nodes,
          isRoot: this.userGraphData.nodeMap[nodeId].parentIds.length === 0,
        });
        console.log(
          'Added Layer:',
          nodeId,
          'Open Layers:',
          this.openLayers.map(l => l.id),
        );
      } else {
        console.log(`Layer ${nodeId} is already open.`);
      }
    } else {
      console.error(`Attempted to add layer for non-existent node ID: ${nodeId}`);
    }
  }

  /**
   * Retrieves the concept nodes in the layer of a given node.
   * @param nodeId - The ID of the node.
   * @returns An array of ConceptNodeDTO objects representing the nodes in the layer.
   */
  getNodeLayer(parentNodeId: number): ConceptNodeDTO[] {
    // Basic validation
    if (
      !this.userGraphData ||
      this.userGraphData.id === -1 ||
      !this.userGraphData.nodeMap?.[parentNodeId]
    ) {
      console.warn(`getNodeLayer: Invalid data or parent node ${parentNodeId} not found.`);
      return [];
    }

    const parentNode = this.userGraphData.nodeMap[parentNodeId];
    // Get child nodes, ensuring they exist in the map
    const childNodes = parentNode.childIds
      .map(childId => this.userGraphData.nodeMap[childId])
      .filter(node => node !== undefined); // Filter out undefined nodes if IDs are stale

    // Determine the "back" cell (grandparent)
    const grandparentId = parentNode.parentIds.length > 0 ? parentNode.parentIds[0] : -1;
    const backCell = grandparentId !== -1 ? this.userGraphData.nodeMap[grandparentId] : null;

    // Construct the layer array
    if (backCell) {
      // Create a synthetic "back" node representation if needed, or use the actual grandparent node
      // Here we use the actual grandparent node, assuming it's okay to display its name etc.
      // If a different representation is needed (e.g., always named "Back"), adjust here.
      return [backCell, ...childNodes];
    } else {
      // No parent, return only children
      return childNodes;
    }
  }

  /**
   * Handles the click event on a layer tab/breadcrumb.
   */
  onTabClick(index: number): void {
    if (index >= 0 && index < this.openLayers.length - 1) {
      // Prevent clicking the last (current) tab
      const targetLayer = this.openLayers[index];
      if (targetLayer && targetLayer.id !== this.currentLayer) {
        this.currentLayer = targetLayer.id;
        this.currentNodeId = targetLayer.id; // When going back via tabs, the layer itself becomes the selected node
        this.openLayers = this.openLayers.slice(0, index + 1); // Trim layers
        console.log(
          'Navigated via Tab to Layer:',
          this.currentLayer,
          ' Open Layers:',
          this.openLayers.map(l => l.id),
        );
        this.changeActiveNode(this.currentNodeId).then(() => {
          this.router.navigate(['/dashboard/concept', this.currentNodeId]);
        });
      }
    } else {
      console.log('Clicked on current layer tab or invalid index.');
    }
  }

  /**
   * Handles the click event on a table row (concept node).
   * Differentiates between back navigation, folder navigation (double-click), and node selection (single-click).
   */
  onTableRowClick(node: ConceptNodeDTO, rowIndex: number, isRootLayer: boolean): void {
    console.log(
      'Row Clicked:',
      { id: node.databaseId, name: node.name },
      'Index:',
      rowIndex,
      'Is Root Layer:',
      isRootLayer,
    );

    // 1. Handle "Back" navigation (Clicking the first row when not in the root layer)
    // The 'back' node is actually the grandparent, representing the layer we came from.
    if (rowIndex === 0 && !isRootLayer) {
      if (this.openLayers.length > 1) {
        // Ensure there's a layer to go back to
        this.openLayers.pop(); // Remove current layer
        const previousLayer = this.openLayers[this.openLayers.length - 1];
        this.currentLayer = previousLayer.id;
        this.currentNodeId = previousLayer.id; // Select the layer node itself when going back
        console.log(
          'Navigated Back. Current Layer:',
          this.currentLayer,
          ' Current Node:',
          this.currentNodeId,
          ' Open Layers:',
          this.openLayers.map(l => l.id),
        );
        if (this.selectionMode) {
          // If in selection mode, emit the selected concept ID
          this.selectionChange.next(this.currentNodeId);
          console.log('Selection Mode: Emitted currentNodeId:', this.currentNodeId);
        } else {
          this.changeActiveNode(this.currentNodeId).then(() => {
            this.router.navigate(['/dashboard/concept', this.currentNodeId]);
          });
        }
      } else {
        console.warn(
          'Attempted to navigate back, but no previous layers found in openLayers array.',
        );
        // Optional: Fallback to root if structure is inconsistent
        // if(this.userGraphData.trueRootId !== -1) this.navigateToNode(this.userGraphData.trueRootId);
      }
      return; // Back navigation handled
    }

    // 2. Handle interaction with actual concept nodes (not the 'back' button)

    // Check if it's a "double click" simulation (clicking the same node again)
    if (node.databaseId === this.lastActiveNodeId) {
      console.log('Double Click Detected on Node:', node.databaseId);
      // If it's a folder (has children), navigate into it
      if (node.childIds && node.childIds.length > 0) {
        this.currentLayer = node.databaseId;
        this.addOpenedLayer(this.currentLayer); // Add the new layer
        this.currentNodeId = node.databaseId; // Keep the folder itself selected initially
        // No need to call changeActiveNode here, as the node *was* already active.
        // Also, no router navigation needed yet, wait for user to click content within the new layer.
        console.log('Navigated into folder:', this.currentLayer);
      } else {
        console.log('Double click on leaf node - no navigation action.');
        // Potentially open content if not already open, but changeActiveNode handles this
        if (this.selectionMode) {
          // If in selection mode, emit the selected concept ID
          this.selectionChange.next(node.databaseId);
          console.log('Selection Mode: Emitted node.databaseId:', node.databaseId);
        } else {
          this.changeActiveNode(node.databaseId); // Ensure content is displayed
        }
      }
    } else {
      // This is a "single click" (clicking a different node than the last active one)
      console.log('Single Click Detected on Node:', node.databaseId);
      this.currentNodeId = node.databaseId;
      // Activate the node (shows content) and update URL
      if (this.selectionMode) {
        // If in selection mode, emit the selected concept ID
        this.selectionChange.next(this.currentNodeId);
        console.log('Selection Mode: Emitted currentNodeId:', this.currentNodeId);
      } else {
        this.changeActiveNode(this.currentNodeId).then(() => {
          this.router.navigate(['/dashboard/concept', this.currentNodeId]);
        });
      }
      // Do NOT automatically navigate into folders on single click here.
      // The user must "double click" (click again) to enter a folder.
    }
  }

  /**
   * Changes the active node, updates services, and backend.
   */
  async changeActiveNode(nodeId: number): Promise<void> {
    const nodeToActivate = this.userGraphData.nodeMap[nodeId];
    if (!nodeToActivate) {
      console.error(`Attempted to activate non-existent node ID: ${nodeId}`);
      return;
    }

    // Only proceed if the node is actually changing
    if (this.lastActiveNodeId !== nodeId) {
      console.log(`Changing active node from ${this.lastActiveNodeId} to ${nodeId}`);
      const previousActiveNodeId = this.lastActiveNodeId;
      this.lastActiveNodeId = nodeId;
      this.currentNodeId = nodeId; // Ensure currentNodeId is also updated

      // Update graph communication service (e.g., for visualization)
      this.graphCommunicationService.changeActiveNode(nodeToActivate);

      // Update backend about the selected concept
      this.graphDataService.updateSelectedConcept(nodeId).subscribe({
        next: () => console.log(`Successfully updated selected concept to ${nodeId} in backend.`),
        error: err => {
          console.error(`Failed to update selected concept to ${nodeId} in backend:`, err);
          // Optional: Revert UI state if backend update fails?
          // this.lastActiveNodeId = previousActiveNodeId;
          // this.currentNodeId = previousActiveNodeId;
          // Or show an error message to the user
        },
      });
    } else {
      console.log(`Node ${nodeId} is already active.`);
      // Ensure consistency even if node is the same
      if (this.currentNodeId !== nodeId) this.currentNodeId = nodeId;
    }
  }
}
