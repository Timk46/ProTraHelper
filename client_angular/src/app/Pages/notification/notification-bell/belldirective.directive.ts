// notification-style.directive.ts
import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';
import { NotificationDTO } from '@DTOs/notification.dto';
import { NotificationType } from '@DTOs/notificationType.enum';


@Directive({
  selector: '[appNotificationStyle]'
})
export class BellDirective implements OnChanges {
  @Input() notification!: NotificationDTO;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges() {
    this.applyStylesAndText();
  }

  private applyStylesAndText() {
    if (!this.notification || !this.notification.type) {
      return;
    }

    switch (this.notification.type) {
      case NotificationType.COMMENT:
        this.renderer.setStyle(this.el.nativeElement, 'backgroundColor', '#e0f7fa');
        this.renderer.setStyle(this.el.nativeElement, 'color', '#00695c');
        break;
      // Add more cases for other notification types if needed
      default:
        this.renderer.removeStyle(this.el.nativeElement, 'backgroundColor');
        this.renderer.removeStyle(this.el.nativeElement, 'color');
    }
  }
}
