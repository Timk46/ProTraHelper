import { Component, OnInit } from '@angular/core';
import { LocalModelSource, TYPES } from 'sprotty';
import  createContainer  from './sprotty/di.config';

import { GraphDataService } from 'src/app/Services/graph-data.service';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css']
})
export class GraphComponent implements OnInit {

    container = createContainer('concept-graph');
    modelSource = this.container.get<LocalModelSource>(TYPES.ModelSource);

  constructor(private graphData: GraphDataService) { }

  ngOnInit() {
    this.modelSource.updateModel();
  }

}
