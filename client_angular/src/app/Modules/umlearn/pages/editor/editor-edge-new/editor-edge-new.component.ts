import type { ElementRef, Renderer2, SimpleChanges, OnChanges, AfterViewInit } from '@angular/core';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import type { Plug, PlugOptions } from './plugs';
import { availablePlugs, plugs } from './plugs';
import type { TextLabel, highlightedLineElements } from '@DTOs/index';
import { Side } from '@DTOs/index'; // Changed from @Interfaces
import type { EditorEdgeService } from '@UMLearnServices/editor-edge.service';
import { EditorElement } from '@DTOs/index';
import type { lineOptions } from './line-options';
import { umlLineOptions } from './line-options';
import type { ClassEdge } from '@DTOs/index'; // Changed from @Interfaces
import type { EdgeGrabPointComponent } from './edge-grab-point/edge-grab-point.component';

@Component({
  selector: 'app-editor-edge-new',
  templateUrl: './editor-edge-new.component.html',
  styleUrls: ['./editor-edge-new.component.scss'],
})
export class EditorEdgeNewComponent implements OnChanges, AfterViewInit {
  @Input() viewportElem: HTMLElement | undefined;
  @Input() startElem: HTMLElement | string | undefined;
  @Input() endElem: HTMLElement | string | undefined;
  @Input() draggable: boolean = false;
  @Input() customOptions: lineOptions = {};
  @Input() edgeData: ClassEdge | undefined;
  @Input() interactionsDisabled: boolean = false;

  @Output() edgeClicked = new EventEmitter();
  @Output() edgeUpdated = new EventEmitter<{
    startDirection?: Side;
    startDirectionOffset?: number;
    endDirection?: Side;
    endDirectionOffset?: number;
  }>();

  @ViewChild('svgElem') svgElem!: ElementRef<SVGElement>;
  @ViewChild('grabStart', { static: false }) grabStart!: EdgeGrabPointComponent;
  @ViewChild('grabEnd', { static: false }) grabEnd!: EdgeGrabPointComponent;

  options: lineOptions = {};
  viewPortElemProps: { width: number; height: number } = { width: 0, height: 0 };
  startElemProps: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  endElemProps: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  calculatedClosestSides: { startSide: Side; endSide: Side } = {
    startSide: Side.NONE,
    endSide: Side.NONE,
  };
  highlightedElements: highlightedLineElements = {};

  private allInputsSet = false;
  private viewInitialized = false;

  constructor(
    private readonly renderer: Renderer2,
    private readonly edgeService: EditorEdgeService,
  ) {
    // handle edgeService events
    this.edgeService.movedNode.subscribe((nodeUuid: string) => {
      if (
        nodeUuid === this.edgeData?.start ||
        nodeUuid === this.edgeData?.end ||
        nodeUuid === 'all'
      ) {
        this.tryDrawLine();
      }
    });
    this.edgeService.positionedEdge.subscribe((edgeUuid: string) => {
      if (edgeUuid === this.edgeData?.id) {
        this.tryDrawLine();
      }
    });
    this.edgeService.reconnectedEdge.subscribe(
      (edge: { id: string; start?: string | HTMLElement; end?: string | HTMLElement }) => {
        if (edge.id === this.edgeData?.id) {
          if (edge.start) {
            this.startElem = edge.start;
          }
          if (edge.end) {
            this.endElem = edge.end;
          }
          // reconnect after dom update
          setTimeout(() => {
            this.tryDrawLine();
          }, 0);
        }
      },
    );
  }

