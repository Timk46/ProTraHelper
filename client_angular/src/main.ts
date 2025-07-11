import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment'; // Import environment
import { initToolbar } from '@stagewise/toolbar';

// Initialize Stagewise Toolbar only in development mode
if (!environment.production) {
  initToolbar({
    plugins: [],
  });
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
