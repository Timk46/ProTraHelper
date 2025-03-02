import { Component, ElementRef, HostListener, Input } from '@angular/core';

@Component({
  selector: 'app-tooltipp',
  templateUrl: './tooltipp.component.html',
  styleUrls: ['./tooltipp.component.scss']
})
/**
 * Represents a tooltip component.
 */
export class TooltippComponent {

  @Input() isVisible: boolean = true; 
  @Input() tooltipContent: string | undefined;

  

  visible = false;
  top: string = '0px';
  left: string = '0px';

  constructor(private elementRef: ElementRef) { }

  /**
   * Event listener for mouseover event.
   * @param event - The MouseEvent object.
   */
  @HostListener('document:mouseover', ['$event'])
  onMouseOver(event: MouseEvent) {
    const targetElement = event.target as HTMLElement;
    if (this.elementRef.nativeElement.contains(targetElement)) {
      this.visible = this.isVisible; 
      this.top = event.clientY +10+ 'px';
      this.left = event.clientX +10+ 'px';
    } else {
      
      this.visible = false;
    }
  }

  /**
   * Event listener for mouseout event.
   * @param event - The MouseEvent object.
   */
  @HostListener('document:mouseout', ['$event'])
  onMouseOut(event: MouseEvent) {
    this.visible = false;
  }
}


