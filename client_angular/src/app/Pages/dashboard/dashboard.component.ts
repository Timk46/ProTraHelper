import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ToolbarService } from 'src/app/Services/toolbar/toolbar.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  constructor(public toolbarService: ToolbarService, private title:Title) {
    toolbarService.show();
    title.setTitle('GOALS: Dashboard');
  }

  ngOnInit() {}
}
