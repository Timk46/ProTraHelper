import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatBotComponent } from './sites/chat-bot/chat-bot.component';
import { VideoTimeStampComponent } from './sites/chat-bot/video-time-stamp/video-time-stamp.component';


const routes: Routes = [
  { path: 'chat', component: ChatBotComponent },
  {path: '', redirectTo: 'chat', pathMatch: 'full'},
  { path: 'video', component: VideoTimeStampComponent },

];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
