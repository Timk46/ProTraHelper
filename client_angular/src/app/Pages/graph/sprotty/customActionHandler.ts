import { injectable } from 'inversify';
import { Action } from 'sprotty-protocol';
import { CustomAction } from './actions';

@injectable()
export class CustomActionHandler {
  handle(action: Action): void {
    if (action.kind === CustomAction.KIND) {
      const customAction = action as CustomAction;
      console.log(`Handling CustomAction for node ID: ${customAction.nodeId}`);
      // Implement your custom logic here
    }
  }
}
