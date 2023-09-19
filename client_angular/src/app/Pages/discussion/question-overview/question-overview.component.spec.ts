import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionOverviewComponent } from './question-overview.component';

describe('QuestionOverviewComponent', () => {
  let component: QuestionOverviewComponent;
  let fixture: ComponentFixture<QuestionOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QuestionOverviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
