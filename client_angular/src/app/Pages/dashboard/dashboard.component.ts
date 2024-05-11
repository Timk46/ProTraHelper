import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';
import { ToolbarService } from 'src/app/Services/toolbar/toolbar.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  constructor(public toolbarService: ToolbarService, public sSS: ScreenSizeService, private title:Title) {
    toolbarService.show();
    title.setTitle('GOALS: Dashboard');
    sSS.isHandset.subscribe((result) => {
      console.log('HANDSET', result);
    });
    sSS.isWeb.subscribe((result) => {
      console.log('WEB', result);
    });
  }

  get isMobile() {
    return window.innerWidth < 768;
  }

  ngOnInit() {}
}
