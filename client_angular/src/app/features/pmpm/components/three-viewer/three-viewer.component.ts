import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParameterChange, ParameterUpdateResult } from '../../models/pmpm-session.model';
import { PmpmService } from '../../services/pmpm.service';
import { Subscription } from 'rxjs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Component for displaying and interacting with 3D models exported from PMPM
 * This will visualize the architectural models and allow parameter adjustments
 */
@Component({
  selector: 'app-three-viewer',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSliderModule, FormsModule],
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.scss']
})
export class ThreeViewerComponent implements OnInit, OnDestroy {
  @ViewChild('rendererContainer') rendererContainer!: ElementRef;

  /** The ID of the model to load */
  @Input() modelId!: string;

  /** Optional path to a GLTF model (converted from .3dm) */
  @Input() modelPath?: string;

  /** 3D Scene and rendering components */
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;

  /** Current model components */
  private model: THREE.Group | null = null;
  private selectedObject: THREE.Object3D | null = null;

  /** Analysis visualization elements */
  private forceVectors: THREE.InstancedMesh | null = null;
  private stressLineSegments: THREE.LineSegments | null = null;

  /** Parameters for the model */
  parameters: { id: string; name: string; value: number; min: number; max: number }[] = [
    { id: 'height', name: 'Höhe', value: 5, min: 1, max: 10 },
    { id: 'width', name: 'Breite', value: 3, min: 1, max: 5 },
    { id: 'depth', name: 'Tiefe', value: 4, min: 1, max: 8 },
    { id: 'density', name: 'Dichte', value: 2, min: 0.1, max: 5 }
  ];

  /** Subscriptions for cleanup */
  private subscriptions: Subscription[] = [];

  /** Flags and state */
  isLoading = true;
  isAnalysisMode = false;
  error: string | null = null;

  constructor(private pmpmService: PmpmService) {}

  ngOnInit(): void {
    // Listen for parameter update results from the server
    this.subscriptions.push(
      this.pmpmService.parameterUpdate$.subscribe(update => {
        if (update) {
          this.applyParameterUpdate(update);
        }
      })
    );
  }

  ngAfterViewInit(): void {
    this.initScene();
    this.setupRaycaster();
    this.loadModel();
    this.animate();

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  ngOnDestroy(): void {
    // Clean up resources
    this.subscriptions.forEach(sub => sub.unsubscribe());
    window.removeEventListener('resize', this.onWindowResize.bind(this));

    // Dispose of Three.js resources
    if (this.renderer) {
      this.renderer.dispose();
    }

    // Dispose geometries, materials, textures
    this.disposeNode(this.scene);
  }

  /**
   * Initialize the Three.js scene, camera, and renderer
   */
  private initScene(): void {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Create camera
    const width = this.rendererContainer.nativeElement.clientWidth;
    const height = this.rendererContainer.nativeElement.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(10, 10, 10);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

    // Add orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(20, 20);
    this.scene.add(gridHelper);
  }

  /**
   * Setup raycaster for object selection
   */
  private setupRaycaster(): void {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Add click event listener
    const rendererElement = this.rendererContainer.nativeElement.querySelector('canvas');
    if (rendererElement) {
      rendererElement.addEventListener('click', this.onMouseClick.bind(this));
    }
  }

  /**
   * Handle mouse click for object selection
   */
  private onMouseClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();

    // Calculate mouse position in normalized device coordinates
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update the raycaster with the mouse and camera
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Find intersections with all objects in the scene
    if (this.model) {
      const intersects = this.raycaster.intersectObjects(this.model.children, true);

      if (intersects.length > 0) {
        this.selectObject(intersects[0].object);
      } else {
        this.clearSelection();
      }
    }
  }

