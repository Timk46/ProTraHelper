import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileNavigatorComponent } from './mobile-navigator.component';

describe('MobileNavigatorComponent', () => {
  let component: MobileNavigatorComponent;
  let fixture: ComponentFixture<MobileNavigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MobileNavigatorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileNavigatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
