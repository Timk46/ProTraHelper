import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';

import { McSliderTaskComponent } from './mc-slider-task.component';
import { QuestionDataService } from 'src/app/Services/question/question-data.service';
import { QuestionDTO, McQuestionDTO } from '@DTOs/index';
import { TaskViewData } from '@DTOs/index';

describe('McSliderTaskComponent', () => {
  let component: McSliderTaskComponent;
  let fixture: ComponentFixture<McSliderTaskComponent>;
  let mockQuestionDataService: jasmine.SpyObj<QuestionDataService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<McSliderTaskComponent>>;
  let mockLocation: jasmine.SpyObj<Location>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockTaskViewData: TaskViewData = {
    contentNodeId: 1,
    contentElementId: 1,
    id: 1,
    name: 'Test Task',
    type: 'MC',
    progress: 0,
  };

  const mockQuestions: QuestionDTO[] = [
    {
      id: 1,
      name: 'Question 1',
      text: 'What is 2+2?',
      type: 'MC',
      conceptNodeId: 1,
      isApproved: true,
      level: 1,
      score: 10,
    },
    {
      id: 2,
      name: 'Question 2',
      text: 'What is 3+3?',
      type: 'MC',
      conceptNodeId: 1,
      isApproved: true,
      level: 1,
      score: 10,
    },
  ];

  const mockMcQuestion: McQuestionDTO = {
    id: 1,
    questionId: 1,
    isSC: true,
    shuffleOptions: false,
    mcQuestionOption: [],
  };

  const mockOptions = [
    { id: 1, text: 'Option 1' },
    { id: 2, text: 'Option 2' },
  ];

  beforeEach(async () => {
    const questionDataServiceSpy = jasmine.createSpyObj('QuestionDataService', [
      'getMCQuestion',
      'getMCOptions',
      'createUserAnswer',
    ]);
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    const locationSpy = jasmine.createSpyObj('Location', ['replaceState']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [McSliderTaskComponent],
      imports: [MatIconModule],
      providers: [
        { provide: QuestionDataService, useValue: questionDataServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: Location, useValue: locationSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            taskViewData: mockTaskViewData,
            conceptId: 1,
            questions: mockQuestions,
          },
        },
      ],
    }).compileComponents();

    mockQuestionDataService = TestBed.inject(
      QuestionDataService,
    ) as jasmine.SpyObj<QuestionDataService>;
    mockDialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<
      MatDialogRef<McSliderTaskComponent>
    >;
    mockLocation = TestBed.inject(Location) as jasmine.SpyObj<Location>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Setup default mocks
    mockQuestionDataService.getMCQuestion.and.returnValue(of(mockMcQuestion));
    mockQuestionDataService.getMCOptions.and.returnValue(of(mockOptions));
    mockQuestionDataService.createUserAnswer.and.returnValue(
      of({
        id: 1,
        userAnswerId: 1,
        score: 10,
        feedbackText: 'Correct!',
        elementDone: true,
        progress: 100,
      }),
    );

    fixture = TestBed.createComponent(McSliderTaskComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with dialog data', () => {
    expect(component.taskViewData).toEqual(mockTaskViewData);
    expect(component.conceptId).toBe(1);
    expect(component.questions).toEqual(mockQuestions);
  });

  it('should load questions data on init', () => {
    fixture.detectChanges();
    expect(mockQuestionDataService.getMCQuestion).toHaveBeenCalledWith(1);
    expect(mockQuestionDataService.getMCOptions).toHaveBeenCalled();
  });

  it('should navigate between questions', () => {
    fixture.detectChanges();

    // Should start at first question
    expect(component.currentQuestionIndex).toBe(0);

    // Navigate to next question
    component.nextQuestion();
    expect(component.currentQuestionIndex).toBe(1);

    // Navigate to previous question
    component.previousQuestion();
    expect(component.currentQuestionIndex).toBe(0);
  });

  it('should handle single choice selection', () => {
    fixture.detectChanges();

    component.selectSingleOption(1);
    const currentState = component.getCurrentQuestionState();

    expect(currentState?.selectedOptions).toContain(1);
    expect(currentState?.selectedOptions.length).toBe(1);
  });

  it('should handle multiple choice selection', () => {
    // Mock multiple choice question
    const mcQuestion = { ...mockMcQuestion, isSC: false };
    mockQuestionDataService.getMCQuestion.and.returnValue(of(mcQuestion));

    fixture.detectChanges();

    component.toggleOption(1);
    component.toggleOption(2);

    const currentState = component.getCurrentQuestionState();
    expect(currentState?.selectedOptions).toContain(1);
    expect(currentState?.selectedOptions).toContain(2);
    expect(currentState?.selectedOptions.length).toBe(2);
  });

  it('should close dialog on close', () => {
    component.onClose();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should calculate answered questions count', () => {
    fixture.detectChanges();

    // Initially no questions answered
    expect(component.getAnsweredCount()).toBe(0);

    // Answer first question
    component.selectSingleOption(1);
    expect(component.getAnsweredCount()).toBe(1);
  });

  it('should check if all questions are answered', () => {
    fixture.detectChanges();

    // Initially not all answered
    expect(component.allQuestionsAnswered()).toBe(false);

    // Answer all questions
    component.selectSingleOption(1);
    component.nextQuestion();
    component.selectSingleOption(2);

    expect(component.allQuestionsAnswered()).toBe(true);
  });

  it('should handle component destruction', () => {
    const destroySpy = spyOn(component['destroy$'], 'next');
    const completeSpy = spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
