import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { DiscussionFilterComponent } from './discussion-filter.component';

describe('DiscussionFilterComponent', () => {
  let component: DiscussionFilterComponent;
  let fixture: ComponentFixture<DiscussionFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DiscussionFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DiscussionFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
