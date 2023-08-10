/** @jsx svg */
import { svg } from 'sprotty/lib/lib/jsx';
import { injectable } from 'inversify';
import { VNode } from 'snabbdom';
import {
    IView, RectangularNodeView, RenderingContext, SButton, SLabel,
    SLabelView, SNode, SPort, ShapeView, findParentByFeature, isExpandable, setAttr
} from 'sprotty';
import { ConceptNode } from '../../../Interfaces/conceptNode.interface';

@injectable()
export class ConceptNodeView extends RectangularNodeView {
    override render(node: Readonly<SNode & ConceptNode>, context: RenderingContext): VNode {
        return <g>
            <g class-flower="true">
                <path className="petal" transform="translate(20,20) rotate(180)" d="m1,2 c0,-8 19,-7 32,-4 c13,3 12,4 1,7 c-11,3 -33,4 -33,-4z" />
                <path className="petal" transform="translate(20,20) rotate(270)" d="m1,2 c0,-8 19,-7 32,-4 c13,3 12,4 1,7 c-11,3 -33,4 -33,-4z" />
                <path className="petal" transform="translate(20,20) rotate(240)" d="m1,2 c0,-8 19,-7 32,-4 c13,3 12,4 1,7 c-11,3 -33,4 -33,-4z" />
                <path className="petal" transform="translate(20,20) rotate(210)" d="m1,2 c0,-8 19,-7 32,-4 c13,3 12,4 1,7 c-11,3 -33,4 -33,-4z" />
            </g>
            
            <rect class-sprotty-node={true} class-concept={true}
                width={node.size.width}
                height={node.size.height}
                class-mouseover={node.hoverFeedback} class-selected={node.selected}
                rx={5}
            >
            </rect>
            <rect width={node.size.width - 2}
                height={30}
                fill="#29669b"
                x={1}
                y={1}
                rx={5}
            ></rect>
            {context.renderChildren(node)}
        </g>;
    }
}

@injectable()
export class HeaderLabelView extends SLabelView {
    override render(label: Readonly<SLabel>, context: RenderingContext): VNode {
        const vnode = <text x={10} y={30}>{label.text}</text>
        return vnode;
    }
}

@injectable()
export class TextLabelView extends SLabelView {
    override render(label: Readonly<SLabel>, context: RenderingContext): VNode {
        const vnode = <text x={0} y={0} height={30}>{label.text}</text>
        return vnode;
    }
}

@injectable()
export class CustomCollapseExpandView implements IView {
    render(button: SButton, context: RenderingContext): VNode {
        const expandable = findParentByFeature(button, isExpandable);
        const buttonText = (expandable !== undefined && expandable.expanded)
            ? 'Collapse Node'
            : 'Expand Node';
        return (
            <g class-sprotty-button="{true}"
                class-enabled="{button.enabled}"
            >
                <rect x={0} y={0} width={100} height={30} fill="blue"></rect>
                <text x={50} y={20} text-anchor="middle" fill="white">{buttonText}</text>
            </g>
        );
    }

}

@injectable()
export class PortViewWithExternalLabel extends ShapeView {
    render(node: Readonly<SPort>, context: RenderingContext): VNode | undefined {
        if (!this.isVisible(node, context)) {
            return undefined;
        }
        const bboxElement = <rect
            class-sprotty-port={true}
            class-mouseover={node.hoverFeedback} class-selected={node.selected}
            x="0" y="0" width={Math.max(node.size.width, 0)} height={Math.max(node.size.height, 0)}>
        </rect>;
        //setAttr(bboxElement, ATTR_BBOX_ELEMENT, true);
        return <g>
            {bboxElement}
            {context.renderChildren(node)}
        </g>;
    }
}

