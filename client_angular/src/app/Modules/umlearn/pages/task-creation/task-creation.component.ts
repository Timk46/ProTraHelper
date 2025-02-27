import { EditorElementType, editorModelDTO, editorElementDTO, EditorModel, editorDataDTO, taskDataDTO, ClassNode, ClassEdge } from '@DTOs/index';
import { Component, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router} from '@angular/router';
import { TaskDescriptionPopupComponent } from './task-description-popup/task-description-popup.component';
import { Subscription } from 'rxjs/internal/Subscription';
import { EditorCommunicationService } from '@UMLearnServices/editor-communication.service';
import { DatabaseTaskCommunicationService } from '@UMLearnServices/database-task-communication.service';
import { NotificationService } from '@UMLearnServices/notification.service';


@Component({
  selector: 'app-task-creation',
  templateUrl: './task-creation.component.html',
  styleUrls: ['./task-creation.component.scss']
})


export class TaskCreationComponent implements OnDestroy {
  private subscriptions: Subscription[] = []; // Array to store subscriptions to unsubscribe later

  taskTitle: string ="";
  taskDescription: string="";
  maxPoints: number = 0;
  calculatedMaxPoints: number = 0;
  selectedModel: editorModelDTO = {model: EditorModel.CLASSDIAGRAM, title: 'dummy', description: 'dummy', id: 1};
  editorData : editorDataDTO = {
    nodes: [],
    edges: [],
  };
  nodes: editorElementDTO[] = [];
  selectedNodes:editorElementDTO[] = [];
  edges: editorElementDTO[] = [];
  selectedEdges:editorElementDTO[] = [];

  checkboxStatesNode: { [key: string]: boolean } = {};
  checkboxStatesEdge: { [key: string]: boolean } = {};
  checkboxStatesNodeSelfCheck: { [key: string]: boolean } = {};
  checkboxStatesEdgeSelfCheck: { [key: string]: boolean } = {};

