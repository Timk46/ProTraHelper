import { Component, OnInit } from '@angular/core';

import { ToolbarService } from 'src/app/Services/toolbar/toolbar.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  constructor(public toolbarService: ToolbarService) {
    toolbarService.show();
  }

  ngOnInit() {}
}
