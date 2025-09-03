import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { VotingMechanismDialogComponent } from './voting-mechanism-dialog.component';

describe('VotingMechanismDialogComponent', () => {
  let component: VotingMechanismDialogComponent;
  let fixture: ComponentFixture<VotingMechanismDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<VotingMechanismDialogComponent>>;

  const mockDialogData = {
    currentVotes: 2,
    maxVotes: 5
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        VotingMechanismDialogComponent,
        MatIconModule,
        MatCardModule,
        MatButtonModule,
        MatDividerModule,
        MatListModule,
        MatProgressBarModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VotingMechanismDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display correct dialog title', () => {
    const titleElement = fixture.debugElement.query(By.css('h1[mat-dialog-title]'));
    expect(titleElement.nativeElement.textContent.trim()).toContain('Bewertungssystem erklärt');
  });

  it('should display current vote status', () => {
    const voteCountElement = fixture.debugElement.query(By.css('.vote-count'));
    expect(voteCountElement.nativeElement.textContent).toBe('2/5');
  });

  it('should show correct status text for multiple votes', () => {
    const statusText = fixture.debugElement.query(By.css('.status-text'));
    expect(statusText.nativeElement.textContent.trim()).toContain('Sie können noch 2 Kommentare bewerten');
  });

  it('should show correct status text for single vote', () => {
    component.data.currentVotes = 1;
    fixture.detectChanges();
    
    const statusText = fixture.debugElement.query(By.css('.status-text'));
    expect(statusText.nativeElement.textContent.trim()).toContain('Sie können noch 1 Kommentar bewerten');
  });

  it('should calculate progress percentage correctly', () => {
    expect(component.getProgressPercentage()).toBe(60); // (5-2)/5 * 100 = 60
  });

  it('should handle zero max votes', () => {
    component.data.maxVotes = 0;
    expect(component.getProgressPercentage()).toBe(0);
  });

  it('should show progress bar with correct value', () => {
    const progressBar = fixture.debugElement.query(By.css('mat-progress-bar'));
    expect(progressBar.componentInstance.value).toBe(60);
  });

  it('should display explanation sections', () => {
    const sectionHeaders = fixture.debugElement.queryAll(By.css('.section h2'));
    expect(sectionHeaders.length).toBeGreaterThan(0);
    
    const headerTexts = sectionHeaders.map(header => header.nativeElement.textContent.trim());
    expect(headerTexts).toContain('Wie funktioniert das Bewertungssystem?');
    expect(headerTexts).toContain('Punkteberechnung');
    expect(headerTexts).toContain('Warum gibt es ein Bewertungslimit?');
    expect(headerTexts).toContain('Tipps für effektive Bewertungen');
  });

  it('should display point explanation items', () => {
    const pointItems = fixture.debugElement.queryAll(By.css('.point-item'));
    expect(pointItems.length).toBe(2); // Upvote and neutral
  });

  it('should display tip cards', () => {
    const tipCards = fixture.debugElement.queryAll(By.css('.tip-card'));
    expect(tipCards.length).toBe(3);
  });

  it('should have close button that closes dialog', () => {
    const closeButton = fixture.debugElement.query(By.css('.close-button'));
    expect(closeButton).toBeTruthy();
    
    closeButton.nativeElement.click();
    // The mat-dialog-close directive should handle the closing
  });

  it('should have understand button', () => {
    const understandButton = fixture.debugElement.query(By.css('.understand-button'));
    expect(understandButton).toBeTruthy();
    expect(understandButton.nativeElement.textContent.trim()).toContain('Verstanden');
  });

  it('should display benefits list', () => {
    const benefitsList = fixture.debugElement.query(By.css('.benefits-list'));
    expect(benefitsList).toBeTruthy();
    
    const benefitItems = benefitsList.queryAll(By.css('mat-list-item'));
    expect(benefitItems.length).toBe(3);
  });

  it('should display explanation list', () => {
    const explanationList = fixture.debugElement.query(By.css('.explanation-list'));
    expect(explanationList).toBeTruthy();
    
    const explanationItems = explanationList.queryAll(By.css('mat-list-item'));
    expect(explanationItems.length).toBe(3);
  });

  it('should have proper accessibility attributes', () => {
    const closeButton = fixture.debugElement.query(By.css('.close-button'));
    expect(closeButton.nativeElement.getAttribute('aria-label')).toBe('Dialog schließen');
  });

  it('should display different vote scenarios correctly', () => {
    // Test scenario with no votes remaining
    component.data.currentVotes = 0;
    component.data.maxVotes = 3;
    fixture.detectChanges();

    const voteCountElement = fixture.debugElement.query(By.css('.vote-count'));
    expect(voteCountElement.nativeElement.textContent).toBe('0/3');

    expect(component.getProgressPercentage()).toBe(100); // All votes used
  });

  it('should handle edge case with equal current and max votes', () => {
    component.data.currentVotes = 5;
    component.data.maxVotes = 5;
    fixture.detectChanges();

    expect(component.getProgressPercentage()).toBe(0); // No votes used yet
    
    const statusText = fixture.debugElement.query(By.css('.status-text'));
    expect(statusText.nativeElement.textContent.trim()).toContain('Sie können noch 5 Kommentare bewerten');
  });
});