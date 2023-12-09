import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import {MatDialog} from '@angular/material/dialog';

// This Component is responsible for the sidenav and the footer of the application.
// Because i dont want extra files for the eacht footer element component, they are all here
@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
})
export class SidenavComponent {
  @ViewChild(MatSidenav, { static: false })
  sidenav!: MatSidenav;

  constructor(
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
