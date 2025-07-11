import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ThreeViewerComponent } from '../three-viewer/three-viewer.component';
import type { ModelConverterService } from '../../services/model-converter.service';

/**
 * Component for integrating PMPM functionality into the course system
 * This component serves as a bridge between the course content and PMPM features
 */
@Component({
  selector: 'app-course-pmpm-integration',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, ThreeViewerComponent],
  templateUrl: './course-pmpm-integration.component.html',
  styleUrls: ['./course-pmpm-integration.component.scss'],
})
export class CoursePmpmIntegrationComponent implements OnInit {
  @Input() courseId!: string;
  @Input() lessonId!: string;
  @Input() modelId!: string;
  @Input() taskType: 'view' | 'edit' | 'review' = 'view';

  // Predefined models for testing
  availableModels = [
    { id: 'cube', name: 'Einfacher Würfel', description: 'Ein einfaches Testobjekt' },
    {
      id: 'frame',
      name: 'Architektonischer Rahmen',
      description: 'Ein Rahmenmodell mit Säulen und Trägern',
    },
  ];

  selectedModel = '';
  modelPath = '';
  isLoading = false;
  error: string | null = null;

  constructor(
    private readonly router: Router,
    private readonly modelConverterService: ModelConverterService,
  ) {}

  ngOnInit(): void {
    // If a model ID is provided, use it; otherwise default to first available model
    this.selectedModel = this.modelId || this.availableModels[0].id;
    this.updateModelPath();
  }

  /**
   * Updates the path to the selected model
   */
  private updateModelPath(): void {
    // For predefined models, use the path directly
    if (this.availableModels.some(model => model.id === this.selectedModel)) {
      this.modelPath = this.modelConverterService.getModelUrl(this.selectedModel);
      return;
    }

    // For dynamic models, we would need to convert/fetch the model
    this.isLoading = true;
    this.error = null;

    // This would be replaced with a real API call in production
    setTimeout(() => {
      this.modelPath = `assets/models/${this.selectedModel}.gltf`;
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Opens the PMPM application in full-screen mode
   */
  openPmpmEditor(): void {
    this.router.navigate([
      'courses',
      this.courseId,
      'lesson',
      this.lessonId,
      'pmpm',
      this.selectedModel,
    ]);
  }

  /**
   * Changes the selected model and updates the path
   */
  changeModel(modelId: string): void {
    this.selectedModel = modelId;
    this.updateModelPath();
  }

  /**
   * Gets the description for the currently selected model
   */
  getSelectedModelDescription(): string {
    const model = this.availableModels.find(m => m.id === this.selectedModel);
    return model ? model.description : 'Keine Beschreibung verfügbar';
  }

  /**
   * Opens the peer review page for the current model
   */
  openPeerReview(): void {
    // This would navigate to a peer review page
    this.router.navigate([
      'courses',
      this.courseId,
      'lesson',
      this.lessonId,
      'review',
      this.selectedModel,
    ]);
  }
}
