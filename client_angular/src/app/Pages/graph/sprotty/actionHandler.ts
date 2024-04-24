// client_angular/src/app/Pages/graph/sprotty/actionHandlerInitializer.ts

import { inject, injectable } from "inversify";
import { TYPES, ActionHandlerRegistry } from "sprotty";
import { TouchEventActionHandler } from "./touchEventActionHandler";
import { TouchEventAction } from "./actions";
import {TYPESS} from "./symbols";

@injectable()
export class ActionHandlerInitializer {
    constructor(
        @inject(TYPESS.ActionHandlerRegistry) private registry: ActionHandlerRegistry,
        @inject(TYPESS.TouchEventActionHandler) private touchEventActionHandler: TouchEventActionHandler
    ) {}

    initialize(): void {
        this.registry.register(TouchEventAction.KIND, this.touchEventActionHandler);
    }
}
