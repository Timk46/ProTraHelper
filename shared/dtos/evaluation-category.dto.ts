export interface EvaluationCategoryDTO {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string; // Material Icons: 'check_circle' | 'palette' | 'compare' | 'settings'
  order: number;
  
  // Additional metadata
  color?: string; // Color code for UI theming
  shortDescription?: string; // For tooltips
}

// Predefined categories based on screenshots
export const EVALUATION_CATEGORIES = {
  VOLLSTAENDIGKEIT: {
    id: 'vollstaendigkeit',
    name: 'vollstaendigkeit',
    displayName: 'Vollständigkeit',
    description: 'Bewertung der Vollständigkeit der Lösung',
    icon: 'check_circle',
    order: 1,
    color: '#4CAF50'
  },
  GRAFISCHE_DARSTELLUNG: {
    id: 'grafische_darstellung',
    name: 'grafische_darstellung', 
    displayName: 'Grafische Darstellungsqualität',
    description: 'Bewertung der grafischen Darstellungsqualität',
    icon: 'palette',
    order: 2,
    color: '#2196F3'
  },
  VERGLEICHBARKEIT: {
    id: 'vergleichbarkeit',
    name: 'vergleichbarkeit',
    displayName: 'Vergleichbarkeit',
    description: 'Bewertung der Vergleichbarkeit der Lösung',
    icon: 'compare',
    order: 3,
    color: '#FF9800'
  },
  KOMPLEXITAET: {
    id: 'komplexitaet',
    name: 'komplexitaet',
    displayName: 'Komplexität',
    description: 'Bewertung der Komplexität der Lösung',
    icon: 'settings',
    order: 4,
    color: '#9C27B0'
  }
} as const;