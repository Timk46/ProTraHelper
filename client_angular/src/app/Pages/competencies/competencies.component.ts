import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import type { ContentsForConceptDTO } from '@DTOs/content.dto';
import { ContentDTO } from '@DTOs/content.dto';

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
