import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { DiscussionPrecreationComponent } from './discussion-precreation.component';

describe('DiscussionPrecreationComponent', () => {
  let component: DiscussionPrecreationComponent;
  let fixture: ComponentFixture<DiscussionPrecreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DiscussionPrecreationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DiscussionPrecreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
