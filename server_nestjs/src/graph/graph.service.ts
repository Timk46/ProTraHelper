import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { ConceptNodeDTO, ConceptEdgeDTO, ConceptGraphDTO } from '@Interfaces/index';

@Injectable()
export class GraphService {

    constructor(private prisma: PrismaService) { }

    /**
     * returns the concept graph
     * if userId is provided, the graph will be returned with the user's 
     * level and other relevant information
     * @param userId
     * @returns the concept graph
     */
    async getConceptGraph(userId?: number): Promise<ConceptGraphDTO> {
        // get graph (only one graph exists for now)
        let graph = await this.prisma.conceptGraph.findFirst({});
        // if no graph exists, create a new one with a root node
        if (!graph) {
            graph = await this.initGraph();
        }

        // conditionally include UserConcept if userId is provided
        const includeCondition = userId !== undefined ? {
            userConcepts: {
                where: {
                    userId: userId
                }
            }
        } : { userConcepts: false };

        // all nodes, potentially joined with UserConcept table
        const nodes = await this.prisma.conceptNode.findMany({
            include: {
                ...includeCondition,
                myParents: true,
                myChildren: true,
                myPrerequisites: true,
                mySuccessors: true,
                childEdges: true,
            }
        });

        // create nodeMap
        const nodeMap: Record<string, ConceptNodeDTO> = {};
        nodes.forEach(node => {
            nodeMap[node.id] = {
                databaseId: node.id,
                name: node.name,

                // if no user concept exists, set expanded to false
                expanded: false,

                // graph helper fields
                parentIds: node.myParents.map(parent => parent.parentId),
                childIds: node.myChildren.map(child => child.childId),
                prerequisiteEdgeIds: node.myPrerequisites.map(prerequisite => prerequisite.id),
                successorEdgeIds: node.mySuccessors.map(successor => successor.id),
                edgeChildIds: node.childEdges.map(edge => edge.id),
            };
            // add level field if userId is provided
            if (userId !== undefined) {
                // if no user concept exists, set level to 0
                if (node.userConcepts.length === 0) {
                    nodeMap[node.id].expanded = false;
                    nodeMap[node.id].level = 0;
                }
                else {
                    nodeMap[node.id].expanded = node.userConcepts[0].expanded;
                    nodeMap[node.id].level = node.userConcepts[0].level;
                }
            }
        });

        // all edges
        const edges = await this.prisma.conceptEdge.findMany({});

        // create edgeMap
        const edgeMap: Record<string, ConceptEdgeDTO> = {};
        edges.forEach(edge => {
            edgeMap[edge.id] = {
                databaseId: edge.id,
                sourceId: edge.prerequisiteId,
                targetId: edge.successorId,
                parentId: edge.parentId
            };
        });

        // get current concept id


        // construct concept graph
        const conceptGraph: ConceptGraphDTO = {
            id: graph.id,
            name: graph.name,
            trueRootId: graph.rootId,
            nodeMap: nodeMap,
            edgeMap: edgeMap,
        };
        // if user id is provided, add currentConceptId to conceptGraph
        if (userId !== undefined) {
            const currentConcept = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { currentConcept: true }
            });
            if (currentConcept !== null){
                conceptGraph.currentConceptId = currentConcept.currentConcept.id || null;
            }
            else {
                conceptGraph.currentConceptId = 2;
            }
        }

        return conceptGraph;
    }

    async initGraph() {
        // create root node
        const root = await this.prisma.conceptNode.create({
            data: {
                name: 'root',
                description: '',
            }
        });

        // create graph
        const graph = await this.prisma.conceptGraph.create({
            data: {
                name: 'graph',
                rootId: root.id
            }
        });

        return graph;

    }

    /**
     * creates a new concept node and returns it
     * @param parentId
     * @param conceptName
     */
    async createConceptNode(parentId: number, conceptName: string) {
        const newConcept = await this.prisma.conceptNode.create({
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
        return newConcept;
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
        const edge = await this.prisma.conceptEdge.findFirst({
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

    async updateUserConceptData(userId: number, conceptNodeId: number, data: any): Promise<any> {
        const userConcept = await this.prisma.userConcept.findFirst({
            where: { conceptNodeId: conceptNodeId,
                     userId: userId }
        });

        const expanded = data.expanded !== undefined ? {expanded: data.expanded} : {expanded: false};
        const level = data.level !== undefined ? {level: data.level} : {};


        // if the userConcept does not exist, create it
        if (userConcept === null) {
            return await this.prisma.userConcept.create({
                data: {
                    concept: {
                        connect: {
                            id: conceptNodeId
                        }
                    },
                    user: {
                        connect: {
                            id: userId
                        }
                    },
                    ...expanded,
                    ...level
                }
            });
        }

        // if the userConcept exists, update it
        return await this.prisma.userConcept.update({
            where: { id: userConcept.id, },
            data: {
                ...expanded,
                ...level
            }
        });
    }

}
