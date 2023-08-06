import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChangeActiveNodeService } from 'src/app/Services/changeActiveNode.service';

@Component({
  selector: 'app-contentOverview',
  templateUrl: './contentOverview.component.html',
  styleUrls: ['./contentOverview.component.css'],
})
export class ContentOverviewComponent implements OnInit, OnDestroy {
  private changeActiveNodeService: ChangeActiveNodeService = ChangeActiveNodeService.getInstance();

  private activeNodeSubscription: Subscription;
  activeNode: any; // TODO: type

  constructor() {
    this.activeNodeSubscription = this.changeActiveNodeService.currentActiveNode.subscribe((ActiveNode) => {
      this.activeNode = JSON.stringify(ActiveNode); // TODO: type
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
