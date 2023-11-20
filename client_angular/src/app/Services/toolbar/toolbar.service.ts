import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ToolbarService {
  visible: Observable<boolean>;

  constructor() {
    this.visible = new Observable<boolean>();
  }

  hide() {
    this.visible = of(false);
  }

  show() {
    this.visible = of(true);
  }
}
