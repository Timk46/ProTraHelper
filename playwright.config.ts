import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  /* Directory where tests are located */
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Maximum time one test can run for */
  timeout: 30000,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI --- using either 1 or half of the available cores */
  workers: process.env.CI ? 4 : Math.max(1, Math.floor(require('os').cpus().length / 2)),
  
  /* Reporter to use */
  reporter: [
    ['html'],
    ['list']
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    // baseURL: 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Capture screenshot after each test failure */
    screenshot: 'only-on-failure',
    
    /* Record video only when retrying a test for the first time */
    video: 'on-first-retry',
    
    /* Toggles bypassing Content-Security-Policy */
    bypassCSP: true,
    
    /* Run browser in headless mode */
    headless: true,

    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:4200',
  },
  
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], // Larger viewport for CI } 
        viewport: { width: 2500, height: 1000 } // Larger viewport for CI } 
      },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'],
    //     viewport: { width: 1024, height: 2000 } // Larger viewport for CI } 
    //    },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'],
    //     viewport: { width: 1024, height: 2000 } // Larger viewport for CI } 
    //       },
    // },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Galaxy Tab S4'],
        viewport: { width: 700, height: 1000 } // Larger viewport for CI }
        }
    },

    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'],
    //     viewport: { width: 720, height: 2000 } // Larger viewport for CI }
    //      },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: {
    //     ...devices['Desktop Edge'],
    //     channel: 'msedge'
    //   },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     channel: 'chrome'
    //   },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
