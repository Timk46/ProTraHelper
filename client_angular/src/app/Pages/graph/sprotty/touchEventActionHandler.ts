// client_angular/src/app/Pages/graph/sprotty/touchEventActionHandler.ts

import { injectable } from 'inversify';
import type { Action } from 'sprotty-protocol';
import { TouchEventAction } from './actions';

@injectable()
export class TouchEventActionHandler {
  handle(action: Action): void {
    if (action.kind === TouchEventAction.KIND) {
      // Handle the touch event
      const touchEventAction = action as TouchEventAction;
      console.log(touchEventAction.touchEvent);
    }
  }
}
