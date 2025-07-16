import { ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { Component, ViewChild } from '@angular/core';
import { LocalModelSource, TYPES } from 'sprotty';
import createContainer from './sprotty/di.config';
import { Container } from 'inversify';
import { GraphDataService } from 'src/app/Services/graph/graph-data.service';
import { ConceptGraphModelSource } from './sprotty/model-source';
import { ModuleDataService } from 'src/app/Services/module/module-data.service';
import { ModuleDTO } from '@DTOs/index';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
})
export class GraphComponent implements OnInit, AfterViewInit {
  @ViewChild('conceptGraph', { static: true }) graphContainer!: ElementRef<HTMLDivElement>;
  // create inversify container in di.config
  private readonly container!: Container;
  private readonly modelSource!: ConceptGraphModelSource;
  modules: ModuleDTO[] = [];
  private lastTouchPosition: { x: number; y: number } | null = null;
  constructor(private readonly moduleData: ModuleDataService) {
    this.container = createContainer('concept-graph');
    this.modelSource = this.container.get<ConceptGraphModelSource>(TYPES.ModelSource);
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    console.log('Graph container:', this.graphContainer.nativeElement);
    if (this.graphContainer) {
      console.log('Graph container:', this.graphContainer.nativeElement);
      const element = this.graphContainer.nativeElement;
      console.log('Adding event listeners');
      element.addEventListener('click', this.handleMouseClick.bind(this));
      element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
      console.log('touchstart listener added');
      element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
      element.addEventListener('touchend', this.handleTouchEnd.bind(this));
      console.log('Event listeners attached.');
    } else {
      console.error('Graph container is not available!');
    }
  }

  handleMouseClick(event: MouseEvent): void {
    console.log('Mouse click', event);
    event.preventDefault();
    console.log('Mouse click', event);
  }

  handleTouchStart(event: TouchEvent): void {
    console.log('Touch start', event.touches);
    event.preventDefault();
    const touch = event.touches[0];
    this.lastTouchPosition = { x: touch.clientX, y: touch.clientY };
    console.log('Touch start', event.touches);
  }

  handleTouchMove(event: TouchEvent): void {
    console.log('Touch move', event.touches);
    event.preventDefault();
    if (this.lastTouchPosition && event.touches.length === 1) {
      const touch = event.touches[0];
      const dx = touch.clientX - this.lastTouchPosition.x;
      const dy = touch.clientY - this.lastTouchPosition.y;
      this.panGraph(dx, dy);
      this.lastTouchPosition = { x: touch.clientX, y: touch.clientY };
    }
  }

  handleTouchEnd(event: TouchEvent): void {
    console.log('Touch end', event.changedTouches);
    this.lastTouchPosition = null; // Resetting the touch position
  }

  private panGraph(dx: number, dy: number): void {
    console.log('Panning graph by:', dx, dy);
    const svgElement = this.graphContainer.nativeElement.querySelector('svg');
    if (!svgElement) return;

    const viewBox = svgElement.getAttribute('concept-graph')!.split(' ').map(Number);
    viewBox[0] -= dx;
    viewBox[1] -= dy;
    svgElement.setAttribute('concept-graph', viewBox.join(' '));
  }
}
