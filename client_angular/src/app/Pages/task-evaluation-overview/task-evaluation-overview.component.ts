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
    { title: 'Student 1', status: 'floating' },
    { title: 'Student 2', status: 'passed' },
    { title: 'Student 3', status: 'passed' },
    { title: 'Student 4', status: 'failed' },
    { title: 'Student 5', status: 'failed' },
    { title: 'Student 6', status: 'passed' },
    { title: 'Student 7', status: 'passed' },
    { title: 'Student 8', status: 'passed' },
    { title: 'Student 9', status: 'floating' },
    { title: 'Student 10', status: 'passed' },
    { title: 'Student 11', status: 'passed' },
    { title: 'Student 12', status: 'failed' },
    { title: 'Student 13', status: 'passed' },
    { title: 'Student 14', status: 'floating' },
    { title: 'Student 15', status: 'failed' },
    { title: 'Student 16', status: 'passed' },
  ];

  filteredPanels: any[] = [];
  searchTerm: string = '';

  constructor() {
    this.filteredPanels = this.panels;
  }

  filterPanels() {
    this.filteredPanels = this.panels.filter(panel =>
      panel.title.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
}
