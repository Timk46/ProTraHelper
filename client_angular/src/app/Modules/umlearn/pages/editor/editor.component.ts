import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { ClassEdge, ClassNode, EditorElement, EditorElementType, EditorModel, Side, dataType, editorDataDTO, editorElementDTO, visibilityType } from '@DTOs/index';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

import { EditorEdgeService } from '@UMLearnServices/editor-edge.service';
import { CdkDrag, CdkDragDrop, CdkDragMove, CdkDragStart, moveItemInArray } from '@angular/cdk/drag-drop';
import { NotificationService } from '@UMLearnServices/notification.service';
import { v1 as uuidv1 } from 'uuid';
import { EditorPopupComponent } from './editor-popup/editor-popup.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as htmlToImage from 'html-to-image';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnDestroy {
  private subscriptions: Subscription[] = []; // Array to store subscriptions to unsubscribe later

  @Input() mode: string = "create";
  @Input() selectableNodes: editorElementDTO[] = [];
  @Input() selectableEdges: editorElementDTO[] = [];
  @Input() nodes: ClassNode[] = [];
  @Input() edges: ClassEdge[] = [];
  @Input() syncedValue: string = "Child Initial Wert";

  @Output() nodeSelected = new EventEmitter<editorElementDTO>();
  @Output() edgeSelected = new EventEmitter<editorElementDTO>();
  @Output() nodeRemoved = new EventEmitter<ClassNode>();
  @Output() edgeRemoved = new EventEmitter<ClassEdge>();
  @Output() activeConnectionModeChange = new EventEmitter<boolean>();
  @Output() syncedValueChange: EventEmitter<string> = new EventEmitter<string>();

  @ViewChild('editorField') editorField!: ElementRef;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  nodeClickDisabled: boolean = false;
  activeConnectionMode: boolean = false;
  nodesToConnect: ClassNode[] = [];
  activeEdge: EditorElement | null = null;
  activeNode: EditorElement | null = null;
  dataType = dataType;
  visibilityType = visibilityType;
  connectionEdge: EditorElement = EditorElement.CD_ASSOCIATION;
  nodeElements: string[] = [];
  mousePosition = { x: 0, y: 0 };
  relativePosition: { x: number; y: number; } | undefined;
  nodePositionOnMove = { x: 0, y: 0 };
  zoomLevel: number = 1;
  fadeOut = true;
  dragging = false;
  startX = 0;
  startY = 0;

  testElement: editorElementDTO = {
    id: 0,
    element: EditorElement.CD_CLASS,
    elementType: EditorElementType.NODE,
    editorModelId: 0,
    title: "Klasse",
    description: "Eine Klasse ist eine abstrakte Darstellung eines Objekts.",
    data: "gar nix",
  };

  color: string = 'red';
  editorModel: string = EditorModel.CLASSDIAGRAM;
  refTable: { [keyId: number]: ElementRef } = {};

  constructor(
    private dialog: MatDialog,
    private edgeService: EditorEdgeService,
    private notification: NotificationService,
    private sanitizer: DomSanitizer,
    private el: ElementRef) { }

  /**
   * Lifecycle hook that is called after Angular has fully initialized the component's view.
   * It is called only once after the first ngAfterContentChecked.
   */
  ngAfterViewInit() {
    let itemBoxes = this.el.nativeElement.querySelectorAll('.item-box');
    itemBoxes.forEach((itemBox: { addEventListener: (arg0: string, arg1: (event: WheelEvent) => void, arg2: { passive: boolean; }) => void; scrollLeft: number; }) => {
      itemBox.addEventListener('wheel', (event: WheelEvent) => {
        event.preventDefault();
        itemBox.scrollLeft += event.deltaY;
      }, { passive: false });
    });
  }

  /**
   * Zooms the editor by adjusting the zoom level based on the wheel event.
   * @param scrollContainer - The HTML element that contains the editor.
   * @param event - The wheel event that triggered the zoom.
   */
  zoomEditor(scrollContainer: HTMLElement, event: WheelEvent) {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomLevel += 0.1;
    } else {
      this.zoomLevel -= 0.1;
    }
    this.editorField.nativeElement.style.transformOrigin = '0 0';
    this.zoomLevel = Math.min(Math.max(this.zoomLevel, 0.1), 10);
    this.editorField.nativeElement.style.transform = `scale(${this.zoomLevel})`;
    this.fadeOut = false;
    setTimeout(() => this.fadeOut = true, 2000);
  }

  /**
   * Handles the drag start event.
   *
   * @param scrollContainer - The scroll container element.
   * @param event - The mouse event.
   */
  dragStart(scrollContainer: HTMLElement, event: MouseEvent) {
    if ( (event.target as HTMLElement).classList.contains('editor-field') || event.target === scrollContainer) {
      this.dragging = true;
      this.startX = event.clientX;
      this.startY = event.clientY;
    }
  }

  /**
   * Moves the scroll container based on the drag movement.
   *
   * @param scrollContainer - The HTML element representing the scroll container.
   * @param event - The mouse event that triggered the drag movement.
   */
  dragMove(scrollContainer: HTMLElement, event: MouseEvent) {
    if (!this.dragging) {
      return;
    }
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    scrollContainer.scrollLeft -= dx;
    scrollContainer.scrollTop -= dy;
    this.startX = event.clientX;
    this.startY = event.clientY;
  }


  /**
   * Handles the drag end event.
   *
   * @param {MouseEvent} event - The mouse event object.
   * @returns {void}
   */
  @HostListener('document:mouseup' , ['$event'])
  dragEnd(event: MouseEvent) {
    this.dragging = false;
    setTimeout(() => {
      this.nodeClickDisabled = false;
    }, 0);
  }

  /**
   * Scrolls the element to the right by a specified amount.
   *
   * @param {HTMLElement} element - The HTML element to scroll.
   */
  onScrollRight(element: HTMLElement) {
    element.scrollLeft += 100;
  }

  /**
   * Retrieves the SVG string representation for a given edge type.
   *
   * @param edgeType - The type of the editor element.
   * @returns The SVG string representation of the edge type.
   */
  getSvgForEdgeType(edgeType: EditorElement): SafeHtml {
    let svgString: string;
    switch (edgeType) {
      case EditorElement.CD_ASSOCIATION:
          svgString = '<svg width="100" height="50"><line x1="10" y1="25" x2="90" y2="25" stroke="black" stroke-width="3"/></svg>';
        break;
       case EditorElement.CD_BIDIRECTIONAL_ASSOCIATION:
          svgString = '<svg width="100" height="50"><line x1="20" y1="35" x2="10" y2="25" stroke="black" stroke-width="3"/><line x1="20" y1="15" x2="10" y2="25" stroke="black" stroke-width="3"/><line x1="80" y1="15" x2="90" y2="25" stroke="black" stroke-width="3"/><line x1="80" y1="35" x2="90" y2="25" stroke="black" stroke-width="3"/><line x1="10" y1="25" x2="90" y2="25" stroke="black" stroke-width="3"/></svg>';
        break;
        case EditorElement.CD_DIRECTIONAL_ASSOCIATION:
          svgString = '<svg width="100" height="50"><line x1="80" y1="15" x2="90" y2="25" stroke="black" stroke-width="3"/><line x1="80" y1="35" x2="90" y2="25" stroke="black" stroke-width="3"/><line x1="10" y1="25" x2="90" y2="25" stroke="black" stroke-width="3"/></svg></svg>';
          break;
      case EditorElement.CD_AGGREGATION:
          svgString = '<svg width="100" height="50"><polygon points="60,25 75,15 90,25 75,35" fill="white" stroke="black" stroke-width="3"/><line x1="10" y1="25" x2="60" y2="25" stroke="black" stroke-width="3"/></svg>';
        break;
      case EditorElement.CD_COMPOSITION:
          svgString = '<svg width="100" height="50"><polygon points="60,25 75,15 90,25 75,35" fill="black" stroke="black" stroke-width="3"/><line x1="10" y1="25" x2="60" y2="25" stroke="black" stroke-width="3"/></svg>';
        break;
      case EditorElement.CD_IMPLEMENTATION:
          svgString = '<svg width="100" height="50"><line x1="10" y1="25" x2="90" y2="25" stroke="black" stroke-width="3" stroke-dasharray="5,5"/><polygon points="80,15 90,25 80,35" fill="white" stroke="black" stroke-width="3"/></svg>';
        break;
      case EditorElement.CD_DEPENDENCY:
          svgString = '<svg width="100" height="50"><line x1="10" y1="25" x2="90" y2="25" stroke="black" stroke-width="3" stroke-dasharray="5,5"/><line x1="80" y1="35" x2="90" y2="25" stroke="black" stroke-width="3"/><line x1="80" y1="15" x2="90" y2="25" stroke="black" stroke-width="3"/></svg>';
        break;
      default:
        svgString = '<svg width="100" height="50"><line x1="10" y1="25" x2="90" y2="25" stroke="black" stroke-width="3" stroke-dasharray="5,5"/><polygon points="80,15 90,25 80,35" fill="white" stroke="black" stroke-width="3"/></svg>';
        break;
    }
    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }


  /**
   * Handles the mouse move event.
   *
   * @param event - The mouse event object.
   */
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mousePosition = { x: event.clientX, y: event.clientY };
    const editorFieldPosition = this.editorField.nativeElement.getBoundingClientRect();
    this.mousePosition = {
      x: this.mousePosition.x - editorFieldPosition.left,
      y: this.mousePosition.y - editorFieldPosition.top,
    };
  }

  /**
   * Handles the drop event when an element is dragged and dropped.
   * Moves the item in the selectableNodes array based on the previous and current index.
   * Calculates the position of the dropped element in the editor field based on the mouse position and zoom level.
   * Calls the onSelectNode method with the dropped node and the calculated position.
   *
   * @param event - The drop event containing information about the previous and current index of the dropped element.
   * @param node - The editorElementDTO representing the dropped node.
   */
  drop(event: CdkDragDrop<string[]> , node: editorElementDTO) {
    moveItemInArray(this.selectableNodes, event.previousIndex, event.currentIndex);
    const positionInEditorField = {
      x: parseFloat((this.mousePosition.x / this.zoomLevel - 100).toFixed(3)),
      y: parseFloat((this.mousePosition.y / this.zoomLevel - 100).toFixed(3)),
    };
    this.onSelectNode(node, positionInEditorField);
  }

  /**
   * Handles the selection of a node in the editor.
   *
   * @param {editorElementDTO} node - The selected node.
   * @param {any} position - The position of the selected node.
   * @returns {void}
   */
  onSelectNode(node: editorElementDTO, position: any) {
    if(position.x >= 0 && position.y >= 0 && position.x <= (5000-200) && position.y <= (5000-250)) {
      const _node: ClassNode = {
        identification: "testNode",
        type: EditorElement.CD_CLASS,
        id: uuidv1(),
        position: { x: position.x, y: position.y },
        width: 100,
        height: 100,
        title: "Schule",
        attributes: [],
        methods: [],
      };
      if (node.element === EditorElement.CD_CLASS) {
        _node.title = "Klasse";
        _node.type = EditorElement.CD_CLASS;
      }
      if (node.element === EditorElement.CD_ABSTRACT_CLASS) {
        _node.title = "Abstrakte Klasse";
        _node.type = EditorElement.CD_ABSTRACT_CLASS;
      }
      if (node.element === EditorElement.CD_INTERFACE) {
        _node.title = "Interface";
        _node.type = EditorElement.CD_INTERFACE;
      }
      this.nodeSelected.emit(node);
      this.nodes.push(_node);
    }
  }

  /**
   * Handles the event when a node is moved.
   * @param {any} node - The node that was moved.
   * @returns {void}
   */
  onCdkDragStart(event: CdkDragStart, node: ClassNode) {
    const dragPosition = node.position;
    dragPosition.x *= this.zoomLevel;
    dragPosition.y *= this.zoomLevel;
    this.relativePosition = {
      x: (this.mousePosition.x - dragPosition.x),
      y: (this.mousePosition.y - dragPosition.y),
    };
  }

  /**
   * Handles the drag move event for a CdkDrag.
   *
   * @param event - The CdkDragMove event.
   * @param node - The ClassNode associated with the drag event.
   */
  onCdkDragMove(event: CdkDragMove<CdkDrag<any>>,node: ClassNode) {
    if (this.relativePosition) {
      const newPosition = {
        x: parseFloat(((this.mousePosition.x - this.relativePosition.x) / this.zoomLevel).toFixed(3)),
        y: parseFloat(((this.mousePosition.y - this.relativePosition.y) / this.zoomLevel).toFixed(3)),
      };
        if (newPosition.x < 0) {
          newPosition.x = 0;
        }
        if (newPosition.y < 0) {
          newPosition.y = 0;
        }
        if ((newPosition.x+200) > 5000) {
          newPosition.x = 5000-200;
        }
        if ((newPosition.y+250) > 5000) {
          newPosition.y = 5000-250;
        }
        this.nodePositionOnMove = newPosition;
        event.source.setFreeDragPosition(newPosition);
    }
    this.edgeService.positionConnected(node.id);
  }

  /**
   * Sets the position of a node based on the drag end event.
   * @param node - The node item containing the node ID.
   * @param event - The drag end event containing the drag position.
   */
  setNodePosition(nodeId: any) {
    const node = this.nodes.find(_node => _node.id === nodeId);
    if (node) {
      node.position = this.nodePositionOnMove;
    }
  }

  /**
   * Adds a reference to the reference table.
   *
   * @param id - The ID of the reference.
   * @param ref - The reference element.
   */
  addReference(id: number, ref: ElementRef) {
    this.refTable[id] = ref;
  }

  /**
   * Handles the click event on a node.
   * @param node - The clicked node.
   */
  onNodeClick(event: MouseEvent, node: any) {
    if (this.nodeClickDisabled) {
      this.nodeClickDisabled = false;
      return;
    }
    if (this.activeConnectionMode) {
      this.nodesToConnect.push(node);
      if (this.nodesToConnect.length == 1) {
        this.activeNode = node.id;
      }
      if (this.nodesToConnect.length === 2) {
        this.connectNodes();
        this.nodesToConnect = [];
        this.activeNode = null;
        this.activeConnectionMode = false;
        this.activeConnectionModeChange.emit(this.activeConnectionMode); // Pass to Parent
        this.activeEdge = null;
        this.notification.success("Knoten verbunden!");
      }
    } else {
      this.onClickElement('node', node);
    }
  }


  /**
   * Handles the click event on an edge.
   *
   * @param {ClassEdge} edge - The edge that was clicked.
   * @returns {void}
   */
  onEdgeClick(edge: ClassEdge): void {
    const startNodeXPosition: number = this.getNodeXPosition(edge.start);
    const endNodeXPosition: number = this.getNodeXPosition(edge.end);
    var switchPosition: boolean = false;
    if (startNodeXPosition > endNodeXPosition) {
      switchPosition = true;
    }
    this.onClickElement('edge', edge, switchPosition);
  }

  /**
   * Updates the properties of an edge in the editor component.
   *
   * @param {ClassEdge} edge - The edge to be updated.
   * @param {Object} updateData - The data containing the properties to be updated.
   * @param {Side} [updateData.startDirection] - The updated start direction of the edge.
   * @param {number} [updateData.startDirectionOffset] - The updated start direction offset of the edge.
   * @param {Side} [updateData.endDirection] - The updated end direction of the edge.
   * @param {number} [updateData.endDirectionOffset] - The updated end direction offset of the edge.
   * @returns {void}
   */
  onEdgeUpdate(edge: ClassEdge, updateData: {startDirection?: Side, startDirectionOffset?: number, endDirection?: Side, endDirectionOffset?: number}): void {
    edge.startDirection = updateData.startDirection;
    edge.startDirectionOffset = updateData.startDirectionOffset;
    edge.endDirection = updateData.endDirection;
    edge.endDirectionOffset = updateData.endDirectionOffset;
  }

  /**
   * Retrieves the x position of a node based on its ID.
   * @param nodeId - The ID of the node.
   * @returns The x position of the node. Returns 0 if the node is not found.
   */
  getNodeXPosition(nodeId: string): number {
    const node = this.nodes.find(_node => _node.id === nodeId);
    if (node) {
      return node.position.x;
    }
    return 0;
  }

  /**
   * Toggles the connection mode of the editor.
   * If the connection mode is currently active, it will be deactivated.
   * If the connection mode is currently inactive, it will be activated and the nodesToConnect array will be reset.
   */
  onConnectionMode(edge: EditorElement) {
    if (this.activeConnectionMode) {
      this.activeConnectionMode = false;
      this.activeConnectionModeChange.emit(this.activeConnectionMode); // Pass to Parent
      this.activeEdge = null;
      this.activeNode = null;
    } else {
      this.activeConnectionMode = true;
      this.activeConnectionModeChange.emit(this.activeConnectionMode); // Pass to Parent
      this.activeEdge = edge;
      this.nodesToConnect = [];
      this.connectionEdge = edge;
    }
  }

  /**
   * Connects two nodes by creating an edge between them.
   */
  connectNodes() {
    const edge: ClassEdge = {
      identification: "TODO:identiHash",
      type: this.connectionEdge,
      id: uuidv1(),
      start: this.nodesToConnect[0].id,
      end: this.nodesToConnect[1].id,
    };
    this.edges.push(edge);
    this.edgeSelected.emit(this.selectableEdges.find(_edge => _edge.element === this.connectionEdge));
  }

  /**
   * Retrieves additional data types from the nodes (in form of their titles).
   * @returns An array of additional data types.
   */
  getAdditionalDataTypes(): string[] {
    const additionalDataTypes: string[] = [];
    for (const element of this.nodes) {
      if (element.title) additionalDataTypes.push(element.title);
    }
    return additionalDataTypes;
  }

  /**
   * Retrieves the data needed to save the editor state.
   * @returns {editorDataDTO} The editor data object containing the nodes and edges.
   */
  getSaveData(): editorDataDTO {
    return {
      nodes: this.nodes,
      edges: this.edges,
    };
  }

  /**
   * Handles the click event on an element in the editor.
   * @param {string} elementType - The type of the clicked element.
   * @param {any} elementData - The data associated with the clicked element.
   */
  onClickElement(elementType: string, elementData: ClassNode | ClassEdge, switchPosition?: boolean) {
    const copiedElementData = JSON.parse(JSON.stringify(elementData));
    const configData: MatDialogConfig = {
      data: {
        elementType: elementType,
        elementData: copiedElementData,
        switchPosition: switchPosition,
        additionalDataTypes: this.getAdditionalDataTypes(),
      }
    };
    const dialogRef = this.dialog.open(EditorPopupComponent, configData);
    const dialogRefSubscription = dialogRef.afterClosed().subscribe((result?: {command: string, changedData: any}) => {
      if (result && result.command === 'delete') {
        if(elementType === 'node') {
          const index = this.nodes.indexOf(elementData as ClassNode);
          if (index !== -1) {
            this.nodeRemoved.emit(this.nodes[index]);
            this.nodes.splice(index, 1);
          }
          for (let i = 0; i < this.edges.length; i++) {
            if (this.edges[i].start === elementData.id || this.edges[i].end === elementData.id) {
              this.edges.splice(i, 1);
              i--;
            }
          }
        }
        else if(elementType === 'edge') {
          const index = this.edges.indexOf(elementData as ClassEdge);
          if (index !== -1) {
            this.edgeRemoved.emit(this.edges[index]);
            this.edges.splice(index, 1);
          }
        }
      } else if (result && result.command === 'update') {
          if(elementType === 'node') {
            const index = this.nodes.indexOf(elementData as ClassNode);
            if (index !== -1) {
              this.nodes[index] = result.changedData;
            }
            for (let i = 0; i < this.edges.length; i++) {
              if (this.edges[i].start === elementData.id || this.edges[i].end === elementData.id) {
                this.edgeService.reconnectEdge(this.edges[i].id, "node_" + this.edges[i].start, "node_" + this.edges[i].end);
              }
            }
          }
          else if(elementType === 'edge') {
            const index = this.edges.indexOf(elementData as ClassEdge);
            if (index !== -1) {
              this.edges[index] = result.changedData;
            }
          }
        }
    });
    this.subscriptions.push(dialogRefSubscription);
  }

  /**
   * Takes a snapshot of the editor component.
   *
   * @returns A promise that resolves to a string representing the snapshot image.
   * @throws If there are no nodes in the editor, an error is thrown.
   */
  takeSnapshot(): Promise<string> {
    if (this.nodes.length === 0) {
      this.notification.info("Hinweis: Für eine spätere Vorschau der Lösung müssen Knoten im Editor vorhanden sein.");
      return new Promise((resolve, reject) => {
        reject("No nodes in editor, so no picture was taken.");
      });
    }
    const currentWidth = this.editorField.nativeElement.offsetWidth;
    const currentHeight = this.editorField.nativeElement.offsetHeight;
    const picturePadding = 50;
    let min: { x: number; y: number; } = { x: currentWidth, y: currentHeight };
    let max: { x: number; y: number; } = { x: 0, y: 0 };
    let picture: string = "";
    for (let i = 0; i < this.editorField.nativeElement.children.length; i++) {
      const child = this.editorField.nativeElement.children[i];
      if (child.tagName === 'DIV') {
        const topLeft: { x: number; y: number; } = {
          x: child.offsetLeft + (child.style.transform ? parseInt(child.style.transform.split('(')[1].split('px')[0]) : 0),
          y: child.offsetTop + (child.style.transform ? parseInt(child.style.transform.split(',')[1].split('px')[0]) : 0),
        };

        if (topLeft.x < min.x) {
          min.x = topLeft.x;
        }
        if (topLeft.y < min.y) {
          min.y = topLeft.y;
        }
        if (topLeft.x + child.offsetWidth > max.x) {
          max.x = topLeft.x + child.offsetWidth;
        }
        if (topLeft.y + child.offsetHeight > max.y) {
          max.y = topLeft.y + child.offsetHeight;
        }
      }
    }
    for (let i = 0; i < this.editorField.nativeElement.children.length; i++) {
      const child = this.editorField.nativeElement.children[i];
      if (child.tagName === 'DIV') {
        child.style.left = (child.offsetLeft - min.x + picturePadding) + 'px';
        child.style.top = (child.offsetTop - min.y + picturePadding) + 'px';
      }
    }
    this.editorField.nativeElement.style.width = (max.x - min.x + picturePadding*2) + 'px';
    this.editorField.nativeElement.style.height = (max.y - min.y + picturePadding*2) + 'px';
    this.editorField.nativeElement.style.transform = 'scale(1)';
    this.edgeService.positionAll();
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          picture = await htmlToImage.toPng(this.editorField.nativeElement);
          this.editorField.nativeElement.style.width = currentWidth + 'px';
          this.editorField.nativeElement.style.height = currentHeight + 'px';
          this.editorField.nativeElement.style.transform = 'scale(' + this.zoomLevel + ')';
          for (let i = 0; i < this.editorField.nativeElement.children.length; i++) {
            const child = this.editorField.nativeElement.children[i];
            if (child.tagName === 'DIV') {
              child.style.left = (child.offsetLeft + min.x - picturePadding) + 'px';
              child.style.top = (child.offsetTop + min.y - picturePadding) + 'px';
            }
          }
          this.edgeService.positionAll();
          resolve(picture);
        } catch (error) {
          reject(error);
        }
      }, 0);
    });

  }

  /**
 * Called when the component is about to be destroyed.
 * Unsubscribes from all subscriptions to prevent memory leaks.
 *
 * @memberof CourseEditComponent
 * @public
 * @returns {void}
 */
  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

}
