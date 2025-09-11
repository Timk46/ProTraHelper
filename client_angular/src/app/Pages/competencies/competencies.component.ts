import { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { ContentsForConceptDTO } from '@DTOs/index';
import { ContentDTO } from '@DTOs/index';

@Component({
  selector: 'app-competencies',
  templateUrl: './competencies.component.html',
  styleUrls: ['./competencies.component.scss'],
})
export class CompetenciesComponent implements OnInit {
  @Input() contentsForActiveConceptNode: ContentsForConceptDTO = {
    trainedBy: [],
    requiredBy: [],
  };

  ngOnInit() {}
}
