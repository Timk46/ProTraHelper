import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoteBoxComponent } from './vote-box.component';

describe('VoteBoxComponent', () => {
  let component: VoteBoxComponent;
  let fixture: ComponentFixture<VoteBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VoteBoxComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VoteBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
