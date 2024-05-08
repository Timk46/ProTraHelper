import { Injectable } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ScreenSizeService {
  isHandset$: Observable<boolean>;
  isWeb$: Observable<boolean>;

  constructor(private breakpointObserver: BreakpointObserver) {
    this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.Web]);
    this.isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
      .pipe(
        map(result => result.matches)
      );
    this.isWeb$ = this.breakpointObserver.observe(Breakpoints.Web)
      .pipe(
        map(result => result.matches)
      );
  }
}
