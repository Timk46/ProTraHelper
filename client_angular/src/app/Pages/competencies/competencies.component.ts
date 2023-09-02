import { Component, Input, OnInit } from '@angular/core';
import { ContentsForConceptDTO, ContentDTO } from '@DTOs/content.dto';

@Component({
  selector: 'app-competencies',
  templateUrl: './competencies.component.html',
  styleUrls: ['./competencies.component.scss']
})
export class CompetenciesComponent implements OnInit {

  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  ngOnInit() {
  }


}
