import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FillinTaskComponent } from './fill-in-task.component';

describe('FillinTaskComponent', () => {
  let component: FillinTaskComponent;
  let fixture: ComponentFixture<FillinTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FillinTaskComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FillinTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
