import { ContentDTO, ContentsForConceptDTO } from '@DTOs/content.dto';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ContentViewComponent } from '../contentView/contentView.component';
import { MatTab } from '@angular/material/tabs';
import { MatTableDataSource } from '@angular/material/table';

interface ContentViewData {
  id: number;
  name: string;
  progress: any;
  question: any;
  action: ContentDTO;
}

@Component({
  selector: 'app-contentBoard',
  templateUrl: './contentBoard.component.html',
  styleUrls: ['./contentBoard.component.css'],
})
export class ContentBoardComponent implements OnInit, OnChanges {
  @Input() activeConceptNodeId: number = -1; //needed for the discussion creation dialog

  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  displayedColumns: string[] = [
    'id',
    'name',
    'progress',
    'question',
    'actions',
  ];
  dataSource : MatTableDataSource<ContentViewData> = new MatTableDataSource<ContentViewData>();

  constructor(private router: Router, public dialog: MatDialog) {}
  

  ngOnInit() {
  }

  ngOnChanges() {
    this.dataSource.data = [];
    for (let content of this.contentsForActiveConceptNode.trainedBy) {
      // console.log('Test: ', content);
      const input: ContentViewData = {
        id: content.contentNodeId,
        name: content.name.toString(),
        progress: content.contentElements.length,
        question: null,
        action: content,
      };
      this.dataSource.data.push(input);
    }
    this.dataSource.data = this.dataSource.data;
  }

  onContentClick(content: ContentDTO) {

    // Create Dialog Config https://material.angular.io/components/dialog/api#MatDialogConfig
    const dialogConfig = new MatDialogConfig();

    // Communicate ContentDTO with all ContentElements of that ContentView to the Dialog/ContentViewComponent
    dialogConfig.data = {
      contentViewData: content,
      conceptNodeId: this.activeConceptNodeId,
    };

    // Open the Dialog with ContentViewComponent. We could navigate to the component instead aswell.
    this.dialog.open(ContentViewComponent, dialogConfig);
  }
}
