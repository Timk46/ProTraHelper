import { Component } from '@angular/core';

@Component({
  selector: 'app-task-evaluation-overview',
  templateUrl: './task-evaluation-overview.component.html',
  styleUrls: ['./task-evaluation-overview.component.scss']
})
export class TaskEvaluationOverviewComponent {
  
  /*
  the panels for all evaluation overviews
  each panel is the summary of all progress bars as in the tab "Aufgaben" for a single concept
  */
  panels = [
    { title: 'Student 1' },
    { title: 'Student 2' },
    { title: 'Student 3' },
    { title: 'Student 4' },
  ];

  filteredPanels: any[] = [];
  searchTerm: string = '';
  isSelected : boolean = false;

  constructor() {
    this.filteredPanels = this.panels;
  }

  filterPanels() {
    this.filteredPanels = this.panels.filter(panel =>
      panel.title.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  toggleSelection() {
    this.isSelected = !this.isSelected;
  }
}
