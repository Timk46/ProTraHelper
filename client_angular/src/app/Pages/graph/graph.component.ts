import { Component, OnInit } from '@angular/core';
import { LocalModelSource, TYPES } from 'sprotty';
import createContainer from './sprotty/di.config';

import { GraphDataService } from 'src/app/Services/graph/graph-data.service';
import { ConceptGraphModelSource } from './sprotty/model-source';
import { ModuleDataService } from 'src/app/Services/module/module-data.service';
import { ModuleDTO } from '@DTOs/index';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css']
})
export class GraphComponent implements OnInit {

  container = createContainer('concept-graph');
  modelSource = this.container.get<ConceptGraphModelSource>(TYPES.ModelSource);
  modules: ModuleDTO[] = [];

  constructor(private graphData: GraphDataService, private moduleData: ModuleDataService) {
    this.moduleData.getUserModules().subscribe((modules) => {
      this.modules = modules;
      console.log("User modules: ", this.modules);
    }
    );
  }

  ngOnInit() {

  }

}
