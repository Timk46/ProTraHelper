import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { VideoTimeStampComponent } from './video-time-stamp.component';

describe('VideoTimeStampComponent', () => {
  let component: VideoTimeStampComponent;
  let fixture: ComponentFixture<VideoTimeStampComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VideoTimeStampComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoTimeStampComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