  /**
   * Select an object in the scene
   */
  private selectObject(object: THREE.Object3D): void {
    // Clear previous selection
    this.clearSelection();

    // Set new selection
    this.selectedObject = object;

    // Highlight selected object
    if (object.type === 'Mesh') {
      const mesh = object as THREE.Mesh;
      if (mesh.material) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissive = new THREE.Color(0x00ff00);
        material.emissiveIntensity = 0.3;
      }
    }
  }

  /**
   * Clear the current selection
   */
  private clearSelection(): void {
    if (this.selectedObject && this.selectedObject.type === 'Mesh') {
      const mesh = this.selectedObject as THREE.Mesh;
      if (mesh.material) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissive = new THREE.Color(0x000000);
        material.emissiveIntensity = 0;
      }
    }

    this.selectedObject = null;
  }

  /**
   * Load a 3D model from the specified path
   */
  private loadModel(): void {
    this.isLoading = true;
    this.error = null;

    // If there's a specific model path, use it; otherwise use a default path based on modelId
    const modelPathToLoad = this.modelPath || `assets/models/${this.modelId}.gltf`;

    const loader = new GLTFLoader();
    loader.load(
      modelPathToLoad,
      (gltf: { scene: THREE.Group<THREE.Object3DEventMap> | null; }) => {
        this.model = gltf.scene;

        // Set up model
        this.model!.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.scene.add(this.model!);
        this.centerModel();
        this.isLoading = false;
      },
      (progress: { loaded: number; total: number }) => {
        // Loading progress
        console.log(`Loading model: ${Math.round((progress.loaded / progress.total) * 100)}%`);
      },
      (err: unknown) => {
        // Error handling
        console.error('Error loading model:', err);
        this.error = 'Fehler beim Laden des 3D-Modells.';
        this.isLoading = false;
      }
    );
  }

  /**
   * Public method to reload the model (used in template)
   */
  reloadModel(): void {
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
    }
    this.loadModel();
  }

  /**
   * Center the model in the scene
   */
  private centerModel(): void {
    if (!this.model) return;

    // Create a bounding box for the model
    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Move model to center
    this.model.position.sub(center);

    // Adjust camera
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;
    this.camera.position.set(distance, distance, distance);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Update controls target
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Animation loop for rendering
   */
  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Handle window resize events
   */
  private onWindowResize(): void {
    if (!this.rendererContainer) return;

    const width = this.rendererContainer.nativeElement.clientWidth;
    const height = this.rendererContainer.nativeElement.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Update a parameter value and send to the server
   */
  updateParameter(parameterId: string, value: number): void {
    // Update local value
    const param = this.parameters.find(p => p.id === parameterId);
    if (param) {
      param.value = value;
    }

    // Send change to server
    const change: ParameterChange = {
      parameterId,
      value
    };

    this.pmpmService.sendParameterChange(change);
  }

  /**
   * Apply parameter update results from the server
   */
  private applyParameterUpdate(update: ParameterUpdateResult): void {
    // Find the parameter that was updated
    const param = this.parameters.find(p => p.id === update.parameterId);
    if (param) {
      param.value = update.value;
    }

    // Update the model based on the parameter
    this.updateModelGeometry(update.parameterId, update.value);

    // Update analysis visualization if in analysis mode
    if (this.isAnalysisMode && update.results) {
      this.updateAnalysisVisualization(update.results);
    }
  }

  /**
   * Update the model geometry based on parameter changes
   */
  private updateModelGeometry(parameterId: string, value: number): void {
    if (!this.model) return;

    // Scale the appropriate dimension of the model based on the parameter
    switch (parameterId) {
      case 'height':
        this.model.scale.y = value / 5; // Normalize to starting value
        break;
      case 'width':
        this.model.scale.x = value / 3; // Normalize to starting value
        break;
      case 'depth':
        this.model.scale.z = value / 4; // Normalize to starting value
        break;
      // Add other parameter handling as needed
    }
  }

  /**
   * Update the analysis visualization based on parameter results
   */
  private updateAnalysisVisualization(results: any): void {
    if (!this.model) return;

    // Remove previous visualizations
    if (this.forceVectors) {
      this.scene.remove(this.forceVectors);
      this.forceVectors = null;
    }

    if (this.stressLineSegments) {
      this.scene.remove(this.stressLineSegments);
      this.stressLineSegments = null;
    }

    // Create visualization for stress based on results
    if (results.stressValue) {
      this.createStressVisualization(results.stressValue);
    }

    // Create visualization for deformation based on results
    if (results.deformation) {
      this.createDeformationVisualization(results.deformation);
    }
  }

  /**
   * Create a visualization for stress
   */
  private createStressVisualization(stressValue: number): void {
    // Simple color mapping based on stress value
    const normalizedStress = Math.min(1, stressValue / 100);
    const color = new THREE.Color().setHSL(0.3 * (1 - normalizedStress), 1, 0.5);

    // Color the model based on stress
    if (this.model) {
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          material.color.copy(color);
        }
      });
    }
  }

  /**
   * Create a visualization for deformation
   */
  private createDeformationVisualization(deformation: number): void {
    // Simple mesh deformation based on deformation value
    // In a real implementation, this would use more complex physics-based deformation
    const normalizedDeformation = deformation / 10;

    if (this.model) {
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry.type === 'BufferGeometry') {
          const geometry = child.geometry;
          const positionAttribute = geometry.getAttribute('position');

          // Skip if we don't have position data
          if (!positionAttribute) return;

          // Create a simple wave deformation
          const positions = positionAttribute.array;
          for (let i = 0; i < positions.length; i += 3) {
            const y = positions[i + 1];
            positions[i + 1] = y * (1 + Math.sin(positions[i] + positions[i + 2]) * normalizedDeformation * 0.1);
          }

          positionAttribute.needsUpdate = true;
        }
      });
    }
  }

  /**
   * Toggle analysis mode (stress and deformation visualization)
   */
  toggleAnalysisMode(): void {
    this.isAnalysisMode = !this.isAnalysisMode;

    if (this.isAnalysisMode) {
      // Get latest parameter values and request an analysis
      const lastParameter = this.parameters[0]; // Just use first parameter as example
      this.updateParameter(lastParameter.id, lastParameter.value);
    } else {
      // Clear analysis visualization
      if (this.forceVectors) {
        this.scene.remove(this.forceVectors);
        this.forceVectors = null;
      }

      if (this.stressLineSegments) {
        this.scene.remove(this.stressLineSegments);
        this.stressLineSegments = null;
      }

      // Reset model colors
      if (this.model) {
        this.model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshStandardMaterial;
            material.color.set(0xcccccc);
          }
        });
      }
    }
  }

  /**
   * Reset parameters to default values
   */
  resetParameters(): void {
    this.parameters.forEach(param => {
      const defaultValue = {
        height: 5,
        width: 3,
        depth: 4,
        density: 2
      }[param.id] || param.value;

      this.updateParameter(param.id, defaultValue);
    });

    // Reset model scale
    if (this.model) {
      this.model.scale.set(1, 1, 1);
    }
  }

  /**
   * Reset the camera to the default position
   */
  resetCamera(): void {
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Recursively dispose of Three.js objects to prevent memory leaks
   */
  private disposeNode(node: THREE.Object3D): void {
    if (node instanceof THREE.Mesh) {
      if (node.geometry) {
        node.geometry.dispose();
      }

      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach(material => this.disposeMaterial(material));
        } else {
          this.disposeMaterial(node.material);
        }
      }
    }

    // Recursively dispose of all children
    for (const child of node.children) {
      this.disposeNode(child);
    }
  }

  /**
   * Dispose material and its textures
   */
  private disposeMaterial(material: THREE.Material): void {
    material.dispose();

    // Dispose of textures if it's a MeshStandardMaterial
    if (material instanceof THREE.MeshStandardMaterial) {
      if (material.map) material.map.dispose();
      if (material.normalMap) material.normalMap.dispose();
      if (material.roughnessMap) material.roughnessMap.dispose();
      if (material.metalnessMap) material.metalnessMap.dispose();
      if (material.emissiveMap) material.emissiveMap.dispose();
      if (material.alphaMap) material.alphaMap.dispose();
      if (material.envMap) material.envMap.dispose();
    }
  }
}
