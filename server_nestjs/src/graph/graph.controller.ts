import { ConceptGraph } from '@Interfaces/index';
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { GraphService } from './graph.service';

@Controller('graph')
export class GraphController {

    constructor(private graphService: GraphService) {}

    @Get()
    async getConceptGraph(): Promise<ConceptGraph>{
        const graph: ConceptGraph = await this.graphService.getConceptGraph();
        return graph;
    }

    @Get(':userId')
    async getUserConceptGraph(@Param('userId', ParseIntPipe) userId: number): Promise<ConceptGraph>{
        const graph: ConceptGraph = await this.graphService.getConceptGraph(userId);
        return graph;
    }


}
