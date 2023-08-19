import { Component, OnInit } from '@angular/core';
import { LocalModelSource, TYPES } from 'sprotty';
import  createContainer  from './sprotty/di.config';

import { GraphDataService } from 'src/app/Services/graph-data.service';
import { ConceptGraphModelSource } from './sprotty/model-source';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css']
})
export class GraphComponent implements OnInit {

    container = createContainer('concept-graph');
    modelSource = this.container.get<ConceptGraphModelSource>(TYPES.ModelSource);

  constructor(private graphData: GraphDataService) { }

  ngOnInit() {
    
  }

}
