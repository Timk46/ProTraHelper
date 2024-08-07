import { Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges } from '@angular/core';
import { NotificationDTO } from '@DTOs/notification.dto';
import { NotificationType } from '@DTOs/notificationType.enum';

/**
 * Directive to apply custom styles to notification elements based on their properties.
 * This directive dynamically changes the appearance of a notification based on its read status and type.
 */
@Directive({
  selector: '[appNotificationStyle]'
})
export class BellDirective implements OnChanges {
  /**
   * Input property to receive the notification object.
   */
  @Input() notification!: NotificationDTO;

  /**
   * Creates an instance of BellDirective.
   * @param {ElementRef} element - Reference to the host element.
   * @param {Renderer2} renderer - Renderer2 for DOM manipulation.
   */
  constructor(private element: ElementRef, private renderer: Renderer2) {}

  /**
   * Lifecycle hook that is called when any data-bound property of a directive changes.
   * It triggers the style application when the notification input changes.
   * @param {SimpleChanges} changes - SimpleChanges object containing current and previous property values.
   */
  ngOnChanges(changes: SimpleChanges) {
    if(changes['notification']) {
      this.applyStylesAndText();
    }
  }

  /**
   * Applies styles to the host element based on the notification properties.
   * This method sets background color based on read status and border color based on notification type.
   * @private
   */
  private applyStylesAndText() {
    if (!this.notification) {
      return;
    }

    // Set background color based on read status
    if (!this.notification.isRead) {
      this.renderer.setStyle(this.element.nativeElement, 'backgroundColor', '#e0f7fa');
    } else {
      this.renderer.setStyle(this.element.nativeElement, 'backgroundColor', 'white');
    }

    // Set border color based on notification type
    switch (this.notification.type) {
      case NotificationType.COMMENT:
        this.renderer.setStyle(this.element.nativeElement, 'borderLeft', '4px solid darkblue');
        break;
      case NotificationType.SOLUTION:
        this.renderer.setStyle(this.element.nativeElement, 'borderLeft', '4px solid darkgreen');
        break;
      case NotificationType.INFO:
        this.renderer.setStyle(this.element.nativeElement, 'borderLeft', '4px solid red');
        break;
    }
  }
}
