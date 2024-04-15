import { Container, ContainerModule } from 'inversify';
import { configureModelElement, configureViewerOptions, loadDefaultModules, LocalModelSource, 
    PolylineEdgeView, SCompartmentView, SCompartmentImpl, SEdgeImpl, SGraphImpl, SGraphView, SLabelImpl, SLabelView, 
    SNodeImpl, TYPES, RectangularNode, expandFeature, nameFeature, SButtonImpl,
    configureButtonHandler, SRoutingHandleImpl, SRoutingHandleView, SModelElementImpl, SPortImpl, ConsoleLogger, 
    LogLevel, moveFeature, selectFeature, editFeature } from 'sprotty';
import { ConceptNodeView, CustomExpandButtonView, LeafConceptView, MiniConceptView,} from './views';
import { ConceptGraphModelSource } from './model-source';
import ElkConstructor, { LayoutOptions } from 'elkjs';
import {
    DefaultLayoutConfigurator, ElkFactory, ElkLayoutEngine, ILayoutConfigurator, elkLayoutModule
} from 'sprotty-elk/lib/inversify';
import { SGraph as SGraphP, SModelIndex, SNode as SNodeP, Point} from 'sprotty-protocol';
import { CustomMouseListener } from './mouse-interactions';
import { PopupModelProvider } from './popup';
import { ClassContextMenuItemProvider, ClassContextMenuService } from './context-menu';


// This file creates an inversify container for the sprotty diagram.
export default (containerId: string) => {
    const elkFactory: ElkFactory = () => new ElkConstructor({
        algorithms: ['layered']
    });
    
    const myModule = new ContainerModule((bind, unbind, isBound, rebind) => {
        bind(TYPES.ModelSource).to(ConceptGraphModelSource).inSingletonScope();
        rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
        rebind(TYPES.LogLevel).toConstantValue(LogLevel.error);
        bind(TYPES.IModelLayoutEngine).toService(ElkLayoutEngine);
        bind(ElkFactory).toConstantValue(elkFactory);
        rebind(ILayoutConfigurator).to(RandomGraphLayoutConfigurator);

        //popup (doesn't work)
        //bind(TYPES.IPopupModelProvider).to(PopupModelProvider);

        // context menu 
        //bind(TYPES.IContextMenuService).to(ClassContextMenuService);
        //bind(TYPES.IContextMenuItemProvider).to(ClassContextMenuItemProvider);

        //double click
        bind(CustomMouseListener).toSelf().inSingletonScope();
        bind(TYPES.MouseListener).toService(CustomMouseListener);


        //drag and drop
        //bind(NodeCreator).toConstantValue(nodeCreator);
        // bind(DroppableMouseListener).toSelf().inSingletonScope();
        // bind(TYPES.MouseListener).toService(DroppableMouseListener);

        const context = { bind, unbind, isBound, rebind };
        configureModelElement(context, 'graph', SGraphImpl, SGraphView);
        configureModelElement(context, 'node:concept', RectangularNode, ConceptNodeView,{
            enable: [expandFeature], disable: [moveFeature]
        });
        configureModelElement(context, 'node:mini-concept', RectangularNode, MiniConceptView, {
            disable: [moveFeature]
        });
        configureModelElement(context, 'node:leaf-concept', RectangularNode, LeafConceptView, {
            disable: [moveFeature]
        });
        configureModelElement(context, 'edge', SEdgeImpl, PolylineEdgeView, {
            disable: [editFeature]
        });
        configureModelElement(context, 'label:heading', SLabelImpl, SLabelView)
        configureModelElement(context, 'label:text', SLabelImpl, SLabelView)
        configureModelElement(context, 'comp', SCompartmentImpl, SCompartmentView)
        
        //collapse expand button
        configureModelElement(context, 'button:expand', SButtonImpl, CustomExpandButtonView); 


        configureViewerOptions(context, {
            needsClientLayout: true,
            baseDiv: containerId
        });
    });

    const container = new Container();
    loadDefaultModules(container);
    container.load(elkLayoutModule, myModule);
    return container;
};


// This class is used to configure the layouting done by elk.
// elk-sprotty does some layouting beforehand to calculate the sizes of
// labels and stuff, so not every elk configuration actually does something
export class RandomGraphLayoutConfigurator extends DefaultLayoutConfigurator {

    protected override graphOptions(sgraph: SGraphP, index: SModelIndex): LayoutOptions | undefined {
        return {
            'org.eclipse.elk.algorithm': 'org.eclipse.elk.layered',
            'org.eclipse.elk.nodeLabels.padding': '[top=5, bottom=0, left=25, right=25]', // important for button-label spacing
            'org.eclipse.elk.spacing.edgeNode': '20', // space between node and edge
        };
    }

    protected override nodeOptions(snode: SNodeP, index: SModelIndex): LayoutOptions | undefined {
        if(snode.type === 'node:concept'){
            return {
                'org.eclipse.elk.nodeSize.constraints': 'PORTS PORT_LABELS NODE_LABELS MINIMUM_SIZE',
                'org.eclipse.elk.nodeLabels.placement': 'INSIDE H_CENTER V_TOP', // very important
                'org.eclipse.elk.nodeLabels.padding': '[top=5, bottom=0, left=25, right=25]',
                'org.eclipse.elk.padding': '[top=30, bottom=20, left=20, right=20]',
                'org.eclipse.elk.spacing.labelLabel': '5',
                'org.eclipse.elk.spacing.edgeNode': '20', // space between node and edge
                //'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '500', // space between two connected nodes
            };
        }
        if(snode.type === 'node:leaf-concept'){
            return {
                'org.eclipse.elk.nodeSize.constraints': 'PORTS PORT_LABELS NODE_LABELS MINIMUM_SIZE',
                'org.eclipse.elk.nodeSize.minimum': '(130, 40)', 
                'org.eclipse.elk.nodeLabels.placement': 'INSIDE H_CENTER V_CENTER', // very important
                'org.eclipse.elk.nodeLabels.padding': '[top=10, bottom=10, left=25, right=25]',
                'org.eclipse.elk.spacing.edgeNode': '20', // space between node and edge
                'org.eclipse.elk.spacing.labelLabel': '5',
            };
        }
        return {
            'org.eclipse.elk.nodeSize.constraints': 'PORTS PORT_LABELS NODE_LABELS MINIMUM_SIZE',
            'org.eclipse.elk.nodeLabels.placement': 'INSIDE H_CENTER V_TOP', // very important
            'org.eclipse.elk.nodeLabels.padding': '[top=0, bottom=0, left=25, right=25]',
            'org.eclipse.elk.spacing.labelLabel': '5',
            'org.eclipse.elk.spacing.edgeNode': '20', // space between node and edge
            //'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '500', // space between two connected nodes
        };
    }

}
