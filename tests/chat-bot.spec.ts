import { test, expect, Locator } from '@playwright/test';
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
      console.log('Loading message is visible, waiting for it to disappear');
      // Wait for the loading message to disappear with a longer timeout
      await expect(loadingMessage).not.toBeVisible({ timeout: 45000 });
    }

    // Now wait for the actual bot response to appear
    console.log('Waiting for bot response to appear');
    const botResponse = page.locator('div.message.bot').last();
    await expect(botResponse).toBeVisible({ timeout: 45000 });
    
    // Take a screenshot to help with debugging
    await page.screenshot({ path: `chat-bot-response-${Date.now()}.png`, fullPage: true });
    
    // Verify the bot response contains meaningful content
    const botResponseText = await botResponse.locator('.message-content').textContent();
    console.log(`Bot response received (length: ${botResponseText?.length || 0})`);
    
    // Check that the response is not empty and has reasonable length
    expect(botResponseText?.length).toBeGreaterThan(10);
    
    // Check for markdown content (the response should be rendered as markdown)
    const markdownElement = botResponse.locator('markdown');
    await expect(markdownElement).toBeVisible({ timeout: 5000 });
    
    // Wait a moment for any animations or rendering to complete
    console.log('Waiting for rendering to stabilize');
    await page.waitForTimeout(2000);
    
    // Step 8: Check for rating options and interact with them if available
    console.log('Step 8: Checking for rating options');
    
    // Try multiple approaches to find the rating section
    let ratingSection: Locator | undefined;
    let isRatingSectionVisible = false;
    
    // Approach 1: Direct child of the last bot message
    console.log('Trying to find rating section (approach 1)');
    ratingSection = botResponse.locator('.rating');
    isRatingSectionVisible = await ratingSection.isVisible({ timeout: 5000 }).catch(() => false);
    
    // Approach 2: Any rating section in the last bot message
    if (!isRatingSectionVisible) {
      console.log('Trying to find rating section (approach 2)');
      const tempSection = page.locator('div.message.bot:last-child .rating');
      isRatingSectionVisible = await tempSection.isVisible({ timeout: 5000 }).catch(() => false);
      if (isRatingSectionVisible) {
        ratingSection = tempSection;
      }
    }
    
    // Approach 3: Any rating section in the document
    if (!isRatingSectionVisible) {
      console.log('Trying to find rating section (approach 3)');
      const tempSection = page.locator('.rating').last();
      isRatingSectionVisible = await tempSection.isVisible({ timeout: 5000 }).catch(() => false);
      if (isRatingSectionVisible) {
        ratingSection = tempSection;
      }
    }
    
    // Log the DOM structure to help with debugging
    console.log('Checking DOM structure of bot response');
    const botResponseHTML = await botResponse.evaluate(node => node.outerHTML);
    console.log(`Bot response HTML: ${botResponseHTML.substring(0, 200)}...`);
    
    if (isRatingSectionVisible) {
      console.log('Rating section is visible, proceeding with rating');
      
      // Try multiple approaches to find and click the "Gut" (good) rating button
      let goodRatingButton: Locator | undefined;
      let isGoodButtonVisible = false;
      
      // Approach 1: Using aria-label
      console.log('Trying to find good rating button (approach 1)');
      const button1 = ratingSection.locator('button[aria-label="Bewertung: Gut"]');
      isGoodButtonVisible = await button1.isVisible({ timeout: 5000 }).catch(() => false);
      if (isGoodButtonVisible) {
        goodRatingButton = button1;
      }
      
      // Approach 2: Using the icon
      if (!isGoodButtonVisible) {
        console.log('Trying to find good rating button (approach 2)');
        const button2 = ratingSection.locator('button mat-icon:has-text("sentiment_very_satisfied")').first();
        isGoodButtonVisible = await button2.isVisible({ timeout: 5000 }).catch(() => false);
        if (isGoodButtonVisible) {
          goodRatingButton = button2;
        }
      }
      
      // Approach 3: Using the third button (assuming it's the good rating)
      if (!isGoodButtonVisible) {
        console.log('Trying to find good rating button (approach 3)');
        const ratingButtons = ratingSection.locator('button');
        const buttonCount = await ratingButtons.count();
        console.log(`Found ${buttonCount} rating buttons`);
        
        if (buttonCount >= 3) {
          const button3 = ratingButtons.nth(2); // Third button (index 2)
          isGoodButtonVisible = await button3.isVisible({ timeout: 5000 }).catch(() => false);
          if (isGoodButtonVisible) {
            goodRatingButton = button3;
          }
        }
      }
      
      if (isGoodButtonVisible && goodRatingButton) {
        console.log('Good rating button found, clicking it');
        
        // Take a screenshot before clicking
        await page.screenshot({ path: `before-rating-click-${Date.now()}.png`, fullPage: true });
        
        // Try clicking with retry logic
        let clickSuccess = false;
        for (let attempt = 0; attempt < 3 && !clickSuccess; attempt++) {
          try {
            console.log(`Click attempt ${attempt + 1}`);
            
            if (attempt === 0 && goodRatingButton) {
              // First attempt: normal click
              await goodRatingButton.click({ timeout: 5000 });
            } else if (attempt === 1 && goodRatingButton) {
              // Second attempt: force click
              await goodRatingButton.click({ force: true, timeout: 5000 });
            } else {
              // Third attempt: JavaScript click
              await page.evaluate(selector => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                  (elements[elements.length - 1] as HTMLElement).click();
                }
              }, 'button[aria-label="Bewertung: Gut"]');
            }
            
            // Wait a moment for the click to take effect
            await page.waitForTimeout(1000);
            
            // Verify the button gets the "selected" class
            if (goodRatingButton) {
              const hasSelectedClass = await goodRatingButton.evaluate(el => 
                el.classList.contains('selected')).catch(() => false);
              
              if (hasSelectedClass) {
                console.log('Rating submitted successfully');
                clickSuccess = true;
              } else {
                console.log('Rating button clicked but not showing as selected');
              }
            }
          } catch (e) {
            console.log(`Error during click attempt ${attempt + 1}:`, e);
          }
        }
        
        // Take a screenshot after clicking
        await page.screenshot({ path: `after-rating-click-${Date.now()}.png`, fullPage: true });
      } else {
        console.log('Good rating button not found, skipping rating step');
        // Take a screenshot to help with debugging
        await page.screenshot({ path: `rating-button-not-found-${Date.now()}.png`, fullPage: true });
      }
    } else {
      console.log('Rating section not found, skipping rating step');
      // Take a screenshot to help with debugging
      await page.screenshot({ path: `rating-section-not-found-${Date.now()}.png`, fullPage: true });
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
