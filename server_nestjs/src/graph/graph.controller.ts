import { ConceptGraphDTO } from '@DTOs/index';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { GraphService } from './graph.service';

@Controller('graph')
export class GraphController {

    constructor(private graphService: GraphService) {}

    /**
     * This function returns a concept graph without data about a course or a user
     * @returns the concept graph
     */
    @Get()
    async getConceptGraph(): Promise<ConceptGraphDTO>{
        const graph: ConceptGraphDTO = await this.graphService.getConceptGraph();
        return graph;
    }

    /**
     * This function returns a concept graph with data about a user (the level)
     * @param userId the user id
     * @returns the concept graph
     */
    @Get(':userId')
    async getUserConceptGraph(@Param('userId', ParseIntPipe) userId: number): Promise<ConceptGraphDTO>{
        const graph: ConceptGraphDTO = await this.graphService.getConceptGraph(userId);
        return graph;
    }

    /**
     * This function creates a new concept node
     * @param parentId the parent id
     * @param name the name of the concept
     * @returns the new concept
     */
    // todo: add body for description and moduleGoals
    @Post('concept/:parentId/:name')
    async createConceptNode(@Param('parentId', ParseIntPipe) parentId:number, @Param('name') name: string): Promise<any> { // todo: there must be a better way than any
        console.log("in createConceptNode controller: ", parentId, name)
        const newConcept = await this.graphService.createConceptNode(parentId, name);
        return newConcept;
    }

    @Delete('concept/:conceptId')
    async deleteConceptNode(@Param('conceptId', ParseIntPipe) conceptId:number): Promise<any> {
        console.log("in deleteConceptNode controller: ", conceptId)
        const deletedConcept = await this.graphService.deleteConceptNode(conceptId);
        return deletedConcept;
    }

    @Put('userConcept/:userId/:conceptId')
    async updateUserConceptData(
        @Param('userId', ParseIntPipe) userId: number, 
        @Param('conceptId', ParseIntPipe) conceptId: number, 
        @Body() data: any): Promise<any> {
        // todo: sanitize data
        const updatedUserConcept = await this.graphService.updateUserConceptData(userId, conceptId, data);
        console.log("updated user concept to: " , updatedUserConcept);
        return updatedUserConcept;
    }




}
