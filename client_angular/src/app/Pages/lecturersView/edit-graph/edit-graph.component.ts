import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import IAssignment from 'src/app/Modules/graph-tasks/models/Assignment.interface';

@Component({
  selector: 'app-edit-graph',
  templateUrl: './edit-graph.component.html',
  styleUrls: ['./edit-graph.component.scss']
})
export class EditGraphComponent {

  // ########################################
  // Component class properties
  form: FormGroup;

  assignmentTypes = [
    'dijkstra', 'floyd', 'kruskal', 'transitive_closure'
  ];

  showCheckbox = true;

  // #######################################################
  // Constructor - Component lifecycle related
  constructor(
    private fb: FormBuilder,

  ) {

    this.form = this.fb.group({
      title: ['', Validators.required],
      stepsEnabled: [false],
      text: ['', Validators.required],
      maxPoints: [100, Validators.required],
      selectedAssignmentType: ['', Validators.required],
      checkboxEdgeDirected: [false],
      checkboxEdgeWeighted: [false],
      checkboxNodeWeighted: [false],
      checkboxNodeVisited: [false]
    });
  }

  onCreateAssignment(): void {
    let newAssignment: Partial<IAssignment>;
    try {
      newAssignment = this.getFormValuesAsAssignment();
    } catch (err) {
      console.error(err);
      alert(err);
      return;
    }

    // TODO: Submit new assignment data to backend
    console.log(newAssignment);
    alert('Die Erstellung neuer Aufgaben ist noch nicht implementiert.');

  }

  onDownloadAssignmentAsJSON(): void {
    alert('Not Implemented.');
  }

  getFormValuesAsAssignment(): Partial<IAssignment> {
    if (!this.form.valid) {
      throw new Error('Form is invalid.');
    }

    const newAssignment: Partial<IAssignment> = {
      title: this.form.value.title,
      text: this.form.value.text,
      stepsEnabled: this.form.value.stepsEnabled,
      dataStructure: 'graph',
      type: this.form.value.selectedAssignmentType,
      maxPoints: this.form.value.maxPoints
    };

    return newAssignment;
  }

  onLoadAssignmentFromJSON(event: any): void {
    alert('Not Implemented.');
  }

  activateWorkspace() {
    alert('Not Implemented.');
  }

}
