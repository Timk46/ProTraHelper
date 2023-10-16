import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommentCreationComponent } from './comment-creation.component';

describe('CommentCreationComponent', () => {
  let component: CommentCreationComponent;
  let fixture: ComponentFixture<CommentCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CommentCreationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommentCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
