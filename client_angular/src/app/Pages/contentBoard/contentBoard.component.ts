import { ContentDTO, ContentsForConceptDTO } from '@DTOs/content.dto';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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

  constructor(private router: Router) { }

  ngOnInit() {
  }

  onContentClick(content: ContentDTO) {
    console.log(`Clicked on Card for ContentNode: ${content.contentNodeId}`);
    this.router.navigate(['/pdfViewer', 'randomString1']); // this is just a static placeholder -> from here we need to navigate to the content view
  }

}
