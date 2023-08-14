import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.css']
})
export class ContentComponent implements OnInit {

  @Input() activeNode: any; // ToDo: This should be the node with all needed information (placeholder since we dont have testdata yet)
  cards = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }));

  constructor(private router: Router) { }

  ngOnInit() {
  }

  onCardClick(id: number) {
    console.log(`Card with ID ${id} clicked.`);
    this.router.navigate(['/instruction', id]);
  }

}
