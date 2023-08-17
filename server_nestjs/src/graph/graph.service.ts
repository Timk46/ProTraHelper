import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { ConceptNode, ConceptEdge, ConceptGraph } from '@Interfaces/index';

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
    async getConceptGraph(userId?: number): Promise<ConceptGraph> {
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
        } : {userConcepts: false};

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
        const nodeMap: Record<string, ConceptNode> = {};
        nodes.forEach(node => {
            nodeMap[node.id] = {
                databaseId: node.id,
                name: node.name,

                // if no user concept exists, set expanded to false
                expanded: node.userConcepts[0].expanded || false,

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
                nodeMap[node.id].level = node.userConcepts[0].level || 0;
            }
        });

        // all edges
        const edges = await this.prisma.conceptEdge.findMany({});

        // create edgeMap
        const edgeMap: Record<string, ConceptEdge> = {};
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
        const conceptGraph: ConceptGraph = {
            id: graph.id,
            name: graph.name,
            trueRootId: graph.ancestorId,
            nodeMap: nodeMap,
            edgeMap: edgeMap,
        };
        // if user id is provided, add currentConceptId to conceptGraph
        if (userId !== undefined) {
            const currentConcept = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { currentConcept: true }
            });
            conceptGraph.currentConceptId = 'node_' + currentConcept.currentConcept || null;
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
                ancestorId: root.id
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

}
