import { ElementRef, OnDestroy } from '@angular/core';
import { Component, ViewChild } from '@angular/core';

@Component({
  selector: 'app-graph-tutorial-dialog',
  templateUrl: './graph-tutorial-dialog.component.html',
  styleUrls: ['./graph-tutorial-dialog.component.scss'],
})
export class GraphTutorialDialogComponent implements OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef;

  videosFolder = '../../../assets//videos';
  tutorials = [
    {
      title: 'Graphaufgaben',
      videoUrl: `${this.videosFolder}/goals_graphaufgaben_tutorial.mp4`,
    },
    {
      title: 'Dijkstra',
      videoUrl: `${this.videosFolder}/goals_dijkstra_tutorial.mp4`,
    },
    {
      title: 'Floyd',
      videoUrl: `${this.videosFolder}/goals_floyd_tutorial.mp4`,
    },
    {
      title: 'Transitive Hülle',
      videoUrl: `${this.videosFolder}/goals_transitive_hülle_tutorial.mp4`,
    },
    {
      title: 'Kruskal',
      videoUrl: `${this.videosFolder}/goals_kruskal_tutorial.mp4`,
    },
  ];

  currentTutorial = 0;

  // preventing Premature close conncetion error by closing the modal while video is loading
  ngOnDestroy() {
    this.stopAndResetVideo();
  }

  private stopAndResetVideo() {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.pause();
      this.videoPlayer.nativeElement.src = '';
      this.videoPlayer.nativeElement.load();
    }
  }
}
