import { test, expect } from '@playwright/test';
import { LoginPage } from './loginPage';

test.setTimeout(200_000); // 200 Sekunden Timeout

test('should navigate to Programmieraufgabe, answer and verify feedback', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goTo();
  await loginPage.validLogin();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto('http://localhost:4200/tutor-kai/code/233'); 
  await expect(page).toHaveURL('http://localhost:4200/tutor-kai/code/233');

  // =============================================================================
  // STEP 1: Intercept the API request for code execution (Ausführen button)
  // =============================================================================
  const fakeSubmissionResponse = {
    CodeSubmissionResult: {
      output: "Dies ist eine Feedback Nachricht.",
      testResults: [],
      testsPassed: true,
      score: 100
    },
    encryptedCodeSubissionId: "fakeSubmissionId123"
  };

  // The interceptor matches any call to the execute endpoint.
  await page.route('**/run-code/execute', async (route) => {
    // Fulfill with the fake DTO response (serialized as JSON)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fakeSubmissionResponse)
    });
  });

  // Locate the "Ausführen" button and scroll to it 
  const ausfuehrenButton = page.getByRole('button', { name: 'Ausführen' });
  await ausfuehrenButton.scrollIntoViewIfNeeded(); 
  await ausfuehrenButton.click();
  await expect(page).toHaveURL(/tutor-kai\/code\/233/); // Optionale URL-Prüfung nach Klick
  // Wait until the progress spinner is detached from the DOM.
  // The spinner is rendered only when "isLoading" is true. Its absence means that isLoading is false.
  await page.waitForSelector('mat-progress-spinner', { state: 'detached', timeout: 15000 });
  await expect(page.locator('mat-progress-spinner')).toHaveCount(0);

  // At this point, the code submission response has been handled,
  // and the component’s currentState should be 2 (submittedCode).
  // Therefore, the feedback support selection buttons should appear.
  // Wait for the "Wenig Unterstützung" button to be visible.

  // -----------------------------------------------------------------------------
  // Set up the intercept for the getKIFeedback API call.
  // When the "Wenig Unterstützung" button is clicked, getKIFeedback is triggered,
  // which internally calls the evaluate-code endpoint. We intercept it here.
  await page.route('**/run-code/evaluate-code', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: "Hallo, ich bin Kai. Ich kann dir Tipps und Hilfestellungen geben."
    });
  });

  // Now wait for the rating container that is only rendered when currentState == 4.

  await page.waitForSelector('mat-card');


  // Warte explizit, bis der erste mat-card sichtbar ist
  const firstCard = page.locator('mat-card:has(mat-card-subtitle:has-text("Kai"))');
  await firstCard.waitFor({ state: 'visible', timeout: 15000 });
  await firstCard.scrollIntoViewIfNeeded();
  await expect(firstCard).toBeVisible();

  // Verify the first card's content
  const feedbackMessage = firstCard.locator('.feedback-message');
  await expect(feedbackMessage).toHaveText('Hallo, ich bin Kai. Ich kann dir Tipps und Hilfestellungen geben.');

  // Verify the buttons inside the first card
  const shortFeedback = firstCard.getByRole('button', { name: 'Wenig Unterstützung' });
  const srdFeedback = firstCard.getByRole('button', { name: 'Standard Unterstützung' });
  const longFeedback = firstCard.getByRole('button', { name: 'Viel Unterstützung' });
  await expect(shortFeedback).toBeVisible();
  await expect(srdFeedback).toBeVisible();
  await expect(longFeedback).toBeVisible();
  
  // Select the "Wenig Unterstützung" option
  await shortFeedback.click();
  const ratingContainer = page.locator('.rating-container');
  await ratingContainer.waitFor({ state: 'visible', timeout: 15000 });
  await expect(ratingContainer).toBeVisible();
  // Warte auf den zweiten mat-card
  const secondCard = page.locator('mat-card:has(mat-card-subtitle:has-text("Ausgabe"))');
  await expect(secondCard).toBeVisible();

  // Warte auf die KI-Feedback-Karte
  const feedbackCard = page.locator('mat-card.KI-card');
  await expect(feedbackCard).toBeVisible({ timeout: 12000 });
  await expect(feedbackCard).not.toBeEmpty();
  await expect(feedbackCard).toHaveText(/.+/);
  
  // Verify the content of the KI-card
  const outputContent = page.locator('mat-card-content').nth(1);
  await expect(outputContent).toBeVisible({ timeout: 480000 });
  await expect(outputContent).not.toBeEmpty();
  await expect(outputContent).toHaveText(/.+/);
  
  console.log('Both components were successfully verified.');
   
  // Locate the rating component and click the second star button
  const secondStarButton = feedbackCard.locator('.star-button:nth-child(2)');
  await secondStarButton.click();

  // Verify that the second star button is not visible after clicking (assuming it disappears on click)
  await expect(secondStarButton).not.toBeVisible(); 

  // Set up a download listener
  const [download] = await Promise.all([
    page.waitForEvent('download'), 
    page.click('button.downloadButton'),
  ]);

  // Optional: Verify the file name of the download
  const suggestedFilename = download.suggestedFilename();
  expect(suggestedFilename).toBe('hallo_welt.cpp'); 

  // Save the downloaded file to a specific location
  const savePath = 'downloads/hallo_welt.cpp'; 
  await download.saveAs(savePath);

  const fs = require('fs');
  expect(fs.existsSync(savePath)).toBeTruthy();
});