  activeConnectionModeChange = false;
  counter:number = 0;
  taskData: taskDataDTO = {
    id: 3,
    title: 'Updated Task Title',
    description: 'Updated Task Description',
    lecturerId: 1,
    editorData: {
      nodes: [],
      edges: [],
    },
    taskSettings: {
      allowedNodeTypes: [],
      allowedEdgeTypes: [],
      editorModel: EditorModel.CLASSDIAGRAM,
    },
    maxPoints: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  isManualInput = false;
  maxPointsTooltipp: string = `
  Maximal erreichbare Punktzahl
  <p>Wert wird solange automatisch hochgezählt,<br>
  bis erstmalig eine manuelle Eingabe erfolgt.
  </p>
  <table>
    <tr>
      <th class="left-align">Element</th>
      <th class="left-align">Punkte</th>
    </tr>
    <tr>
      <td>Node</td>
      <td>3</td>
    </tr>
    <tr>
        <td>Attribut</td>
        <td>1</td>
      </tr>
      <tr>
        <td>Methode</td>
        <td>1</td>
      </tr>
      <tr>
        <td>Edge</td>
        <td>2</td>
      </tr>
      <tr>
        <td>Kardinalität</td>
        <td>1</td>
      </tr>
      <tr>
        <td>Edge Beschriftung</td>
        <td>1</td>
      </tr>
  </table>
`;
CheckBoxTooltipp: string = `
Liste erlaubter Elemente
<ul>
    <li>Checkboxen der Liste checken automatisch, sobald ein entsprechndes Element im Editor eingefügt wird.</li>
    <li>Um ein Element aus der Liste zu entfernen, muss es erst aus dem Editor entfernt werden.</li>
    <li> Befinden sich keine Elemente des Typs im Editor, wird es automatisch aus der Liste entfernt, <br>
        es sei denn, es wurde manuell in die Liste hinzugefügt. <br>
        In dem Fall können Sie es nur manuell entfernen.</li>
</ul>
`;

  constructor(
    private router:Router,
    private ecs:EditorCommunicationService,
    private dtcs: DatabaseTaskCommunicationService,
    public dialog: MatDialog,
    private notification: NotificationService,
    )
    {
      const navigation = this.router.getCurrentNavigation();
      if (navigation && navigation.extras && navigation.extras.state) {
        const getTaskDataSubscription = this.dtcs.getTaskData(navigation.extras.state['id']).subscribe((data: taskDataDTO) => {
          this.taskData = data;
          this.editorData = this.taskData.editorData;
          this.selectedModel.model = data.taskSettings.editorModel as EditorModel;
          this.taskTitle = this.taskData.title;
          this.taskDescription = this.taskData.description;
          this.maxPoints = this.taskData.maxPoints;
          if (this.maxPoints !== 0) {
            this.isManualInput = true;
          }
          if (this.selectedModel && this.selectedModel.model) {
            const getEditorElementsSubscription = this.ecs.getEditorElements(this.selectedModel.model).subscribe(elements => {
              this.nodes = elements.filter(element => element.elementType === EditorElementType.NODE);
              this.edges = elements.filter(element => element.elementType === EditorElementType.EDGE);
              this.initializeSelectedElements();
            });
            this.subscriptions.push(getEditorElementsSubscription);
          }
        });
        this.subscriptions.push(getTaskDataSubscription);
      }
    }

  /**
   * Initializes the selected elements based on the task settings.
   */
  initializeSelectedElements(): void {
    for (let node of this.nodes) {
      if (this.taskData.taskSettings.allowedNodeTypes.some(element => element.id === node.id)) {
        this.onCheckboxChange(node.id, true, true);
      } else {
        this.onCheckboxChange(node.id, false, true);
      }
    }
    for (let edge of this.edges) {
      if (this.taskData.taskSettings.allowedEdgeTypes.some(element => element.id === edge.id)) {
        this.onCheckboxChange(edge.id, true, false);
      } else {
        this.onCheckboxChange(edge.id, false, false);
      }
    }
  }
  /**
   * Handles the selection of a node.
   *
   * @param node - The selected node.
   */
  onNodeSelected(node: editorElementDTO) {
    if (!this.selectedNodes.some(selectedNode => selectedNode.id === node.id)) {
      this.onCheckboxChange(node.id, true, true)
    }
    this.calculateMaxPoints();
  }
  /**
   * Handles the selection of an edge.
   *
   * @param edge - The selected edge.
   */
  onEdgeSelected(edge: editorElementDTO) {
    if (!this.selectedEdges.some(selectedEdge => selectedEdge.id === edge.id)) {
      this.onCheckboxChange(edge.id, true, false)
    }
    this.calculateMaxPoints();
  }
  /**
   * Increases the counter by 1 and displays a notification if the counter reaches 3.
   * The notification informs the user that the element type is already included in the task
   * and prompts them to remove all elements of this type from the editor before removing it from the allowed list.
   */
  CountErrorsCheckbox(): void{
    this.counter += 1;
    if(this.counter == 3){
      this.notification.confirm('Dieser Elementtyp ist bereits in der Aufgabe enthalten',
      'Entfernen Sie bitte erst alle Elemente diesen Typs aus dem Editor, um es von der Liste erlaubter Elemente zu entfernen', 'OK', '');
      this.counter = 0;
    }
  }
  /**
   * Handles the click event on a checkbox node.
   *
   * @param node - The editor element DTO representing the clicked node.
   * @param event - The click event object.
   */
  onClickCheckboxNode(node:editorElementDTO,event: Event) {
    if (this.editorData.nodes.some(_node => _node.type === node.element)) {
      event.preventDefault();
      this.notification.error("Dieser Knoten ist bereits im Editor vorhanden");
      this.CountErrorsCheckbox();
    }else{
    this.onCheckboxChange(node.id, !this.checkboxStatesNode[node.id], true);
    this.checkboxStatesNodeSelfCheck[node.id] = !this.checkboxStatesNodeSelfCheck[node.id];
    }
  }
  /**
   * Handles the click event of a checkbox for an edge element.
   *
   * @param edge - The editor element DTO representing the edge.
   * @param event - The click event object.
   */
  onClickCheckboxEdge(edge:editorElementDTO,event: Event) {
    if (this.editorData.edges.some(_edge => _edge.type === edge.element)) {
      event.preventDefault();
      this.notification.error("Diese Kante ist bereits im Editor vorhanden");
      this.CountErrorsCheckbox();
    }else{
    this.onCheckboxChange(edge.id, !this.checkboxStatesEdge[edge.id], false);
    this.checkboxStatesEdgeSelfCheck[edge.id] = !this.checkboxStatesEdgeSelfCheck[edge.id];
    }
  }
  /**
   * Handles the event when a node is removed.
   * @param node The node that was removed.
   */
  onNodeRemoved(node: ClassNode) {
    if(this.editorData.nodes.filter(_node => _node.type === node.type).length === 1){
      let matchingNode = this.selectedNodes.find(_node => _node.element === node.type);
      if (matchingNode && !this.checkboxStatesNodeSelfCheck[matchingNode.id]) {
        this.onCheckboxChange(matchingNode.id, false, true);
      }
    }
  }
  /**
   * Handles the removal of an edge.
   * @param {ClassEdge} edge - The edge to be removed.
   */
  onEdgeRemoved(edge: ClassEdge) {
    if(this.editorData.edges.filter(_edge => _edge.type === edge.type).length === 1){
      let matchingEdge = this.selectedEdges.find(_Edge => _Edge.element === edge.type);
      if (matchingEdge && !this.checkboxStatesEdgeSelfCheck[matchingEdge.id]) {
        this.onCheckboxChange(matchingEdge.id, false, false);
      }
    }
  }
  /**
   * Handles the checkbox change event.
   *
   * @param id - The ID of the checkbox.
   * @param isChecked - Indicates whether the checkbox is checked or not.
   * @param isNode - Indicates whether the checkbox belongs to a node or an edge.
   */
  onCheckboxChange(id: number, isChecked: boolean, isNode: boolean) {
    if (isNode) {
      this.checkboxStatesNode[id] = isChecked;
      if (isChecked) {
        const node = this.nodes.find(node => node.id === id);
        if (node) {
          this.selectedNodes.push(node);
        }
      } else {
          this.selectedNodes = this.selectedNodes.filter(node => node.id !== id);
      }
    } else {
      this.checkboxStatesEdge[id] = isChecked;
      if (isChecked) {
        const edge = this.edges.find(edge => edge.id === id);
        if (edge) {
          this.selectedEdges.push(edge);
        }
      } else {
        this.selectedEdges = this.selectedEdges.filter(edge => edge.id !== id);
      }
    }
  }

  /**
   * Cancels the task creation process.
   * Displays a confirmation dialog and navigates to the task overview page if confirmed.
   */
  onCancel(): void {
    const confirmSubscription = this.notification.confirm('Taskerstellung abbrechen?', 'Alle Änderungen gehen verloren.', 'Nein', 'Ja, abbrechen').subscribe((confirmed) => {
      if (confirmed) {
        this.router.navigate(['/task-overview']);
      }
    });
    this.subscriptions.push(confirmSubscription);
  }

  /**
   * Handles the acceptance of data and image base64 in the task creation component.
   *
   * @param {editorDataDTO} data - The editor data to be saved.
   * @param {Promise<string>} imageB64 - The promise that resolves to the base64 image data.
   */
  onAccept(data: editorDataDTO, imageB64: Promise<string>) {
    const newTaskData: taskDataDTO = {...this.taskData};
    newTaskData.title = this.taskTitle;
    newTaskData.description = this.taskDescription;
    newTaskData.maxPoints = this.maxPoints;
    newTaskData.taskSettings.allowedNodeTypes = this.selectedNodes;
    newTaskData.taskSettings.allowedEdgeTypes = this.selectedEdges;
    newTaskData.editorData = data;
    this.dtcs.setTaskData(newTaskData).subscribe((data: taskDataDTO) => {
      if (data) {
        this.notification.success('Task erfolgreich gespeichert');
        this.taskData = data;
      } else {
        this.notification.error('Fehler beim Speichern des Tasks');
      }
    });
    imageB64.then(image => {
      if (image.length > 0) {
        this.dtcs.setTaskImage({taskId: this.taskData.id, imageB64: image}).subscribe((taskId: number) => {
          if (taskId && taskId == this.taskData.id) {
            this.notification.success('Task-Vorschau erfolgreich gespeichert');
          } else {
            this.notification.error('Fehler beim Speichern der Task-Vorschau');
          }
        });
      } else {
        this.notification.error('Fehler beim Speichern der Task-Vorschau');
      }
    });
  }

  /**
   * Opens a dialog for task creation.
   */
  openDialog(): void {
    const dialog = this.dialog.open(TaskDescriptionPopupComponent, {
      width: '50%',
      height: '80%',
      data: {
        description: this.taskDescription,
        taskTitle: this.taskTitle
      }
    });

    const dialogSubscription = dialog.afterClosed().subscribe(result => {
      if(result){
        this.taskDescription = result;
      }
    });
    this.subscriptions.push(dialogSubscription);
  }

  /**
   * Sets the maximum points for the task and updates the isManualInput flag.
   * @param value The new value for the maximum points.
   */
  onMaxPointsChange(value: number) {
    this.isManualInput = true;
    this.maxPoints = value;
  }

  /**
   * Calculates the maximum points for the task.
   * If isManualInput is false, it iterates through the edges and nodes of the editorData
   * and counts the points based on the attributes of each edge and node.
   * The maximum points are then stored in the maxPoints property.
   */
  calculateMaxPoints() {
    if (!this.isManualInput) {
      let edgePoints = 0;
      let nodePoints = 0;
      for (let edge of this.editorData.edges) {
        edgePoints += 1; // Count the edge itself as a point
        edgePoints += ['cardinalityEnd', 'cardinalityStart', 'description', 'type'].reduce((total, attr) => total + (Array.isArray((edge as any)[attr]) ? (edge as any)[attr].length : ((edge as any)[attr] ? 1 : 0)), 0);
      }
      for (let node of this.editorData.nodes) {
        nodePoints += 1; // Count the node itself as a point
        nodePoints += ['type', 'methods', 'attributes', 'title'].reduce((total, attr) => total + (Array.isArray((node as any)[attr]) ? (node as any)[attr].length : ((node as any)[attr] ? 1 : 0)), 0);
      }
      this.maxPoints = edgePoints + nodePoints;
    }
  }
  /**
   * Handles the confirmation of deleting a task.
   */
  onDelete() {
    const checkForTaskAttemptsSubscription = this.dtcs.checkForTaskAttempts(this.taskData.id).subscribe(result => {
      if (result) {
        const confirmSubscription1 = this.notification.confirm("Es existieren bereits Abgaben zur Aufgabe!", "Alle Abgaben werden auch gelöscht!", "Abbrechen", "Aufgabe löschen").subscribe(result => {
          if (result) {
            this.deleteTask();
          } else {
            this.notification.info("Aufgabe wurde nicht gelöscht");
          }
        });
        this.subscriptions.push(confirmSubscription1);
      } else {
        const confirmSubscription2 = this.notification.confirm("Aufgabe wirklich löschen?", "Achtung: Inhalte können nicht wiederhergestellt werden!", "Abbrechen", "Aufgabe löschen").subscribe(result => {
          if (result) {
            this.deleteTask();
          } else {
            this.notification.success("Aufgabe wurde nicht gelöscht");
          }
        });
        this.subscriptions.push(confirmSubscription2);
      }
    });
    this.subscriptions.push(checkForTaskAttemptsSubscription);
  }

  /**
   * Deletes a task.
   */
  deleteTask() {
    const deleteTaskSubscription = this.dtcs.deleteTask(this.taskData.id).subscribe(
      (response: any) => {
        this.router.navigate(['/task-overview']);
      },
      (error: any) => {
        console.error('Error deleting task:', error);
      }
    );
    this.subscriptions.push(deleteTaskSubscription);
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
