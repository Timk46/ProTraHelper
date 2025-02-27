// client_angular/src/app/Pages/graph/sprotty/actionHandlerInitializer.ts

import { inject, injectable } from "inversify";
import { TYPES, ActionHandlerRegistry } from "sprotty";
import { TouchEventActionHandler } from "./touchEventActionHandler";
import { CustomAction, TouchEventAction } from "./actions";
import {TYPESS} from "./symbols";
import { CustomActionHandler } from "./customActionHandler";

@injectable()
export class ActionHandlerInitializer {
    constructor(
        @inject(TYPESS.ActionHandlerRegistry) private registry: ActionHandlerRegistry,
        @inject(TYPESS.TouchEventActionHandler) private touchEventActionHandler: TouchEventActionHandler,
        @inject(TYPESS.CustomActionHandler) private customActionHandler: CustomActionHandler
    ) {}

    initialize(): void {
        this.registry.register(TouchEventAction.KIND, this.touchEventActionHandler);
        this.registry.register(CustomAction.KIND, this.customActionHandler);
    }
}
