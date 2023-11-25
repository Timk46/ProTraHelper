import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MaterialModule } from './modules/material/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SidenavComponent, ImpressumComponent, DatenschutzComponent } from './sites/sidenav/sidenav.component';
import { ChatBotComponent } from './sites/chat-bot/chat-bot.component';
import { VideoTimeStampComponent } from './sites/chat-bot/video-time-stamp/video-time-stamp.component';


@NgModule({
  declarations: [AppComponent, SidenavComponent, ImpressumComponent, DatenschutzComponent, ChatBotComponent, VideoTimeStampComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    MaterialModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [ ],
  bootstrap: [AppComponent],
})
export class AppModule {}
