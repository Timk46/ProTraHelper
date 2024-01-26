/** @jsx svg */
import { svg } from 'sprotty/lib/lib/jsx';
import { injectable } from 'inversify';
import { VNode } from 'snabbdom';
import {
    IView, RectangularNodeView, RenderingContext, SButtonImpl,
    SLabelImpl,
    SLabelView, SNodeImpl, SPortImpl, ShapeView, findParentByFeature, isExpandable, setAttr
} from 'sprotty';
import { SprottyConceptNode } from "./sprottyModels.interface";

@injectable()
export class ConceptNodeView extends RectangularNodeView {
    override render(node: Readonly<SNodeImpl & SprottyConceptNode>, context: RenderingContext): VNode {
        const renderAsOneProgressBar = () => {

            // sum up all the goals and achieved

            const goal = node.descendantLevelGoals ? node.descendantLevelGoals.reduce((acc, current) => { return acc + current; }) : 0;
            const achieved = node.descendantLevels ? node.descendantLevels.reduce((acc, current) => { return acc + current; }) : 0;
            const total = goal//node.numberDescendants ? node.numberDescendants*6 : 0;

            const segments = [];
            const gap = 0;
            const segmentWidth = node.size.width - 2 * gap;
            const segmentHeight = 10;
            console.log('nodeI:' + node.name + ' total: ' + total + ' goal: ' + goal + ' achieved: ' + achieved);
            for (let i = 0; i < total; i++) {
                segments.push(<rect
                    width={segmentWidth / total}
                    y={-segmentHeight}
                    x={i * (segmentWidth / total) + gap}
                    height={segmentHeight}

                    //fill={i < achieved ? '#a3be8c' : i < goal ? "#ebcb8b" : "white"}
                    class-sprotty-progress-bar-segment={true}
                    class-achieved={i < achieved ? true : false}
                    class-goal={i < goal && i >= achieved ? true : false}
                ></rect>);
            }
            // Add border
            segments.push(
                <rect
                    key="border"
                    width={segmentWidth}
                    y={-segmentHeight}
                    x={gap}
                    height={segmentHeight}
                    class-sprotty-progress-bar-border={true}
                />
            );
            return <g className="sprotty-progress-bar">{segments}</g>;
        };


        // actual rendering of everything
        return <g>
            {/* <g class-sprotty-star="true">
                {petals}  
            </g> */}


            {/* Render the node here */}
            <rect class-sprotty-node={true} class-concept={true}
                width={node.size.width}
                height={node.size.height}
                class-mouseover={node.hoverFeedback} class-selected={node.selected}
            // rx={5}
            >
            </rect>
            {/* hacky solution to get the blue background in the concept header */}
            <rect width={node.size.width}
                height={30}
                class-sprotty-concept-header={true}
                x={0}
                y={0}
            // rx={5}
            ></rect>

            {!node.expanded && renderAsOneProgressBar()}
            {context.renderChildren(node)}
        </g>;
    }
}

export class LeafConceptView extends RectangularNodeView {
    override render(node: Readonly<SNodeImpl & SprottyConceptNode>, context: RenderingContext): VNode {
        // progress bar
        const renderProgressBarSegment = (goal: number, achieved: number, segmentNumber: number) => {
            const segments = [];
            const gap = 2;
            const cornerGap = 5;
            const segmentWidth = (node.size.width - cornerGap * 2) / 6 - 2 * gap;
            const segmentOffset = (node.size.width - cornerGap * 2) / 6;
            const segmentHeight = 10;
            //console.log('nodeI:' + node.name + ' total: ' + total + ' goal: ' + goal + ' achieved: ' + achieved + ' segmentNumber: ' + segmentNumber);

            segments.push(<rect
                width={segmentWidth}
                y={-10}
                x={segmentNumber * segmentOffset + gap + cornerGap}
                height={segmentHeight}
                class-sprotty-progress-bar-segment={true}
                class-achieved={0 < achieved ? true : false}
                class-goal={0 < goal && goal > achieved ? true : false}
                class-leaf={true}
            ></rect>);
            return <g >{segments}</g>;
        };

        const renderAllSegments = () => {
            const totalSegments = 6; // six levels
            const allSegments = [];
            let totalSubSegments = 0;
            let achieved = 0;
            let goal = 0;

            if (node.levelGoal !== undefined) {
                for (let i = 0; i < Math.max(node.levelGoal, node.level ? node.level : 0); i++) {
                    achieved = node.level === undefined ? 0 : node.level > i ? 1 : 0;
                    goal = node.levelGoal === undefined ? 0 : node.levelGoal > i ? 1 : 0;

                    allSegments.push(renderProgressBarSegment(goal, achieved, i));
                }
            }

            return <g className="sprotty-all-segments">{allSegments}</g>;
        };
        return <g>

            {/* Render the node here */}
            <rect class-sprotty-node={true} class-leaf-concept={true}
                width={node.size.width}
                height={node.size.height - 20}
                class-mouseover={node.hoverFeedback} class-selected={node.selected}
                y={0}
                rx={5}
            >
            </rect>
            {renderAllSegments()}
            {context.renderChildren(node)}
        </g>;
    }
}

export class MiniConceptView extends RectangularNodeView {
    override render(node: Readonly<SNodeImpl & SprottyConceptNode>, context: RenderingContext): VNode {
        return <g>
            <rect class-sprotty-node={true} p class-mini-concept={true}
                class-mouseover={node.hoverFeedback} class-selected={node.selected}
                width={node.size.width}
                height={node.size.height}
                rx={2}
            >
            </rect>
        </g>;
    }
}



@injectable()
export class CustomExpandButtonView implements IView {
    render(button: SButtonImpl, context: RenderingContext): VNode {
        const expandable = findParentByFeature(button, isExpandable);
        const path = expandable !== undefined && expandable.expanded
            ? 'M 1,5 L 8,12 L 15,5 Z'
            : 'M 1,1 L 8,8 L 1,15 Z';
        return <g
            class-sprotty-button="{true}" class-enabled="{button.enabled}">
            <path d={path}></path>
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

