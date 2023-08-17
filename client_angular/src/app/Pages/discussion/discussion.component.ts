import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-discussion',
  templateUrl: './discussion.component.html',
  styleUrls: ['./discussion.component.css']
})
export class DiscussionComponent implements OnInit {

  @Input() activeNode: any; // ToDo: This should be the node with all needed information (placeholder since we dont have testdata yet)

  constructor() { }

  ngOnInit() {
  }

}
