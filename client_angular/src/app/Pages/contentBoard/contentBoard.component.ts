import { ContentDTO, ContentsForConceptDTO } from '@DTOs/content.dto';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ContentViewComponent } from '../contentView/contentView.component';

@Component({
  selector: 'app-contentBoard',
  templateUrl: './contentBoard.component.html',
  styleUrls: ['./contentBoard.component.css']
})
export class ContentBoardComponent implements OnInit {

  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  constructor(private router: Router, public dialog: MatDialog) { }

  ngOnInit() {
  }

  onContentClick(content: ContentDTO) {

    // Create Dialog Config https://material.angular.io/components/dialog/api#MatDialogConfig
    const dialogConfig = new MatDialogConfig();

    // Communicate ContentDTO with all ContentElements of that ContentView to the Dialog/ContentViewComponent
    dialogConfig.data = {
      contentViewData: content
    };

    // Open the Dialog with ContentViewComponent. We could navigate to the component instead aswell.
    this.dialog.open(ContentViewComponent, dialogConfig);
  }

}
