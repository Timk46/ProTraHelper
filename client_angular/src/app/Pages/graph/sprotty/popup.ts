/********************************************************************************
 * Copyright (c) 2017-2018 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable, inject } from 'inversify';
import {
    TYPES, IModelFactory, IPopupModelProvider
} from 'sprotty';
import { PreRenderedElement, RequestPopupModelAction, SModelElement, SModelRoot } from 'sprotty-protocol';
import { SprottyConceptNode } from './sprottyModels.interface';

@injectable()
export class PopupModelProvider implements IPopupModelProvider {

    @inject(TYPES.IModelFactory) modelFactory: IModelFactory | undefined;

    getPopupModel(request: RequestPopupModelAction, element?: SModelElement): SModelRoot | undefined {
        console.log("PopupModelProvider.getPopupModel: request=", request, " element=", element)
        if (element !== undefined && element.type.startsWith('node:')) {
            return {
                type: 'html',
                id: 'popup',
                children: [
                    <PreRenderedElement> {
                        type: 'pre-rendered',
                        id: 'popup-title',
                        code: `<div class="sprotty-popup-title"><span class="fa fa-info-circle"/> Name </div>`
                    },
                    <PreRenderedElement> {
                        type: 'pre-rendered',
                        id: 'popup-body',
                        code: '<div class="sprotty-popup-body">Description</div>'
                    }
                ]
            };
        }
        return undefined;
    }

}
