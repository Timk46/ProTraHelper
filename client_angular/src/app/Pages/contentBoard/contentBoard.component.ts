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
    // Dialog-Konfiguration erstellen
    const dialogConfig = new MatDialogConfig();

    // Übergeben der Daten an den Dialog
    dialogConfig.data = {
      contentViewData: content
    };

    // Dialog öffnen
    this.dialog.open(ContentViewComponent, dialogConfig);
  }

}
