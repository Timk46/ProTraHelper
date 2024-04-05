import { Directive, ElementRef, Renderer2, OnInit } from '@angular/core';
@Directive({
  selector: '[appDraggableHeight]' // Defines the selector to be used in templates for applying this directive.
})
export class DraggableHeightDirective implements OnInit {
  private resizeHandle!: HTMLElement; // Handle for the element used to drag and resize.

  constructor(private el: ElementRef, private renderer: Renderer2) {
    // ElementRef is used to access the host element.
    // Renderer2 is used for rendering purposes which is a more secure way to manipulate the DOM.
  }

  ngOnInit() {
    // Lifecycle hook that is called after Angular has initialized all data-bound properties.
    this.resizeHandle = this.el.nativeElement.querySelector('.resize-handle');

    // Attach mousedown event listener if the resize handle is found.
    if (this.resizeHandle) {
      this.resizeHandle.addEventListener('mousedown', this.onMousedown.bind(this));
    }
  }

  onMousedown(event: MouseEvent) {
    event.preventDefault(); // Prevents any default action associated with this event.

    const startY = event.clientY; // Starting Y-coordinate of the mouse.
    const startHeight = parseInt(window.getComputedStyle(this.el.nativeElement).height, 10); // Starting height of the element.

    const mouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault(); // Prevent default action during move.
      let newHeight = startHeight + (moveEvent.clientY - startY); // Calculate new height based on mouse movement.
      const vh = window.innerHeight * 0.01; // Calculate value of 1vh based on current window height.
      let newHeightVh = newHeight / vh; // Convert new height to vh units.

      newHeightVh = Math.max(10, Math.min(newHeightVh, 50)); // Constrain the height between 10vh and 50vh.

      this.renderer.setStyle(this.el.nativeElement, 'height', `${newHeightVh}vh`); // Apply the new height.
    };

    const mouseUp = () => {
      // Cleanup: remove event listeners when resizing is complete.
      document.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
    };

    // Attach mousemove and mouseup event listeners to document.
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
  }
}
