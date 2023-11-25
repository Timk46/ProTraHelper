import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';
import { ChangeDetectorRef } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';

// This Component is responsible for the sidenav and the footer of the application.
// Because i dont want extra files for the eacht footer element component, they are all here
@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
})
export class SidenavComponent implements OnInit, AfterViewInit {
  @ViewChild(MatSidenav, { static: false })
  sidenav!: MatSidenav;

  constructor(
    private observer: BreakpointObserver,
    private cdRef: ChangeDetectorRef,
    public impressum: MatDialog,
    public datenschutz: MatDialog
  ) {}

  openImpressum() {
    const dialogRef = this.impressum.open(ImpressumComponent);

    dialogRef.afterClosed().subscribe(result => {
    });
  }

  openDatenschutz() {
    const dialogRef = this.datenschutz.open(DatenschutzComponent);

    dialogRef.afterClosed().subscribe(result => {
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit() {
    Promise.resolve().then(() => this.sidenav.opened = false);

    this.observer.observe(['(max-width: 800px)']).subscribe((result) => {
      if (result.matches) {
        this.sidenav.mode = 'over';
        this.sidenav.close();
      } else {
        this.sidenav.mode = 'side';
        this.sidenav.open();
      }
      this.cdRef.detectChanges();
    });
  }
}


@Component({
  selector: 'impressum',
  templateUrl: 'impressum.html',
})
export class ImpressumComponent {}

@Component({
  selector: 'datenschutz',
  templateUrl: 'datenschutz.html',
})
export class DatenschutzComponent {}
