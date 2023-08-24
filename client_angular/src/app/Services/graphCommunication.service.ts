import { BehaviorSubject } from 'rxjs';

export class GraphCommunicationService {
    private static instance: GraphCommunicationService;

    private ActiveNode = new BehaviorSubject<any>(null);
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
    changeActiveNode(ActiveNode: any) {
        this.ActiveNode.next(ActiveNode);
    }
}
