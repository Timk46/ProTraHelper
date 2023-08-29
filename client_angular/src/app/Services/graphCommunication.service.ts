import { ConceptNodeDTO } from '@DTOs/conceptNode.dto';
import { BehaviorSubject } from 'rxjs';

export class GraphCommunicationService {
    private static instance: GraphCommunicationService;

    // init with dummy node
    dummyNode: ConceptNodeDTO = {
        databaseId: 0,
        name: 'dummy',
        level: 0,
        expanded: false,
        parentIds: [],
        childIds: [],
        prerequisiteEdgeIds: [],
        successorEdgeIds: [],
        edgeChildIds: [],
    };

    private ActiveNode = new BehaviorSubject<ConceptNodeDTO>(this.dummyNode);
    currentActiveNode = this.ActiveNode.asObservable();

    private constructor() {}

    // Singleton pattern
    public static getInstance(): GraphCommunicationService {
        if (!GraphCommunicationService.instance) {
            GraphCommunicationService.instance = new GraphCommunicationService();
        }
        return GraphCommunicationService.instance;
    }

    // communication between graph and contentOverview
    changeActiveNode(ActiveNode: ConceptNodeDTO) {
        this.ActiveNode.next(ActiveNode);
    }
}
