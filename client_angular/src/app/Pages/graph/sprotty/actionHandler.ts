// client_angular/src/app/Pages/graph/sprotty/actionHandlerInitializer.ts

import { inject, injectable } from 'inversify';
import { ActionHandlerRegistry } from 'sprotty';
import { TYPES } from 'sprotty';
import { TouchEventActionHandler } from './touchEventActionHandler';
import { CustomAction, TouchEventAction } from './actions';
import { TYPESS } from './symbols';
import { CustomActionHandler } from './customActionHandler';

@injectable()
export class ActionHandlerInitializer {
  constructor(
    @inject(TYPESS.ActionHandlerRegistry) private readonly registry: ActionHandlerRegistry,
    @inject(TYPESS.TouchEventActionHandler)
    private readonly touchEventActionHandler: TouchEventActionHandler,
    @inject(TYPESS.CustomActionHandler) private readonly customActionHandler: CustomActionHandler,
  ) {}

  initialize(): void {
    this.registry.register(TouchEventAction.KIND, this.touchEventActionHandler);
    this.registry.register(CustomAction.KIND, this.customActionHandler);
  }
}
