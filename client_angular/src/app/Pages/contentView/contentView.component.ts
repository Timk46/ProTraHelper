import { Component, Inject, Input, OnInit } from '@angular/core';
import { ContentDTO, ContentElementDTO } from '@DTOs/content.dto';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-contentView',
  templateUrl: './contentView.component.html',
  styleUrls: ['./contentView.component.css']
})
export class ContentViewComponent implements OnInit {

  contentViewData: ContentDTO;

  // Get Data from Dialog
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.contentViewData = data.contentViewData as ContentDTO;
    // sort contentElements by position
    this.contentViewData.contentElements = this.contentViewData.contentElements.sort((a, b) => a.position - b.position);
  }

  // for testing -> print ContentElems as String
  tempForTest(data: ContentElementDTO) :string {
    return JSON.stringify(data);
  }

  ngOnInit() {
  }

}
