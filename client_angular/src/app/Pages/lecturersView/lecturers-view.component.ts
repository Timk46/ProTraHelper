import { Component } from '@angular/core';

@Component({
  selector: 'app-lecturers-view',
  templateUrl: './lecturers-view.component.html',
  styleUrls: ['./lecturers-view.component.css']
})
export class LecturersViewComponent {
  isSidebarOpen = true;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
