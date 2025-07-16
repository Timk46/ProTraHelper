import { Injectable } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BreakpointState, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ScreenSizeService {
  isHandset: Observable<boolean>;
  isWeb: Observable<boolean>;
  isTablet: Observable<boolean>;
  isLandscape: Observable<boolean>;

  constructor(private readonly breakpointObserver: BreakpointObserver) {
    this.isHandset = this.breakpointObserver
      .observe([Breakpoints.Handset])
      .pipe(map(result => result.matches));

    this.isWeb = this.breakpointObserver
      .observe([Breakpoints.Web])
      .pipe(map(result => result.matches));

    this.isTablet = this.breakpointObserver
      .observe([Breakpoints.Tablet])
      .pipe(map(result => result.matches));

    this.isLandscape = this.breakpointObserver
      .observe('(orientation: landscape)')
      .pipe(map(result => result.matches));
  }
}
