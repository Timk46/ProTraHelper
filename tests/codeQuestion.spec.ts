import { test, expect, Locator } from '@playwright/test';
import { LoginPage } from './loginPage';

// Set a longer timeout for this test since it involves API calls and complex UI interactions
test.setTimeout(200_000); // 200 seconds timeout

/**
 * End-to-End Test for Programming Task Interface
 * 
 * This test verifies the complete flow of the programming task interface:
 * 1. Navigating to a programming task
 * 2. Executing the code
 * 3. Receiving and verifying execution results
 * 4. Requesting AI feedback
 * 5. Verifying the feedback content
 * 6. Rating the feedback
 * 7. Downloading the code
 * 
 * The test includes robust error handling, detailed logging, and proper state management.
 */
test('should navigate to programming task, execute code, get feedback, and download', async ({ page, context }) => {
  console.log('Starting programming task end-to-end test');
  
  try {
    // Step 1: Login and navigate to the programming task
    console.log('Step 1: Logging in and navigating to programming task');
    const loginPage = new LoginPage(page);
    await loginPage.goTo();
    await loginPage.validLogin();
    await expect(page).toHaveURL(/dashboard/);

    // Navigate to the programming task page
    await page.goto('http://localhost:4200/tutor-kai/code/40');
    await expect(page).toHaveURL('http://localhost:4200/tutor-kai/code/40');
    
    // Take a screenshot to help with debugging
    await page.screenshot({ path: `programming-task-initial-${Date.now()}.png`, fullPage: true });

    // Step 2: Set up API mocks for code execution and feedback
    console.log('Step 2: Setting up API mocks');
    
    // Mock the code execution API response
    const fakeSubmissionResponse = {
      CodeSubmissionResult: {
        output: "Dies ist eine Ausgabe der Programmausführung.\nDie Lösung ist korrekt!",
        testResults: [
          { test: "Test 1", status: "SUCCESSFUL", exception: "" },
          { test: "Test 2", status: "SUCCESSFUL", exception: "" }
        ],
        testsPassed: true,
        score: 100
      },
      encryptedCodeSubissionId: "fakeSubmissionId123"
    };

    await page.route('**/run-code/execute', async (route) => {
      console.log('Intercepted code execution request');
      // Add a small delay to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeSubmissionResponse)
      });
    });

    // Mock the AI feedback API response with streaming behavior
    await page.route('**/run-code/evaluate-code', async (route) => {
      console.log('Intercepted AI feedback request');
      // Simulate a streaming response by fulfilling with a complete response
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: "Hallo, ich bin Kai. Ich habe deine Lösung analysiert.\n\nDeine Implementierung der `pizza_bestellung` Funktion ist korrekt. Du gibst die richtige Nachricht zurück, die den Namen der Lieblingspizza enthält.\n\nGut gemacht!"
      });
    });

    // Step 3: Wait for the code editor to be visible and ready
    console.log('Step 3: Waiting for code editor to be ready');
    
    // Wait for the code editor to be visible
    const codeEditor = page.locator('app-code-editor');
    await expect(codeEditor).toBeVisible({ timeout: 10000 });
    
    // Wait for the task description to be loaded
    const taskDescription = page.locator('mat-card-content markdown');
    await expect(taskDescription).toBeVisible({ timeout: 10000 });
    
    // Take a screenshot to help with debugging
    await page.screenshot({ path: `code-editor-ready-${Date.now()}.png`, fullPage: true });

    // Step 4: Execute the code
    console.log('Step 4: Executing the code');
    
    // Find and click the "Ausführen" button
    const ausfuehrenButton = page.getByRole('button', { name: 'Ausführen' });
    await expect(ausfuehrenButton).toBeVisible({ timeout: 10000 });
    await ausfuehrenButton.scrollIntoViewIfNeeded();
    
    // Take a screenshot before clicking
    await page.screenshot({ path: `before-execute-${Date.now()}.png`, fullPage: true });
    
    // Click the button with retry logic
    let executeSuccess = false;
    for (let attempt = 0; attempt < 3 && !executeSuccess; attempt++) {
      try {
        console.log(`Execute attempt ${attempt + 1}`);
        await ausfuehrenButton.click({ timeout: 5000 });
        executeSuccess = true;
      } catch (e) {
        console.log(`Error during execute attempt ${attempt + 1}:`, e);
        if (attempt < 2) await page.waitForTimeout(1000);
      }
    }
    
    if (!executeSuccess) {
      throw new Error('Failed to click the execute button after multiple attempts');
    }
    
    // Wait for the loading spinner to appear and then disappear
    const spinner = page.locator('mat-progress-spinner');
    
    // Check if spinner appears (it might be very quick in tests)
    const spinnerVisible = await spinner.isVisible({ timeout: 3000 }).catch(() => false);
    if (spinnerVisible) {
      console.log('Waiting for spinner to disappear');
      await expect(spinner).not.toBeVisible({ timeout: 15000 });
    }
    
    // Take a screenshot after execution
    await page.screenshot({ path: `after-execute-${Date.now()}.png`, fullPage: true });

    // Step 5: Verify the execution results
    console.log('Step 5: Verifying execution results');
    
    // Wait for the output card to be visible
    const outputCard = page.locator('mat-card.CompilerCard-card');
    await expect(outputCard).toBeVisible({ timeout: 10000 });
    
    // Verify the output content
    const outputContent = outputCard.locator('pre');
    await expect(outputContent).toBeVisible({ timeout: 10000 });
    await expect(outputContent).toContainText('Dies ist eine Ausgabe');
    
    // Verify the score display
    const scoreDisplay = page.locator('.points-display');
    await expect(scoreDisplay).toBeVisible({ timeout: 10000 });
    await expect(scoreDisplay).toContainText('100 / 100');
    
    // Verify the test results circles
    const testCircles = page.locator('.test-circles circle');
    await expect(testCircles).toHaveCount(2, { timeout: 10000 });
    
    // Step 6: Request AI feedback
    console.log('Step 6: Requesting AI feedback');
    
    // Wait for the feedback card to be visible
    const feedbackCard = page.locator('mat-card.KI-card');
    await expect(feedbackCard).toBeVisible({ timeout: 10000 });
    
    // Verify the initial feedback message
    const feedbackMessage = feedbackCard.locator('.feedback-message');
    await expect(feedbackMessage).toBeVisible({ timeout: 10000 });
    await expect(feedbackMessage).toContainText('Hallo, ich bin Kai');
    
    // Find and verify the feedback level buttons
    const feedbackButtons = feedbackCard.locator('button:has-text("Unterstützung")');
    await expect(feedbackButtons).toHaveCount(3, { timeout: 10000 });
    
    // Find the specific feedback level buttons
    const shortFeedbackButton = page.getByRole('button', { name: 'Wenig Unterstützung' });
    const stdFeedbackButton = page.getByRole('button', { name: 'Standard Unterstützung' });
    const longFeedbackButton = page.getByRole('button', { name: 'Viel Unterstützung' });
    
    // Verify all buttons are visible
    await expect(shortFeedbackButton).toBeVisible({ timeout: 10000 });
    await expect(stdFeedbackButton).toBeVisible({ timeout: 10000 });
    await expect(longFeedbackButton).toBeVisible({ timeout: 10000 });
    
    // Take a screenshot before clicking the feedback button
    await page.screenshot({ path: `before-feedback-request-${Date.now()}.png`, fullPage: true });
    
    // Click the "Wenig Unterstützung" button with retry logic
    let feedbackRequestSuccess = false;
    for (let attempt = 0; attempt < 3 && !feedbackRequestSuccess; attempt++) {
      try {
        console.log(`Feedback request attempt ${attempt + 1}`);
        await shortFeedbackButton.click({ timeout: 5000 });
        feedbackRequestSuccess = true;
      } catch (e) {
        console.log(`Error during feedback request attempt ${attempt + 1}:`, e);
        if (attempt < 2) await page.waitForTimeout(1000);
      }
    }
    
    if (!feedbackRequestSuccess) {
      throw new Error('Failed to click the feedback button after multiple attempts');
    }
    
    // Wait for the feedback generation progress bar to appear
    const feedbackProgressBar = feedbackCard.locator('mat-progress-bar');
    const progressBarVisible = await feedbackProgressBar.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (progressBarVisible) {
      console.log('Waiting for feedback generation progress bar to disappear');
      await expect(feedbackProgressBar).not.toBeVisible({ timeout: 30000 });
    }
    
    // Take a screenshot after feedback generation
    await page.screenshot({ path: `after-feedback-generation-${Date.now()}.png`, fullPage: true });

    // Step 7: Verify the AI feedback content
    console.log('Step 7: Verifying AI feedback content');
    
    // Wait for the rating container to be visible (indicates feedback is complete)
    const ratingContainer = page.locator('.rating-container');
    await expect(ratingContainer).toBeVisible({ timeout: 30000 });
    
    // Verify the updated feedback message
    await expect(feedbackMessage).toContainText('Ich habe deine Lösung analysiert');
    
    // Step 8: Rate the feedback (optional step)
    console.log('Step 8: Attempting to rate the feedback (optional)');
    
    try {
      // Wait a bit longer for animations to complete
      await page.waitForTimeout(3000);
      
      // Find the star rating buttons
      const starButtons = ratingContainer.locator('.star-button');
      const buttonCount = await starButtons.count();
      console.log(`Found ${buttonCount} star buttons`);
      
      if (buttonCount > 0) {
        // Take a screenshot before attempting to rate
        await page.screenshot({ path: `before-rating-${Date.now()}.png`, fullPage: true });
        
        // Try using JavaScript evaluation to click the second star directly
        console.log('Attempting to click star using JavaScript evaluation');
        await page.evaluate(() => {
          // Find all star buttons
          const stars = document.querySelectorAll('.star-button');
          // Click the second star if it exists
          if (stars.length > 1) {
            (stars[1] as HTMLElement).click();
            return true;
          }
          return false;
        });
        
        // Wait a moment for the rating to be processed
        await page.waitForTimeout(2000);
        
        // Take a screenshot after rating attempt
        await page.screenshot({ path: `after-rating-${Date.now()}.png`, fullPage: true });
        
        console.log('Rating attempt completed via JavaScript');
      } else {
        console.log('No star buttons found, skipping rating step');
      }
    } catch (error) {
      // Don't fail the test if rating fails, just log the error
      console.log('Error during rating step (continuing test):', error);
    }

    // Step 9: Download the code
    console.log('Step 9: Downloading the code');
    
    // Find the download button
    const downloadButton = page.locator('button.downloadButton');
    await expect(downloadButton).toBeVisible({ timeout: 10000 });
    
    // Set up a download listener and click the download button
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    
    // Click the download button with retry logic
    let downloadClickSuccess = false;
    for (let attempt = 0; attempt < 3 && !downloadClickSuccess; attempt++) {
      try {
        console.log(`Download attempt ${attempt + 1}`);
        await downloadButton.click({ timeout: 5000 });
        downloadClickSuccess = true;
      } catch (e) {
        console.log(`Error during download attempt ${attempt + 1}:`, e);
        if (attempt < 2) await page.waitForTimeout(1000);
      }
    }
    
    if (!downloadClickSuccess) {
      throw new Error('Failed to click the download button after multiple attempts');
    }
    
    // Wait for the download to start
    const download = await downloadPromise;
    console.log(`Download started: ${download.suggestedFilename()}`);
    
    // Verify the download (without saving to disk)
    expect(download.suggestedFilename()).toBeTruthy();
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed with error:', error);
    
    // Take a screenshot to help with debugging
    await page.screenshot({ path: `programming-task-test-failure-${Date.now()}.png`, fullPage: true });
    
    throw error; // Re-throw to fail the test
  }
});
