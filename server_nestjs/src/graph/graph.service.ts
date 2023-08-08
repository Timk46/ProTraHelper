import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { ConceptNode, ConceptEdge, ConceptGraph } from '@Interfaces/index';

@Injectable()
export class GraphService {

    constructor(private prisma: PrismaService) { }

    /**
     * creates a new concept node and returns it
     * @param parentId 
     * @param conceptName 
     */
    async createConcept(parentId: number, conceptName: string) {
        const newConcept = await this.prisma.concept.create({
            data: {
                name: conceptName,
                description: '',
                myParents: {
                    create: [
                        {
                            parent: {
                                connect: {
                                    id: parentId
                                }
                            }
                        }
                    ]
                }
            }
        });
    }

    /**
     * creates a new concept edge and returns it
     * @param parentId
     * @param prerequisiteId
     * @param successorId
     * @returns the new concept edge
     */
    async createConceptEdge(parentId: number, prerequisiteId: number, successorId: number) {
        // check if edge already exists
        const edge = await this.prisma.conceptEdge.findUnique({
            where: {
                parentId: parentId,
                prerequisiteId: prerequisiteId,
                successorId: successorId
            }
        });
        if (edge) {
            return edge;
        }

        // create new edge
        const newEdge = await this.prisma.conceptEdge.create({
            data: {
                prerequisite: {
                    connect: {
                        id: prerequisiteId
                    }
                },
                successor: {
                    connect: {
                        id: successorId
                    }
                },
                parent: {
                    connect: {
                        id: parentId
                    }
                }
            }
        });
        return newEdge;
    }

    /**
     * deletes a childless concept
     * @param conceptNodeId 
     * @returns 
     */
    async deleteConceptNode(conceptNodeId: number): Promise<any> {
        // can only delete concept nodes that have no children
        return await this.prisma.conceptNode.delete({
            where: { id: conceptNodeId },
        });
    }

    /**
     * deletes a concept edge
     * @param conceptEdgeId 
     * @returns 
     */
    async deleteConceptEdge(conceptEdgeId: number): Promise<any> {
        return await this.prisma.conceptEdge.delete({
            where: { id: conceptEdgeId },
        });
    }

}
