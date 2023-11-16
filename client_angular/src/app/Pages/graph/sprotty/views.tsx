/** @jsx svg */
import { svg } from 'sprotty/lib/lib/jsx';
import { injectable } from 'inversify';
import { VNode } from 'snabbdom';
import {
    IView, RectangularNodeView, RenderingContext, SButtonImpl, SLabel,
    SLabelImpl,
    SLabelView, SNodeImpl, SPortImpl, ShapeView, findParentByFeature, isExpandable, setAttr
} from 'sprotty';
import { SprottyConceptNode } from "./sprottyModels.interface";

@injectable()
export class ConceptNodeView extends RectangularNodeView {
    override render(node: Readonly<SNodeImpl & SprottyConceptNode>, context: RenderingContext): VNode {

        let petals = [];
        const level = node.level || 0;

        if (level > 0) {
            // Generate normal petals based on node.level
            const levelPetals = Array.from({ length: level }).map((_, index) =>
                <path
                    className="sprotty-star"
                    // transform={`translate(${10 + (index * 10)},30) rotate(270)`}
                    // d="m1,2 c0,-8 19,-7 32,-4 c13,3 12,4 1,7 c-11,3 -33,4 -33,-4z"
                    transform={`translate(${2 + (index * 12)},-11) scale(0.07)`}
                    d="m83.66,5.71l12.23,37.64c1.11,3.4,4.28,5.71,7.86,5.71h39.58c8,0,11.33,10.24,4.86,14.95l-32.02,23.26c-2.9,2.1-4.11,5.83-3,9.24l12.23,37.64c2.47,7.61-6.24,13.94-12.72,9.24l-32.02-23.26c-2.9-2.1-6.82-2.1-9.71,0l-32.02,23.26c-6.48,4.71-15.19-1.63-12.72-9.24l12.23-37.64c1.11-3.4-.11-7.13-3-9.24L3.42,64.01c-6.48-4.71-3.15-14.95,4.86-14.95h39.58c3.58,0,6.75-2.31,7.86-5.71l12.23-37.64c2.47-7.61,13.24-7.61,15.72,0Z"
                />
            );
            petals.push(...levelPetals);
        }

        if (typeof node.levelGoal !== "undefined" && node.levelGoal > level) {
            // Generate greyed out petals based on the difference between node.levelGoal and node.level
            const levelGoalPetals = Array.from({ length: node.levelGoal - level }).map((_, index) =>
                <path
                    class={{ "sprotty-grey-star": true }}  // Assuming you've styled greyed-out petals in CSS
                    // transform={`translate(${10 + ((level + index) * 10)},33) rotate(270)`}
                    // d="m1,2 c0,-8 19,-7 32,-4 c13,3 12,4 1,7 c-11,3 -33,4 -33,-4z"
                    transform={`translate(${2 + ((level + index) * 12)},-11) scale(0.07)`}
                    d="m83.66,5.71l12.23,37.64c1.11,3.4,4.28,5.71,7.86,5.71h39.58c8,0,11.33,10.24,4.86,14.95l-32.02,23.26c-2.9,2.1-4.11,5.83-3,9.24l12.23,37.64c2.47,7.61-6.24,13.94-12.72,9.24l-32.02-23.26c-2.9-2.1-6.82-2.1-9.71,0l-32.02,23.26c-6.48,4.71-15.19-1.63-12.72-9.24l12.23-37.64c1.11-3.4-.11-7.13-3-9.24L3.42,64.01c-6.48-4.71-3.15-14.95,4.86-14.95h39.58c3.58,0,6.75-2.31,7.86-5.71l12.23-37.64c2.47-7.61,13.24-7.61,15.72,0Z"

                />
            );
            petals.push(...levelGoalPetals);
        }

        return <g>
            <g class-sprotty-star="true">
                {petals}  {/* Render the petals here */}
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

export class MiniConceptView extends RectangularNodeView {
    override render(node: Readonly<SNodeImpl & SprottyConceptNode>, context: RenderingContext): VNode {
        return <g>
            <rect class-sprotty-node={true}p class-mini-concept={true}
            class-mouseover={node.hoverFeedback} class-selected={node.selected}
                width={20}
                height={25}
                rx={2}
            >
            </rect>
        </g>;
    }
}

@injectable()
export class HeaderLabelView extends SLabelView {
    override render(label: Readonly<SLabelImpl>, context: RenderingContext): VNode {
        const vnode = <text x={10} y={30}>{label.text}</text>
        return vnode;
    }
}

@injectable()
export class TextLabelView extends SLabelView {
    override render(label: Readonly<SLabelImpl>, context: RenderingContext): VNode {
        const vnode = <text x={0} y={0} height={30}>{label.text}</text>
        return vnode;
    }
}

@injectable()
export class CustomCollapseExpandView implements IView {
    render(button: SButtonImpl, context: RenderingContext): VNode {
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
    render(node: Readonly<SPortImpl>, context: RenderingContext): VNode | undefined {
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

