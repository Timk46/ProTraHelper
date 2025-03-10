import { test, expect } from '@playwright/test'; 
import { LoginPage } from './loginPage'; //

test('Confirm loginPage Page Video and SignIn', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goTo();

  // locator for the video
  const Video = page.locator('video'); 

  // Wait until the progress notice is visible
  await expect(Video).toBeVisible({ timeout: 10000 });

  // // Check for the Chrome recommendation notice (only if not using Chrome)
  // if (browserName !== 'chromium') {
  //     const chromeNotice = page.locator('p:has-text("Wir empfehlen die Nutzung des Chrome-Browsers.")');
  //     await expect(chromeNotice).toBeVisible();
  // }

  await loginPage.validLogin();
  await expect(page).toHaveURL(/dashboard/);
});
