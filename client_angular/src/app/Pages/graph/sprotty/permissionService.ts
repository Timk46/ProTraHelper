// saves permissions of the user
// todo: get permissions from somewhere

import { injectable } from 'inversify';

@injectable()
export class PermissionService {
    private flags: { [key: string]: boolean } = {};

    constructor() {
        this.flags['editConcept'] = true;
        this.flags['deleteConcept'] = true;
        this.flags['createConcept'] = true;
    }

    public isAllowed(permission: string): boolean {
        return this.flags[permission];
    }


}