import { BellDirective } from './belldirective.directive';
import { Renderer2 } from '@angular/core';
import { ElementRef } from '@angular/core';

describe('BellDirective', () => {
  let elementRef: ElementRef;
  let renderer: Renderer2;

  beforeEach(() => {
    elementRef = new ElementRef(document.createElement('div'));
    renderer = jasmine.createSpyObj('Renderer2', ['setStyle']);
  });

  it('should create an instance', () => {
    const directive = new BellDirective(elementRef, renderer);
    expect(directive).toBeTruthy();
  });
});
