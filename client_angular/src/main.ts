import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment'; // Import environment
import { initToolbar } from '@stagewise/toolbar'; // Import Stagewise Toolbar

// Stagewise Toolbar Configuration
const stagewiseConfig = {
  plugins: []
};

// Initialize Stagewise Toolbar only in development mode
if (!environment.production) { // Angular's way to check for development mode
  console.log('Stagewise Toolbar Initializing (Development Mode)');
  initToolbar(stagewiseConfig);
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));