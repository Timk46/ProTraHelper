import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-contentBoard',
  templateUrl: './contentBoard.component.html',
  styleUrls: ['./contentBoard.component.css']
})
export class ContentBoardComponent implements OnInit {

  @Input() activeNode: any = {}; // ToDo: This should be the node with all needed information (placeholder since we dont have testdata yet)
  cards = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }));

  constructor(private router: Router) { }

  ngOnInit() {
  }

  onCardClick(id: number) {
    console.log(`Card with ID ${id} clicked.`);
    this.router.navigate(['/pdfViewer', 'randomString1']); // this is just a static placeholder -> from here we need to navigate to the content view
  }

}
