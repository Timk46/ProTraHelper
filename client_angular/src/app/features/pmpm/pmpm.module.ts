import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { PmpmRoutingModule } from './pmpm-routing.module';
import { PmpmOverlayComponent } from './components/pmpm-overlay/pmpm-overlay.component';
import { PmpmService } from './services/pmpm.service';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule,
    PmpmRoutingModule,
    MatButtonModule,
    MatIconModule,
    OverlayModule,
    PortalModule
  ],
  providers: [
    PmpmService
  ]
})
export class PmpmModule { }
