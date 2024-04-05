import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

/**
 * A directive that allows the height of the attached element to be adjustable between 10 - 50 vh
 * through drag interactions.
 * @Directive decorator specifies the selector used to identify elements that
 * this directive applies to.
 */
@Directive({
  selector: '[appDraggableHeight]'
})
export class DraggableHeightDirective {
  /**
   * Directive's constructor, injects ElementRef and Renderer2 for DOM manipulation.
   * @param el Refers to the element this directive is applied to.
   * @param renderer Used to abstractly manipulate the render tree.
   */
  constructor(private el: ElementRef, private renderer: Renderer2) { }

  /**
   * HostListener to listen for the mousedown event to initiate drag.
   * @param event MouseEvent object, provides the clientY property for initial Y position.
   */
  @HostListener('mousedown', ['$event']) onMousedown(event: MouseEvent) {
    const startY = event.clientY;
    const startHeight = parseInt(window.getComputedStyle(this.el.nativeElement).height, 10);

    // Function to handle mouse movement
    const mouseMove = (moveEvent: MouseEvent) => {
      let newHeight = startHeight + (moveEvent.clientY - startY);
      const vh = window.innerHeight * 0.01;
      let newHeightVh = newHeight / vh;

      // Restrict new height to a range of 10vh to 50vh
      newHeightVh = Math.max(10, Math.min(newHeightVh, 50));

      this.renderer.setStyle(this.el.nativeElement, 'height', `${newHeightVh}vh`);
    };

    // Function to clean up event listeners upon mouse release
    const mouseUp = () => {
      document.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
    };

    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
  }
}
