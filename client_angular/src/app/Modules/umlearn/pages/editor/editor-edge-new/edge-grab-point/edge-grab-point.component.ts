import { Side } from '@DTOs/index'; // Changed from @Interfaces
import { CdkDragMove } from '@angular/cdk/drag-drop';
import { SimpleChanges, OnChanges } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-edge-grab-point',
  templateUrl: './edge-grab-point.component.html',
  styleUrls: ['./edge-grab-point.component.scss'],
})
export class EdgeGrabPointComponent implements OnChanges {
  @Input() targetElem: HTMLElement | string | undefined = undefined;
  @Input() targetSide: Side | undefined = undefined;
  @Input() sideOffset: number | undefined;
  @Input() visible: boolean = true;

  @Output() onPointDrag = new EventEmitter<{ side: Side; offset: number }>();

  targetElemProps: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  position: { x: number; y: number } = { x: 0, y: 0 };
  radius: number = 0;
  isDragging: boolean = false;
  opacity: number = 0;

  /**
   * Lifecycle hook that is called when any input property changes.
   * @param changes - The changed properties.
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['targetElem'] || changes['targetSide'] || changes['sideOffset']) {
      if (typeof this.targetElem === 'string') {
        this.targetElem = document.getElementById(this.targetElem) || undefined;
      }
      if (this.targetElem && this.targetSide) {
        this.updateTargetPosition();
        this.updatePosition(this.targetSide, this.sideOffset || 0);
      }
    }
  }

  /**
   * Sets the visibility of the edge grab point.
   * @param visibility - The visibility flag.
   */
  setVisible(visibility: boolean) {
    if (!this.isDragging) {
      this.opacity = visibility ? 0.5 : 0;
    }
  }

  /**
   * Handles the click event on the edge grab point.
   */
  onClick() {
    if (this.isDragging) {
      this.isDragging = false;
      this.opacity = 0;
      return;
    }
    this.onPointDrag.emit({ side: Side.NONE, offset: 0 });
  }

  /**
   * Handles the drag ended event on the edge grab point.
   */
  onDragEnded() {
    setTimeout(() => {
      this.isDragging = false;
      this.opacity = 0;
    }, 0);
  }

  /**
   * Updates the edge grab point.
   */
  update() {
    this.updateTargetPosition();
    if (this.targetElem && this.targetSide) {
      this.updatePosition(this.targetSide, this.sideOffset || 0);
    }
  }

  /**
   * Updates the position of the target element.
   */
  private updateTargetPosition() {
    if (typeof this.targetElem === 'string') return;

    this.targetElemProps.x = this.targetElem?.offsetLeft || 0;
    this.targetElemProps.y = this.targetElem?.offsetTop || 0;
    this.targetElemProps.width = this.targetElem?.offsetWidth || 0;
    this.targetElemProps.height = this.targetElem?.offsetHeight || 0;
    //if it has a transform, add it to the position
    this.targetElemProps.x += this.targetElem!.style.transform
      ? parseInt(this.targetElem!.style.transform.split('(')[1].split('px')[0])
      : 0;
    this.targetElemProps.y += this.targetElem!.style.transform
      ? parseInt(this.targetElem!.style.transform.split(',')[1].split('px')[0])
      : 0;
  }

  /**
   * Updates the position of the edge grab point.
   * @param side - The target side.
   * @param sideOffset - The side offset.
   */
  private updatePosition(side: Side, sideOffset: number) {
    switch (side) {
      case Side.TOP:
        this.position.x =
          this.targetElemProps.x + this.targetElemProps.width / 2 + sideOffset - this.radius;
        this.position.y = this.targetElemProps.y - this.radius * 2;
        break;
      case Side.BOTTOM:
        this.position.x =
          this.targetElemProps.x + this.targetElemProps.width / 2 + sideOffset - this.radius;
        this.position.y = this.targetElemProps.y + this.targetElemProps.height - this.radius * 2;
        break;
      case Side.LEFT:
        this.position.x = this.targetElemProps.x - this.radius;
        this.position.y =
          this.targetElemProps.y + this.targetElemProps.height / 2 + sideOffset - this.radius * 2;
        break;
      case Side.RIGHT:
        this.position.x = this.targetElemProps.x + this.targetElemProps.width - this.radius;
        this.position.y =
          this.targetElemProps.y + this.targetElemProps.height / 2 + sideOffset - this.radius * 2;
        break;
    }
  }

  /**
   * Calculates the offset of the edge grab point during drag.
   * @param event - The drag move event.
   * @param draggable - The draggable element.
   * @returns The calculated offset.
   */
  calculateOffset(event: CdkDragMove, draggable: HTMLElement): { side: Side; offset: number } {
    if (!this.targetElem || typeof this.targetElem == 'string')
      return { side: this.targetSide || Side.NONE, offset: 0 };

    const targetElemProps = this.targetElem.getBoundingClientRect();
    const mousePosition = event.pointerPosition;
    const centerX = targetElemProps.left + targetElemProps.width / 2;
    const centerY = targetElemProps.top + targetElemProps.height / 2;
    const relativeX = mousePosition.x - centerX;
    const relativeY = mousePosition.y - centerY;

    // closest side of targetElem
    let closestSide: Side;
    if (Math.abs(relativeX) > Math.abs(relativeY)) {
      closestSide = relativeX > 0 ? Side.RIGHT : Side.LEFT;
    } else {
      closestSide = relativeY > 0 ? Side.BOTTOM : Side.TOP;
    }

    // new x and y position of draggable, based on closest side of targetElem, so that the draggable is always on the side of the targetElem
    let newOffset;
    if (closestSide == Side.TOP || closestSide == Side.BOTTOM) {
      newOffset =
        (mousePosition.x > targetElemProps.left + targetElemProps.width / 2
          ? Math.min(mousePosition.x, targetElemProps.left + targetElemProps.width)
          : Math.max(mousePosition.x, targetElemProps.left)) -
        (targetElemProps.left + targetElemProps.width / 2);
    } else {
      newOffset =
        (mousePosition.y > targetElemProps.top + targetElemProps.height / 2
          ? Math.min(mousePosition.y, targetElemProps.top + targetElemProps.height)
          : Math.max(mousePosition.y, targetElemProps.top)) -
        (targetElemProps.top + targetElemProps.height / 2);
    }

    draggable.style.transform = 'none';

    //this.updatePosition(closestSide, newOffset);
    this.onPointDrag.emit({ side: closestSide, offset: newOffset });

    return { side: closestSide, offset: newOffset };
  }
}