  /**
   * Called whenever the input properties of the component change.
   * @param changes - An object containing the changed input properties.
   * @returns void
   */
  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['viewportElem'] &&
      changes['startElem'] &&
      changes['endElem'] &&
      changes['viewportElem'].currentValue &&
      changes['startElem'].currentValue &&
      changes['endElem'].currentValue
    ) {
      this.allInputsSet = true;
      this.tryDrawLine();
    }
    if (changes['edgeData']?.currentValue) {
      this.edgeData = changes['edgeData'].currentValue;
      this.handleHighlighting();
      this.setCustomOptions();
    }
  }

  /**
   * Lifecycle hook that is called after Angular has fully initialized the component's view.
   * It is called only once after the first ngAfterContentChecked.
   * Use this hook to perform any initialization logic that relies on the component's view.
   */
  ngAfterViewInit(): void {
    this.viewInitialized = true;
    setTimeout(() => {
      this.tryDrawLine();
    }, 0);
  }

  /**
   * Tries to draw the line if all inputs are set and svgElem is accessible
   */
  private tryDrawLine() {
    if (
      this.allInputsSet &&
      this.viewInitialized &&
      this.viewportElem &&
      this.startElem &&
      this.endElem
    ) {
      this.position();
    }
  }

  /**
   * The main operation for drawing the line. It requests and calculates all needed data and draws the line.
   */
  private drawLine(): void {
    const closestSides = this.calculateClosestSides();
    this.calculatedClosestSides = closestSides;
    const startPoint = this.getElemSideMidPoint('startElement', closestSides.startSide);
    const endPoint = this.getElemSideMidPoint('endElement', closestSides.endSide);
    const direction: { start: number; end: number } = { start: 0, end: 0 };
    const noPlugOffset = 0; // could be configurable
    const plugOffset: { start: number; end: number } = {
      start:
        (this.options.startPlug
          ? plugs[this.options.startPlug.plug].lineOffset || noPlugOffset
          : noPlugOffset) * (this.options.startPlug ? this.options.startPlug.scale || 1 : 1),
      end:
        (this.options.endPlug
          ? plugs[this.options.endPlug.plug].lineOffset || noPlugOffset
          : noPlugOffset) * (this.options.endPlug ? this.options.endPlug.scale || 1 : 1),
    };
    let line: SVGElement;

    // point offset
    if (this.options.startDirectionOffset) {
      startPoint.x +=
        closestSides.startSide === Side.TOP || closestSides.startSide === Side.BOTTOM
          ? this.options.startDirectionOffset
          : 0;
      startPoint.y +=
        closestSides.startSide === Side.LEFT || closestSides.startSide === Side.RIGHT
          ? this.options.startDirectionOffset
          : 0;
    }
    if (this.options.endDirectionOffset) {
      endPoint.x +=
        closestSides.endSide === Side.TOP || closestSides.endSide === Side.BOTTOM
          ? this.options.endDirectionOffset
          : 0;
      endPoint.y +=
        closestSides.endSide === Side.LEFT || closestSides.endSide === Side.RIGHT
          ? this.options.endDirectionOffset
          : 0;
    }
    let midLabelPos = {
      x: startPoint.x + (endPoint.x - startPoint.x) / 2,
      y: startPoint.y + (endPoint.y - startPoint.y) / 2,
    };

    // lineType: direct
    if (!this.options.lineType || this.options.lineType === 'direct') {
      direction.start =
        (Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x) * 180) / Math.PI;
      direction.end = direction.start + 180;
      const lineCalc = this.setupDirect(startPoint, endPoint, plugOffset);
      line = lineCalc.line;
      midLabelPos = lineCalc.textPoint;

      // lineType: manhattan
    } else if (this.options.lineType === 'manhattan') {
      direction.start =
        closestSides.startSide === Side.RIGHT
          ? 0
          : closestSides.startSide === Side.LEFT
            ? 180
            : closestSides.startSide === Side.TOP
              ? 270
              : 90;
      direction.end =
        closestSides.endSide === Side.RIGHT
          ? 0
          : closestSides.endSide === Side.LEFT
            ? 180
            : closestSides.endSide === Side.TOP
              ? 270
              : 90;
      const lineCalc = this.setupManhattan(startPoint, endPoint, closestSides, plugOffset);
      line = lineCalc.line;
      midLabelPos = lineCalc.textPoint;

      // other to be implemented
    } else {
      throw new Error('lineType not supported!');
    }

    this.renderer.setAttribute(
      line,
      'style',
      `stroke:${this.options.lineColor || 'black'}; stroke-width: ${this.options.size || '5'}; ${this.options.dash ? `stroke-dasharray: ${this.options.dash.len} ${this.options.dash.gap};` : ''} fill: none; stroke-linecap: ${!this.options.lineType || this.options.lineType === 'direct' ? 'round' : 'round'};`,
    );
    this.renderer.addClass(line, 'line');

    // prepare plugs
    let startPlug: SVGElement | undefined = undefined;
    let endPlug: SVGElement | undefined = undefined;
    if (this.options.startPlug) {
      startPlug = this.drawPlug(this.options.startPlug, startPoint, direction.start);
    }
    if (this.options.endPlug) {
      endPlug = this.drawPlug(this.options.endPlug, endPoint, direction.end);
    }

    // prepare text
    let startLabel: SVGElement | undefined = undefined;
    let middleLabel: SVGElement | undefined = undefined;
    let endLabel: SVGElement | undefined = undefined;
    if (this.options.startLabel) {
      startLabel = this.drawText(this.options.startLabel, startPoint, closestSides.startSide);
    }
    if (this.options.middleLabel) {
      middleLabel = this.drawText(this.options.middleLabel, midLabelPos, Side.NONE);
    }
    if (this.options.endLabel) {
      endLabel = this.drawText(this.options.endLabel, endPoint, closestSides.endSide);
    }

    // prepare lineGrabPoints
    if (this.options.draggableStart || this.options.draggableEnd) {
      if (this.options.draggableStart) {
        this.grabStart.update();
      }
      if (this.options.draggableEnd) {
        this.grabEnd.update();
      }
    }

    //create group for the line and its plugs
    const lineGroup = this.renderer.createElement('g', 'svg');
    this.renderer.addClass(lineGroup, 'lineGroup');
    this.renderer.appendChild(lineGroup, line);
    if (startPlug) {
      this.renderer.appendChild(lineGroup, startPlug);
    }
    if (endPlug) {
      this.renderer.appendChild(lineGroup, endPlug);
    }

    //create group for the labels
    const labelGroup = this.renderer.createElement('g', 'svg');
    if (startLabel) {
      // if the startLabel is 'deleted', we want to highlight the startLabel
      if (this.highlightedElements.missingLabel?.startLabel) {
        this.renderer.setAttribute(startLabel, 'style', 'opacity: 0.4');
      }
      this.renderer.appendChild(labelGroup, startLabel);
    }
    if (middleLabel) {
      // if the middleLabel is 'deleted', we want to highlight the middleLabel
      if (this.highlightedElements.missingLabel?.middleLabel) {
        this.renderer.setAttribute(middleLabel, 'style', 'opacity: 0.4');
      }
      this.renderer.appendChild(labelGroup, middleLabel);
    }
    if (endLabel) {
      // if the endLabel is 'deleted', we want to highlight the endLabel
      if (this.highlightedElements.missingLabel?.endLabel) {
        this.renderer.setAttribute(endLabel, 'style', 'opacity: 0.4');
      }
      this.renderer.appendChild(labelGroup, endLabel);
    }

    // eventListeners, but only if the edge is not in highlight mode and the interactions are not disabled
    let clickableLine: any = undefined;
    if (this.edgeData && !this.edgeData.highlighted && !this.interactionsDisabled) {
      // create a clickable line with a bigger stroke-width for easier clicking
      clickableLine = line.cloneNode(true) as SVGElement;
      this.renderer.setAttribute(
        clickableLine,
        'style',
        'stroke: transparent; stroke-width: 30; fill: none',
      );
      this.renderer.addClass(clickableLine, 'clickable');

      this.renderer.listen(clickableLine, 'click', event => {
        this.edgeClicked.emit();
      });
      this.renderer.listen(clickableLine, 'mouseover', event => {
        if (lineGroup) {
          lineGroup.style.filter = 'drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.7))';
        }
        this.grabStart?.setVisible(true);
        this.grabEnd?.setVisible(true);
      });
      this.renderer.listen(clickableLine, 'mouseout', event => {
        if (lineGroup) {
          lineGroup.style.filter = '';
        }
        this.grabStart?.setVisible(false);
        this.grabEnd?.setVisible(false);
      });
    }

    // highlight the line, if it should be highlighted
    if (this.highlightedElements.line) {
      lineGroup.style.filter = 'drop-shadow(0px 0px 3px yellow)'; //currently yellow, orange: rgba(255, 165, 0, 1)
    }
    if (this.highlightedElements.missing) {
      lineGroup.style.opacity = '0.1';
      labelGroup.style.opacity = '0.1';
    }

    // append elements to the svg
    this.renderer.appendChild(this.svgElem.nativeElement, lineGroup);
    if (clickableLine) {
      this.renderer.appendChild(this.svgElem.nativeElement, clickableLine);
    }
    if (labelGroup.children.length > 0) {
      this.renderer.appendChild(this.svgElem.nativeElement, labelGroup);
    }
  }

  /**
   * Prepares a text svg element by the given data
   * @param pTextData
   * @param pos
   * @param side
   * @param highlight
   * @returns the text svg element
   */
  private drawText(
    pTextData: TextLabel,
    pos: { x: number; y: number },
    side: Side,
    highlight: boolean = false,
  ): SVGElement | undefined {
    const textData = {
      text: pTextData.text,
      font: pTextData.font || 'Arial',
      size: pTextData.size || 16,
      offset: {
        x: pTextData.offset?.x || 10,
        y: pTextData.offset?.y || 20,
      },
      color: pTextData.color || 'black',
      outline: pTextData.outline || 3,
      outlineColor: pTextData.outlineColor || 'white',
    };

    const textX = (
      (side === Side.LEFT ? -textData.offset.x : side === Side.RIGHT ? textData.offset.x : 0) +
      pos.x
    ).toString();
    const textY = (
      (side === Side.TOP
        ? -3 * textData.offset.x
        : side === Side.BOTTOM
          ? 3 * textData.offset.x
          : 0) +
      (side === Side.LEFT || side === Side.RIGHT || side === Side.NONE ? -textData.offset.y : 0) +
      pos.y
    ).toString();
    const textAnchor = side === Side.RIGHT ? 'start' : side === Side.LEFT ? 'end' : 'middle';

    const textGroup = this.renderer.createElement('g', 'svg');

    // the text outline
    const textStroke = this.renderer.createElement('text', 'svg');
    this.renderer.setAttribute(textStroke, 'x', textX);
    this.renderer.setAttribute(textStroke, 'y', textY);
    this.renderer.setAttribute(textStroke, 'text-anchor', textAnchor);
    this.renderer.setAttribute(textStroke, 'alignment-baseline', 'middle');
    this.renderer.setAttribute(textStroke, 'dominant-baseline', 'middle');
    this.renderer.setAttribute(textStroke, 'fill', textData.outlineColor);
    this.renderer.setAttribute(textStroke, 'font-family', textData.font);
    this.renderer.setAttribute(textStroke, 'font-size', textData.size.toString());
    this.renderer.setAttribute(textStroke, 'stroke', highlight ? 'orange' : textData.outlineColor);
    this.renderer.setAttribute(textStroke, 'stroke-width', textData.outline.toString());

    // the text fill
    const textFill = this.renderer.createElement('text', 'svg');
    this.renderer.setAttribute(textFill, 'x', textX);
    this.renderer.setAttribute(textFill, 'y', textY);
    this.renderer.setAttribute(textFill, 'text-anchor', textAnchor);
    this.renderer.setAttribute(textFill, 'alignment-baseline', 'middle');
    this.renderer.setAttribute(textFill, 'dominant-baseline', 'middle');
    this.renderer.setAttribute(textFill, 'fill', textData.color);
    this.renderer.setAttribute(textFill, 'font-family', textData.font);
    this.renderer.setAttribute(textFill, 'font-size', textData.size.toString());

    textStroke.textContent = textData.text;
    textFill.textContent = textData.text;

    this.renderer.appendChild(textGroup, textStroke);
    this.renderer.appendChild(textGroup, textFill);

    return textGroup;
  }

  /**
   * Calculates a plug svg by the given data
   * @param plugOptions
   * @param pos
   * @param rotation
   * @returns the plug svg element
   */
  private drawPlug(
    plugOptions: PlugOptions,
    pos: { x: number; y: number },
    rotation: number,
  ): SVGElement | undefined {
    // check if plug is in the enum
    if (Object.values(availablePlugs).includes(plugOptions.plug)) {
      const plugKey: Plug = plugs[plugOptions.plug];
      const plug = this.renderer.createElement('svg', 'svg') as SVGElement;
      this.renderer.setAttribute(
        plug,
        'x',
        (pos.x - (plugKey.width * (plugOptions.scale || 1)) / 2).toString(),
      );
      this.renderer.setAttribute(
        plug,
        'y',
        (pos.y - (plugKey.height * (plugOptions.scale || 1)) / 2).toString(),
      );
      this.renderer.setAttribute(
        plug,
        'width',
        (plugKey.width * (plugOptions.scale || 1)).toString(),
      );
      this.renderer.setAttribute(
        plug,
        'height',
        (plugKey.height * (plugOptions.scale || 1)).toString(),
      );
      this.renderer.setAttribute(plug, 'viewBox', plugKey.viewBox);

      if (plugKey.polygon) {
        const polyGroup = this.renderer.createElement('g', 'svg');
        this.renderer.setAttribute(
          polyGroup,
          'style',
          `transform-origin: center; transform: rotate(${rotation}deg);`,
        ); // rotate around the center of the plug'

        const polyStroke = this.renderer.createElement('polygon', 'svg');
        this.renderer.setAttribute(polyStroke, 'points', plugKey.polygon ?? '');
        this.renderer.setAttribute(
          polyStroke,
          'style',
          `fill: ${!plugKey.scaleOrigin ? plugOptions.outlineColor || plugOptions.color || 'black' : plugOptions.outlineColor || plugOptions.color || 'black'};`,
        );
        this.renderer.appendChild(polyGroup, polyStroke);

        if (plugKey.scaleOrigin && plugOptions.outline) {
          const polyBase = this.renderer.createElement('polygon', 'svg');
          this.renderer.setAttribute(polyBase, 'points', plugKey.polygon ?? '');
          this.renderer.setAttribute(
            polyBase,
            'style',
            `fill: ${plugOptions.color || 'white'}; transform-origin: ${plugKey.scaleOrigin}; transform: scale(${plugOptions.outline});`,
          );
          this.renderer.appendChild(polyGroup, polyBase);
        }

        this.renderer.appendChild(plug, polyGroup);
      }

      if (plugKey.path) {
        // TODO: Interpretation for path plugs... Not needed for now
      }
      this.renderer.addClass(plug, 'plug');
      return plug;
    }
    return undefined;
  }

  /**
   * Calculates a direct line between the start and end element
   * @param closestSides
   * @param lineOffset
   * @returns a line element with the direct line and the textPoint for the middle label
   */
  private setupDirect(
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    lineOffset: { start: number; end: number },
  ): { line: SVGElement; textPoint: { x: number; y: number } } {
    const direction =
      (Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x) * 180) / Math.PI;
    // new start and end point by moving the points by the lineOffset
    startPoint = {
      x: startPoint.x + Math.cos((direction * Math.PI) / 180) * lineOffset.start,
      y: startPoint.y + Math.sin((direction * Math.PI) / 180) * lineOffset.start,
    };
    endPoint = {
      x: endPoint.x - Math.cos((direction * Math.PI) / 180) * lineOffset.end,
      y: endPoint.y - Math.sin((direction * Math.PI) / 180) * lineOffset.end,
    };
    const textPoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2,
    };

    const line = this.renderer.createElement('line', 'svg');
    this.renderer.setAttribute(line, 'x1', startPoint.x.toString());
    this.renderer.setAttribute(line, 'y1', startPoint.y.toString());
    this.renderer.setAttribute(line, 'x2', endPoint.x.toString());
    this.renderer.setAttribute(line, 'y2', endPoint.y.toString());

    return { line: line, textPoint: textPoint };
  }

  /**
   * Calculates a manhattan line between the start and end element
   * @param closestSides
   * @param lineOffset
   * @returns a path element with the manhattan line and the textPoint for the middle label
   */
  private setupManhattan(
    pStartPoint: { x: number; y: number },
    pEndPoint: { x: number; y: number },
    closestSides: { startSide: Side; endSide: Side },
    lineOffset: { start: number; end: number },
  ): { line: SVGElement; textPoint: { x: number; y: number } } {
    const startPoint = { ...pStartPoint };
    const endPoint = { ...pEndPoint };
    // new start and end point by moving the points by the lineOffset
    startPoint.x +=
      closestSides.startSide === Side.RIGHT
        ? lineOffset.start
        : closestSides.startSide === Side.LEFT
          ? -lineOffset.start
          : 0;
    startPoint.y +=
      closestSides.startSide === Side.TOP
        ? -lineOffset.start
        : closestSides.startSide === Side.BOTTOM
          ? lineOffset.start
          : 0;
    endPoint.x +=
      closestSides.endSide === Side.RIGHT
        ? lineOffset.end
        : closestSides.endSide === Side.LEFT
          ? -lineOffset.end
          : 0;
    endPoint.y +=
      closestSides.endSide === Side.TOP
        ? -lineOffset.end
        : closestSides.endSide === Side.BOTTOM
          ? lineOffset.end
          : 0;

    const line = this.renderer.createElement('path', 'svg');
    const isParallelSides: boolean =
      ((closestSides.startSide === Side.RIGHT || closestSides.startSide === Side.LEFT) &&
        (closestSides.endSide === Side.LEFT || closestSides.endSide === Side.RIGHT)) ||
      ((closestSides.startSide === Side.TOP || closestSides.startSide === Side.BOTTOM) &&
        (closestSides.endSide === Side.BOTTOM || closestSides.endSide === Side.TOP));

    // the lines need space for the plugs before manhattan lines can be drawn
    const minimumDistance: number = 10; // TODO: make this configurable
    const additionalDistance: number = this.startElem == this.endElem ? 30 : 0; // TODO: make this configurable

    const distanceStart =
      (lineOffset.start == 0 ? minimumDistance : lineOffset.start * 1.5) + additionalDistance; // TODO: make this configurable
    const distanceEnd =
      (lineOffset.end == 0 ? minimumDistance : lineOffset.end * 1.5) + additionalDistance; // TODO: make this configurable
    const pathStartPlugMarginPoint =
      closestSides.startSide === Side.RIGHT
        ? {
            x: startPoint.x + distanceStart,
            y: startPoint.y,
          }
        : closestSides.startSide === Side.LEFT
          ? {
              x: startPoint.x - distanceStart,
              y: startPoint.y,
            }
          : closestSides.startSide === Side.TOP
            ? {
                x: startPoint.x,
                y: startPoint.y - distanceStart,
              }
            : {
                x: startPoint.x,
                y: startPoint.y + distanceStart,
              };
    const pathEndPlugMarginPoint =
      closestSides.endSide === Side.RIGHT
        ? {
            x: endPoint.x + distanceEnd,
            y: endPoint.y,
          }
        : closestSides.endSide === Side.LEFT
          ? {
              x: endPoint.x - distanceEnd,
              y: endPoint.y,
            }
          : closestSides.endSide === Side.TOP
            ? {
                x: endPoint.x,
                y: endPoint.y - distanceEnd,
              }
            : {
                x: endPoint.x,
                y: endPoint.y + distanceEnd,
              };

    let textPoint = {
      x: pathStartPlugMarginPoint.x + (pathEndPlugMarginPoint.x - pathStartPlugMarginPoint.x) / 2,
      y: pathStartPlugMarginPoint.y + (pathEndPlugMarginPoint.y - pathStartPlugMarginPoint.y) / 2,
    };

    // Calculate the relative pathStartPlugMarginPoint raduis and normalize [0, 360]
    let startDirection = Math.atan2(
      pathEndPlugMarginPoint.y - pathStartPlugMarginPoint.y,
      pathEndPlugMarginPoint.x - pathStartPlugMarginPoint.x,
    );
    startDirection = (startDirection * 180) / Math.PI;
    if (closestSides.startSide === Side.TOP) {
      startDirection -= 180;
    } else if (closestSides.startSide === Side.RIGHT) {
      startDirection -= 270;
    } else if (closestSides.startSide === Side.BOTTOM) {
      startDirection -= 0;
    } else if (closestSides.startSide === Side.LEFT) {
      startDirection -= 90;
    }
    startDirection = ((startDirection % 360) + 360) % 360;

    // Calculate the relative pathEndPlugMarginPoint raduis and normalize [0, 360]
    let endDirection = Math.atan2(
      pathStartPlugMarginPoint.y - pathEndPlugMarginPoint.y,
      pathStartPlugMarginPoint.x - pathEndPlugMarginPoint.x,
    );
    endDirection = (endDirection * 180) / Math.PI;
    if (closestSides.endSide === Side.TOP) {
      endDirection -= 180;
    } else if (closestSides.endSide === Side.RIGHT) {
      endDirection -= 270;
    } else if (closestSides.endSide === Side.BOTTOM) {
      endDirection -= 0;
    } else if (closestSides.endSide === Side.LEFT) {
      endDirection -= 90;
    }
    endDirection = ((endDirection % 360) + 360) % 360;

    let midCornerPointStart;
    let midCornerPointEnd = pathEndPlugMarginPoint;

    // different cases based on the parallelity
    if (isParallelSides) {
      if (closestSides.startSide === Side.RIGHT || closestSides.startSide === Side.LEFT) {
        if (startDirection <= 180) {
          midCornerPointStart = {
            x:
              pathStartPlugMarginPoint.x +
              (pathEndPlugMarginPoint.x - pathStartPlugMarginPoint.x) / 2,
            y: pathStartPlugMarginPoint.y,
          };
        } else {
          //maybe later some 'around the element' logic, but then we need more mid points
          midCornerPointStart =
            endDirection <= 180
              ? {
                  x: pathStartPlugMarginPoint.x,
                  y: pathEndPlugMarginPoint.y,
                }
              : {
                  x: pathStartPlugMarginPoint.x,
                  y:
                    pathStartPlugMarginPoint.y +
                    (pathEndPlugMarginPoint.y - pathStartPlugMarginPoint.y) / 2,
                };
        }
        if (endDirection <= 180) {
          midCornerPointEnd = {
            // both directions 'outside'
            x:
              pathEndPlugMarginPoint.x -
              (pathEndPlugMarginPoint.x - pathStartPlugMarginPoint.x) / 2,
            y: pathEndPlugMarginPoint.y,
          };
        } else {
          //maybe later some 'around the element' logic, but then we need more mid points
          midCornerPointEnd =
            startDirection <= 180
              ? {
                  x: pathEndPlugMarginPoint.x,
                  y: pathStartPlugMarginPoint.y,
                }
              : {
                  // both directions 'outside'
                  x: pathEndPlugMarginPoint.x,
                  y:
                    pathEndPlugMarginPoint.y -
                    (pathEndPlugMarginPoint.y - pathStartPlugMarginPoint.y) / 2,
                };
        }
        if (startDirection <= 180 || endDirection <= 180) {
          textPoint = {
            x: (pathStartPlugMarginPoint.x + pathEndPlugMarginPoint.x) / 2,
            y:
              midCornerPointStart.y < midCornerPointEnd.y
                ? midCornerPointStart.y
                : midCornerPointEnd.y,
          };
        }
      } else {
        if (startDirection <= 180) {
          midCornerPointStart = {
            x: pathStartPlugMarginPoint.x,
            y:
              pathStartPlugMarginPoint.y +
              (pathEndPlugMarginPoint.y - pathStartPlugMarginPoint.y) / 2,
          };
        } else {
          //maybe later some 'around the element' logic, but then we need more mid points
          midCornerPointStart =
            endDirection <= 180
              ? {
                  x: pathEndPlugMarginPoint.x,
                  y: pathStartPlugMarginPoint.y,
                }
              : {
                  x:
                    pathStartPlugMarginPoint.x +
                    (pathEndPlugMarginPoint.x - pathStartPlugMarginPoint.x) / 2,
                  y: pathStartPlugMarginPoint.y,
                };
        }
        if (endDirection <= 180) {
          midCornerPointEnd = {
            // both directions 'outside'
            x: pathEndPlugMarginPoint.x,
            y:
              pathEndPlugMarginPoint.y -
              (pathEndPlugMarginPoint.y - pathStartPlugMarginPoint.y) / 2,
          };
        } else {
          //maybe later some 'around the element' logic, but then we need more mid points
          midCornerPointEnd =
            startDirection <= 180
              ? {
                  x: pathStartPlugMarginPoint.x,
                  y: pathEndPlugMarginPoint.y,
                }
              : {
                  // both directions 'outside'
                  x:
                    pathStartPlugMarginPoint.x +
                    (pathEndPlugMarginPoint.x - pathStartPlugMarginPoint.x) / 2,
                  y: pathEndPlugMarginPoint.y,
                };
        }
        if (startDirection <= 180 || endDirection <= 180) {
          textPoint = {
            x: (pathStartPlugMarginPoint.x + pathEndPlugMarginPoint.x) / 2,
            y: startDirection > 180 ? midCornerPointStart.y : midCornerPointEnd.y,
          };
        }
      }
      // if not parallel, most cases are 'edges'
    } else {
      if (closestSides.startSide === Side.RIGHT || closestSides.startSide === Side.LEFT) {
        if (startDirection <= 180) {
          midCornerPointStart =
            endDirection <= 180
              ? {
                  x: pathEndPlugMarginPoint.x,
                  y: pathStartPlugMarginPoint.y,
                }
              : {
                  x: pathStartPlugMarginPoint.x,
                  y: pathEndPlugMarginPoint.y,
                };
          textPoint = {
            x: (pathStartPlugMarginPoint.x + pathEndPlugMarginPoint.x) / 2,
            y: midCornerPointStart.y,
          };
        } else {
          midCornerPointStart =
            endDirection <= 180
              ? pathStartPlugMarginPoint
              : {
                  x: pathStartPlugMarginPoint.x,
                  y: pathEndPlugMarginPoint.y,
                };
          midCornerPointEnd =
            endDirection <= 180
              ? {
                  x: pathStartPlugMarginPoint.x,
                  y: pathEndPlugMarginPoint.y,
                }
              : pathEndPlugMarginPoint;
          textPoint =
            endDirection <= 180
              ? midCornerPointEnd
              : {
                  x: (pathStartPlugMarginPoint.x + pathEndPlugMarginPoint.x) / 2,
                  y: midCornerPointStart.y,
                };
        }
      } else {
        if (startDirection <= 180) {
          midCornerPointStart =
            endDirection <= 180
              ? {
                  x: pathStartPlugMarginPoint.x,
                  y: pathEndPlugMarginPoint.y,
                }
              : {
                  x: pathEndPlugMarginPoint.x,
                  y: pathStartPlugMarginPoint.y,
                };
          textPoint = {
            x: (pathStartPlugMarginPoint.x + pathEndPlugMarginPoint.x) / 2,
            y: midCornerPointStart.y,
          };
        } else {
          midCornerPointStart =
            endDirection <= 180
              ? pathStartPlugMarginPoint
              : {
                  x: pathEndPlugMarginPoint.x,
                  y: pathStartPlugMarginPoint.y,
                };
          midCornerPointEnd =
            endDirection <= 180
              ? {
                  x: pathEndPlugMarginPoint.x,
                  y: pathStartPlugMarginPoint.y,
                }
              : pathEndPlugMarginPoint;
          textPoint = {
            x: (pathStartPlugMarginPoint.x + pathEndPlugMarginPoint.x) / 2,
            y: midCornerPointStart.y,
          };
        }
      }
    }

    const pathStart = `M ${startPoint.x} ${startPoint.y} L ${pathStartPlugMarginPoint.x} ${pathStartPlugMarginPoint.y} `;
    const pathMid = `L ${midCornerPointStart.x} ${midCornerPointStart.y} L ${midCornerPointEnd.x} ${midCornerPointEnd.y} `;
    const pathEnd = `L ${pathEndPlugMarginPoint.x} ${pathEndPlugMarginPoint.y} L ${endPoint.x} ${endPoint.y}`;

    const path = pathStart + pathMid + pathEnd;
    this.renderer.setAttribute(line, 'd', path);

    //return line;
    return { line: line, textPoint: textPoint };
  }

  /**
   * Pretenting that the given start and end elements are rectangles, this function calculates the closest sides of the start and end element to each other
   * @returns the closest sides of the start and end element
   */
  private calculateClosestSides(): { startSide: Side; endSide: Side } {
    if (!this.startElem || !this.endElem || !this.viewportElem) {
      throw new Error('startElem, endElem or viewportElem is undefined!');
    }
    if (this.options.startDirection && this.options.endDirection) {
      return { startSide: this.options.startDirection, endSide: this.options.endDirection };
    }
    if (this.startElem === this.endElem) {
      if (!this.options.startDirection) {
        this.options.startDirection = Side.LEFT;
        this.options.startDirectionOffset = 50;
      }
      if (!this.options.endDirection) {
        this.options.endDirection = Side.BOTTOM;
        this.options.endDirectionOffset = -20;
      }
      const updatedData = {
        startDirection: this.options.startDirection,
        endDirection: this.options.endDirection,
        startDirectionOffset: this.options.startDirectionOffset,
        endDirectionOffset: this.options.endDirectionOffset,
      };
      this.edgeUpdated.emit(updatedData);
      return { startSide: this.options.startDirection, endSide: this.options.endDirection };
    }

    let startSide = undefined;
    let endSide = undefined;
    let startSides: Side[] = [];
    let endSides: Side[] = [];

    if (this.options.startDirection) {
      startSide = this.options.startDirection || undefined;
    }
    if (this.options.endDirection) {
      endSide = this.options.endDirection || undefined;
    }

    if (startSide) {
      startSides.push(startSide);
    } else {
      startSides = [Side.RIGHT, Side.LEFT, Side.TOP, Side.BOTTOM];
    }

    if (endSide) {
      endSides.push(endSide);
    } else {
      endSides = [Side.RIGHT, Side.LEFT, Side.TOP, Side.BOTTOM];
    }

    const startRect = this.startElemProps;
    const endRect = this.endElemProps;

    let minDistance = Number.MAX_VALUE;

    startSides.forEach(start => {
      endSides.forEach(end => {
        const startMidX =
          start === Side.LEFT
            ? startRect.x
            : start === Side.RIGHT
              ? startRect.x + startRect.width
              : startRect.x + startRect.width / 2;

        const startMidY =
          start === Side.TOP
            ? startRect.y
            : start === Side.BOTTOM
              ? startRect.y + startRect.height
              : startRect.y + startRect.height / 2;

        const endMidX =
          end === Side.LEFT
            ? endRect.x
            : end === Side.RIGHT
              ? endRect.x + endRect.width
              : endRect.x + endRect.width / 2;

        const endMidY =
          end === Side.TOP
            ? endRect.y
            : end === Side.BOTTOM
              ? endRect.y + endRect.height
              : endRect.y + endRect.height / 2;

        const distance = Math.sqrt((endMidX - startMidX) ** 2 + (endMidY - startMidY) ** 2);

        if (distance < minDistance) {
          minDistance = distance;
          startSide = start;
          endSide = end;
        }
      });
    });

    return { startSide: startSide, endSide: endSide };
  }

  /**
   * Returns the mid point of the given element and side
   * @param elem
   * @param side
   * @returns position data of the mid point
   */
  private getElemSideMidPoint(
    elem: 'startElement' | 'endElement',
    side: Side,
  ): { x: number; y: number } {
    const rect = elem === 'startElement' ? this.startElemProps : this.endElemProps;
    const x =
      side === Side.LEFT
        ? rect.x
        : side === Side.RIGHT
          ? rect.x + rect.width
          : rect.x + rect.width / 2;

    const y =
      side === Side.TOP
        ? rect.y
        : side === Side.BOTTOM
          ? rect.y + rect.height
          : rect.y + rect.height / 2;

    return { x, y };
  }

  /**
   * Sets the custom options for the line, especially the labels. Retrieving the data from the edgeData input
   */
  private setCustomOptions(): void {
    if (this.edgeData) {
      this.options = {
        ...umlLineOptions[this.edgeData?.type || EditorElement.CD_ASSOCIATION].normal,
      };
    }
    // base settings, maybe changeable in the future
    this.options.lineType = 'manhattan';
    if (this.draggable) {
      this.options.draggableStart = true;
      this.options.draggableEnd = true;
      this.options.startDirectionOffset = 0;
      this.options.endDirectionOffset = 0;
    }
    //---
    this.options.startDirection = this.edgeData?.startDirection;
    this.options.endDirection = this.edgeData?.endDirection;
    this.options.startDirectionOffset = this.edgeData?.startDirectionOffset;
    this.options.endDirectionOffset = this.edgeData?.endDirectionOffset;

    this.options.startLabel = {
      text:
        this.highlightedElements.missingLabel?.startLabel || this.edgeData?.cardinalityStart || '',
      size: 16,
      offset: { x: 10, y: 20 },
      color: 'black',
      outline: 3,
      outlineColor: this.highlightedElements.startLabel ? 'yellow' : 'white',
    };
    this.options.middleLabel = {
      text: this.highlightedElements.missingLabel?.middleLabel || this.edgeData?.description || '',
      size: 16,
      offset: { x: 0, y: 20 },
      color: 'black',
      outline: 3,
      outlineColor: this.highlightedElements.middleLabel ? 'yellow' : 'white',
    };
    this.options.endLabel = {
      text: this.highlightedElements.missingLabel?.endLabel || this.edgeData?.cardinalityEnd || '',
      size: 16,
      offset: { x: 10, y: 20 },
      color: 'black',
      outline: 3,
      outlineColor: this.highlightedElements.endLabel ? 'yellow' : 'white',
    };
  }

  /**
   * Sets the drag point options for the line
   * @param point
   * @param side
   * @param offset
   */
  setDragPointOptions(point: 'start' | 'end', side: Side, offset: number): void {
    //get the viewPortElem transform scale value
    const viewPortTransform = this.viewportElem?.style.transform;
    const scale = viewPortTransform ? parseFloat(viewPortTransform.split('(')[1].split(',')[0]) : 1;
    offset = offset / scale;

    if (point === 'start') {
      this.options.startDirection = side === Side.NONE ? undefined : side;
      this.options.startDirectionOffset = offset;
    } else {
      this.options.endDirection = side === Side.NONE ? undefined : side;
      this.options.endDirectionOffset = offset;
    }
    const updateData = {
      startDirection: this.options.startDirection,
      endDirection: this.options.endDirection,
      startDirectionOffset: this.options.startDirectionOffset,
      endDirectionOffset: this.options.endDirectionOffset,
    };
    this.edgeUpdated.emit(updateData);

    this.position();
  }

  /**
   * Handles the highlighting of the line elements, based on the highlighted data of the edgeData input
   */
  private handleHighlighting(): void {
    if (this.edgeData?.highlighted) {
      this.highlightedElements.line =
        this.edgeData.highlighted.code == 'not_found' ||
        this.edgeData.highlighted.updated?.type ||
        this.edgeData.highlighted.updated?.start ||
        this.edgeData.highlighted.updated?.start
          ? true
          : false;
      this.highlightedElements.startLabel =
        this.edgeData.highlighted.code == 'not_found' ||
        this.edgeData.highlighted.updated?.cardinalityStart ||
        this.edgeData.highlighted.added?.cardinalityStart
          ? true
          : false;
      this.highlightedElements.middleLabel =
        this.edgeData.highlighted.code == 'not_found' ||
        this.edgeData.highlighted.updated?.description ||
        this.edgeData.highlighted.added?.description
          ? true
          : false;
      this.highlightedElements.endLabel =
        this.edgeData.highlighted.code == 'not_found' ||
        this.edgeData.highlighted.updated?.cardinalityEnd ||
        this.edgeData.highlighted.added?.cardinalityEnd
          ? true
          : false;
      this.highlightedElements.missing = this.edgeData.highlighted.code == 'missing' ? true : false;

      this.highlightedElements.missingLabel = {
        startLabel: this.edgeData.highlighted.deleted?.cardinalityStart
          ? this.edgeData.highlighted.deleted.cardinalityStart
          : '',
        middleLabel: this.edgeData.highlighted.deleted?.description
          ? this.edgeData.highlighted.deleted.description
          : '',
        endLabel: this.edgeData.highlighted.deleted?.cardinalityEnd
          ? this.edgeData.highlighted.deleted.cardinalityEnd
          : '',
      };
    }
  }

  /**
   * Calculates the position of the line elements
   */
  position(): void {
    if (this.startElem && this.endElem && this.viewportElem) {
      // if start element is a string, try to get the element by id
      if (typeof this.startElem === 'string') {
        this.startElem = document.getElementById(this.startElem) || undefined;
      }
      // if end element is a string, try to get the element by id
      if (typeof this.endElem === 'string') {
        this.endElem = document.getElementById(this.endElem) || undefined;
      }
      if (!this.startElem || !this.endElem) {
        throw new Error('startElem or endElem is undefined!');
      }

      this.viewPortElemProps.width = this.viewportElem?.offsetWidth || 0;
      this.viewPortElemProps.height = this.viewportElem?.offsetHeight || 0;

      this.startElemProps.x = this.startElem?.offsetLeft || 0;
      this.startElemProps.y = this.startElem?.offsetTop || 0;
      this.startElemProps.width = this.startElem?.offsetWidth || 0;
      this.startElemProps.height = this.startElem?.offsetHeight || 0;

      this.endElemProps.x = this.endElem?.offsetLeft || 0;
      this.endElemProps.y = this.endElem?.offsetTop || 0;
      this.endElemProps.width = this.endElem?.offsetWidth || 0;
      this.endElemProps.height = this.endElem?.offsetHeight || 0;

      // in case the elements are transformed, add the transform values to the position
      this.startElemProps.x += this.startElem.style.transform
        ? parseInt(this.startElem.style.transform.split('(')[1].split('px')[0])
        : 0;
      this.startElemProps.y += this.startElem.style.transform
        ? parseInt(this.startElem.style.transform.split(',')[1].split('px')[0])
        : 0;
      this.endElemProps.x += this.endElem.style.transform
        ? parseInt(this.endElem.style.transform.split('(')[1].split('px')[0])
        : 0;
      this.endElemProps.y += this.endElem.style.transform
        ? parseInt(this.endElem.style.transform.split(',')[1].split('px')[0])
        : 0;

      // Clear svg
      this.svgElem.nativeElement.innerHTML = '';
      this.drawLine();
    }
  }

  /**
   * Refreshes the line
   */
  refresh(): void {
    this.setCustomOptions();
    this.position();
  }
}
