import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChangeActiveNodeService } from 'src/app/Services/changeActiveNode.service';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-contentOverview',
  templateUrl: './contentOverview.component.html',
  styleUrls: ['./contentOverview.component.css'],
})
export class ContentOverviewComponent implements OnInit, OnDestroy {
  private changeActiveNodeService: ChangeActiveNodeService = ChangeActiveNodeService.getInstance();

  private activeNodeSubscription: Subscription;

  activeNodeTestDisplay: String = ''; // for testing only

  activeNode: any = {}; // TODO: type

  constructor() {
    this.activeNodeSubscription = this.changeActiveNodeService.currentActiveNode.subscribe((ActiveNode) => {
      if (ActiveNode != null) {
        this.activeNode = ActiveNode; // TODO: type
        this.activeNodeTestDisplay = JSON.stringify(this.activeNode);
      }
    });
  }

  ngOnInit() {
  }

  // unsubscribe to prevent memory leaks after component is destroyed
  ngOnDestroy() {
    if (this.activeNodeSubscription) {
      this.activeNodeSubscription.unsubscribe();
    }
  }
}
