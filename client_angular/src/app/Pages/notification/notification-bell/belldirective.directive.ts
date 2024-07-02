// notification-style.directive.ts
import { Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges } from '@angular/core';
import { NotificationDTO } from '@DTOs/notification.dto';
import { NotificationType } from '@DTOs/notificationType.enum';


@Directive({
  selector: '[appNotificationStyle]'
})
export class BellDirective implements OnChanges {
  @Input() notification!: NotificationDTO;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges(changes: SimpleChanges) {
    if(changes['notification']) {
      this.applyStylesAndText();
    }
  }

  private applyStylesAndText() {
    if (!this.notification) {
      return;
    }
    if (!this.notification.isRead) {
      this.renderer.setStyle(this.el.nativeElement, 'backgroundColor', '#e0f7fa');
    } else {
      this.renderer.setStyle(this.el.nativeElement, 'backgroundColor', 'white');
    }
    if (this.notification.type === NotificationType.COMMENT) {
      this.renderer.setStyle(this.el.nativeElement, 'borderLeft', '4px solid darkblue');
    } else if (this.notification.type === NotificationType.SOLUTION) {
      this.renderer.setStyle(this.el.nativeElement, 'borderLeft', '4px solid darkgreen');
      // INFO is for notificaitons that are sent by admins or by the system(?) (NOT BEING USED)
    } else if (this.notification.type === NotificationType.INFO) {
      this.renderer.setStyle(this.el.nativeElement, 'borderLeft', '4px solid red');
    }
  }
}
