import { BehaviorSubject } from 'rxjs';

export class ChangeActiveNodeService {
    private static instance: ChangeActiveNodeService;

    private ActiveNode = new BehaviorSubject<any>(null);
    currentActiveNode = this.ActiveNode.asObservable();

    private constructor() {}

    // Singleton pattern
    public static getInstance(): ChangeActiveNodeService {
        if (!ChangeActiveNodeService.instance) {
            ChangeActiveNodeService.instance = new ChangeActiveNodeService();
        }
        return ChangeActiveNodeService.instance;
    }

    // communication between graph and contentOverview
    changeActiveNode(ActiveNode: any) {
        this.ActiveNode.next(ActiveNode);
    }
}
