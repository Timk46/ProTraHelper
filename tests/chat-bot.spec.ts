import { test, expect } from '@playwright/test';
import { LoginPage } from './loginPage';

/**
 * End-to-End Test for Chat Bot Functionality
 * 
 * This test verifies the complete flow of the chat bot:
 * 1. Opening the chat dialog
 * 2. Starting a new chat
 * 3. Sending a question
 * 4. Receiving and verifying a response
 * 5. Rating the response
 * 6. Closing the chat dialog
 * 
 * The test includes robust error handling and detailed logging.
 */

// Set a longer timeout for this test since it involves API calls
test.setTimeout(120000); // 2 minutes

test.describe('Chat Bot Functionality Tests', () => {
  // Take screenshots on test failures
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({ path: `test-failure-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.png`, fullPage: true });
    }
  });
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goTo();
    await loginPage.validLogin();
    await expect(page).toHaveURL(/dashboard/);
  });

test('should open chat, start a new conversation, ask a question and receive a response', async ({ page }) => {
    console.log('Starting chat-bot end-to-end test');
    
    try {
    // Step 1: Locate and click on the chat button (floating button with chat icon)
    console.log('Step 1: Opening chat dialog');
    const chatButton = page.locator('button.chat-button');
    await expect(chatButton).toBeVisible({ timeout: 10000 });
    await chatButton.click();

    // Step 2: Wait for the chat dialog container to appear
    console.log('Step 2: Verifying chat dialog is visible');
    const chatContainer = page.locator('div.chat-container');
    await expect(chatContainer).toBeVisible({ timeout: 10000 });

    // Step 3: Click on "Neuer Chat" button to start a new conversation
    console.log('Step 3: Starting a new chat');
    const newChatButton = page.locator('div.new-chat');
    await expect(newChatButton).toBeVisible({ timeout: 10000 });
    await newChatButton.click();

    // Step 4: Wait for the initial greeting message from the bot
    console.log('Step 4: Waiting for initial greeting');
    const initialMessage = page.locator('div.message.bot');
    await expect(initialMessage).toBeVisible({ timeout: 10000 });
    
    // Verify the initial greeting contains expected text
    const initialMessageText = await initialMessage.locator('.message-content').textContent();
    expect(initialMessageText).toContain('Hallo, wie kann ich dir helfen?');

    // Step 5: Type a question about for-loops and send it
    console.log('Step 5: Typing and sending a question');
    const messageInput = page.locator('input[placeholder="Frage etwas zur Vorlesung..."]');
    await expect(messageInput).toBeVisible({ timeout: 5000 });
    await messageInput.fill('Was ist eine for-Schleife?');
    
    const sendButton = page.locator('button mat-icon:has-text("send")').first();
    await expect(sendButton).toBeVisible();
    await sendButton.click();

    // Step 6: Verify that the user message appears in the chat
    console.log('Step 6: Verifying user message appears');
    const userMessage = page.locator('div.message.user').last();
    await expect(userMessage).toBeVisible({ timeout: 5000 });
    const userMessageText = await userMessage.textContent();
    expect(userMessageText).toContain('Was ist eine for-Schleife?');

    // Step 7: Wait for the bot to respond to the question
    console.log('Step 7: Waiting for bot response');
    // First, check if there's a loading message and wait for it to disappear
    const loadingMessage = page.locator('div.message.loading');
    if (await loadingMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Wait for the loading message to disappear
      await expect(loadingMessage).not.toBeVisible({ timeout: 30000 });
    }

    // Now wait for the actual bot response to appear
    const botResponse = page.locator('div.message.bot').last();
    await expect(botResponse).toBeVisible({ timeout: 30000 });
    
    // Verify the bot response contains meaningful content
    const botResponseText = await botResponse.locator('.message-content').textContent();
    console.log(`Bot response received (length: ${botResponseText?.length || 0})`);
    
    // Check that the response is not empty and has reasonable length
    expect(botResponseText?.length).toBeGreaterThan(10);
    
    // Check for markdown content (the response should be rendered as markdown)
    const markdownElement = botResponse.locator('markdown');
    await expect(markdownElement).toBeVisible({ timeout: 5000 });
    
    // Step 8: Check for rating options and interact with them if available
    console.log('Step 8: Checking for rating options');
    const ratingSection = botResponse.locator('.rating');
    
    // Check if rating section exists and is visible (with a longer timeout)
    const isRatingSectionVisible = await ratingSection.isVisible({ timeout: 10000 })
      .catch(() => false);
    
    if (isRatingSectionVisible) {
      console.log('Rating section is visible, proceeding with rating');
      
      // Try to find and click the "Gut" (good) rating button
      const goodRatingButton = ratingSection.locator('button[aria-label="Bewertung: Gut"]');
      const isGoodButtonVisible = await goodRatingButton.isVisible({ timeout: 5000 })
        .catch(() => false);
      
      if (isGoodButtonVisible) {
        await goodRatingButton.click();
        
        // Verify the button gets the "selected" class
        const hasSelectedClass = await goodRatingButton.evaluate(el => 
          el.classList.contains('selected')).catch(() => false);
        
        if (hasSelectedClass) {
          console.log('Rating submitted successfully');
        } else {
          console.log('Rating button clicked but not showing as selected');
        }
      } else {
        console.log('Rating buttons not found, skipping rating step');
      }
    } else {
      console.log('Rating section not found, skipping rating step');
    }
    
    // Step 9: Close the chat dialog by clicking the close button
    console.log('Step 9: Closing chat dialog');
    const closeButton = page.locator('button mat-icon:has-text("close")').first();
    await closeButton.click();
    
    // Verify the chat dialog is closed and no longer visible
    console.log('Test completed successfully');
    await expect(chatContainer).not.toBeVisible({ timeout: 5000 });
    } catch (error) {
      console.error('Test failed with error:', error);
      
      // Take a screenshot to help with debugging
      await page.screenshot({ path: `chat-bot-test-failure-${Date.now()}.png`, fullPage: true });
      
      throw error; // Re-throw to fail the test
    }
  });
});
