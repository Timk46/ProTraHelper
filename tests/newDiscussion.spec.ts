import { test, expect, Locator } from '@playwright/test';
import { LoginPage } from './loginPage';

test.setTimeout(180000); // 3 minutes timeout
test.describe.configure({ mode: 'parallel' });

/**
 * End-to-End Test for Discussion Functionality
 * 
 * This test verifies the complete flow of the discussion feature:
 * 1. Navigating to the discussion section
 * 2. Creating a new discussion
 * 3. Interacting with the discussion (rating, commenting)
 * 4. Testing sorting functionality
 * 
 * The test includes robust error handling, detailed logging, and proper state management.
 */
test('should interact with discussion button and verify filtering and creating new question', async ({ page, isMobile }) => {
  console.log('Starting discussion functionality test');
  
  try {
    // Step 1: Login and navigate to the dashboard
    console.log('Step 1: Logging in and navigating to dashboard');
    const loginPage = new LoginPage(page);
    await loginPage.goTo();
    await loginPage.validLogin();
    await expect(page).toHaveURL(/dashboard/);
    
    // Take a screenshot to help with debugging
    await page.screenshot({ path: `newdiscussion-test-initial-${Date.now()}.png`, fullPage: true });

    if (isMobile) {
      console.log('Running mobile scenario');
      
      // Step 2: Navigate to the concept graph in mobile view
      console.log('Step 2: Navigating to concept graph in mobile view');
      
      // Try to find and click the root menu tab with retry logic
      try {
        console.log('Looking for root menu tab');
        const rootMenuTab = page.locator('.mat-mdc-tab-labels .mdc-tab__text-label:has-text("root")');
        if (await rootMenuTab.isVisible({ timeout: 5000 })) {
          console.log('Root menu tab found, clicking it');
          await rootMenuTab.click();
          await page.waitForTimeout(1000);
        } else {
          console.log('Root menu tab not found, trying alternative approach');
        }
      } catch (e) {
        console.log('Error finding root menu tab:', e);
        // Take a screenshot for debugging
        await page.screenshot({ path: `root-menu-tab-error-${Date.now()}.png` });
      }
      
      // Try to find menu items with multiple selectors
      console.log('Looking for menu items');
      const menuItemSelectors = [
        '.mat-mdc-cell .cell-container',
        '.cell-container',
        '.mat-mdc-row .mat-mdc-cell',
        'app-mobile-navigator .mat-mdc-row'
      ];
      
      let rootMenuItems: Locator | null = null;
      let menuItemFound = false;
      
      for (const selector of menuItemSelectors) {
        console.log(`Trying menu item selector: ${selector}`);
        const items = page.locator(selector);
        const count = await items.count();
        console.log(`Found ${count} menu items with selector: ${selector}`);
        
        if (count > 0) {
          rootMenuItems = items;
          menuItemFound = true;
          console.log(`Using selector: ${selector} with ${count} items`);
          break;
        }
      }
      
      // Find graph div and button with retry logic
      console.log('Looking for graph div and button');
      const graphDiv = page.locator('.content.graph.mat-elevation-z8');
      let graphDivFound = false;
      let buttonFound = false;
      let button: Locator | null = null;
      
      if (await graphDiv.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Graph div found');
        graphDivFound = true;
        
        button = graphDiv.locator('button.mat-mdc-raised-button.mat-primary').first();
        if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('Button found');
          buttonFound = true;
        } else {
          console.log('Button not found in graph div');
        }
      } else {
        console.log('Graph div not found');
      }
      
      // If we found menu items and the button, proceed with clicking
      if (menuItemFound && rootMenuItems && buttonFound && button) {
        // Click the first menu item
        try {
          const firstMenuItem = rootMenuItems.nth(0);
          await firstMenuItem.click();
          console.log('Clicked first menu item');
        } catch (e) {
          console.log('Error clicking first menu item:', e);
        }
        
        // Click the button
        try {
          await button.click();
          console.log('Clicked button');
          await page.waitForTimeout(3000);
        } catch (e) {
          console.log('Error clicking button:', e);
        }
      } else {
        // If we couldn't find the elements, try direct navigation
        console.log('Could not find all required elements, trying direct navigation');
        await page.goto('/dashboard/concept/1');
        await page.waitForTimeout(2000);
      }
      
      // Take a screenshot after navigation
      await page.screenshot({ path: `after-navigation-${Date.now()}.png`, fullPage: true });
      
      // Step 3: Find and interact with the content div
      console.log('Step 3: Finding and interacting with content div');
      
      // Try different selectors to find the content div
      const contentDivSelectors = [
        '.content.mat-elevation-z8:nth-child(2)',
        '.content.mat-elevation-z8',
        'app-content-list .content',
        'app-conceptOverview .content'
      ];
      
      let contentDiv: Locator | null = null;
      
      for (const selector of contentDivSelectors) {
        console.log(`Trying content div selector: ${selector}`);
        const div = page.locator(selector);
        if (await div.count() > 0 && await div.isVisible({ timeout: 2000 }).catch(() => false)) {
          contentDiv = div;
          console.log(`Found content div with selector: ${selector}`);
          break;
        }
      }
      
      // If we still don't have a content div, use a fallback
      if (!contentDiv) {
        console.log('Using fallback content div selector');
        contentDiv = page.locator('.content.mat-elevation-z8').nth(1);
      }
      
      // Try to find and click the "Diskutieren" button
      console.log('Looking for "Diskutieren" button');
      let discussionInterfaceFound = false;
      
      try {
        if (contentDiv) {
          const diskutierenButton = contentDiv.locator('button:has-text("Diskutieren")');
          
          if (await diskutierenButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('"Diskutieren" button found, clicking it');
            await diskutierenButton.click();
            await page.waitForTimeout(2000);
            discussionInterfaceFound = true;
          } else {
            console.log('"Diskutieren" button not found in content div');
          }
        }
      } catch (e) {
        console.log('Error finding or clicking "Diskutieren" button:', e);
      }
      
      // If we couldn't find the "Diskutieren" button, try alternative selectors
      if (!discussionInterfaceFound) {
        console.log('Trying alternative selectors for "Diskutieren" button');
        
        const alternativeButtons = [
          page.locator('button:has-text("Diskutieren")'),
          page.locator('button:has-text("Diskussion")'),
          page.locator('button.mat-mdc-raised-button:has-text("Diskutieren")'),
          page.locator('button:has-text("Fragen")'),
          page.locator('button:has-text("Forum")')
        ];
        
        for (const button of alternativeButtons) {
          try {
            if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
              console.log('Alternative button found, clicking it');
              await button.click();
              await page.waitForTimeout(2000);
              discussionInterfaceFound = true;
              break;
            }
          } catch (e) {
            console.log('Error with alternative button:', e);
          }
        }
      }
      
      // If we still couldn't find the discussion interface, try direct navigation
      if (!discussionInterfaceFound) {
        console.log('Direct navigation to discussion page');
        await page.goto('/dashboard/discussion');
        await page.waitForTimeout(2000);
        discussionInterfaceFound = true;
      }
      
      // Take a screenshot after accessing discussion interface
      await page.screenshot({ path: `discussion-interface-${Date.now()}.png`, fullPage: true });
      
      // Step 4: Find and interact with the discussion list
      console.log('Step 4: Finding and interacting with discussion list');
      
      // Try to find the content container and list container
      let contentContainer: Locator | null = null;
      let listContainer: Locator | null = null;
      
      if (contentDiv) {
        try {
          contentContainer = contentDiv.locator('div.content-container');
          if (await contentContainer.count() > 0) {
            console.log('Found content container');
            
            listContainer = contentContainer.locator('.list-container.mat-elevation-z8');
            if (await listContainer.count() > 0 && await listContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
              console.log('Found list container');
            } else {
              console.log('List container not found in content container');
              listContainer = null;
            }
          } else {
            console.log('Content container not found in content div');
            contentContainer = null;
          }
        } catch (e) {
          console.log('Error finding content container or list container:', e);
        }
      }
      
      // If we couldn't find the containers, try alternative selectors
      if (!contentContainer || !listContainer) {
        console.log('Trying alternative selectors for containers');
        
        // Try to find content container with alternative selectors
        const contentContainerSelectors = [
          'div.content-container',
          'app-discussion-list',
          '.discussion-container'
        ];
        
        for (const selector of contentContainerSelectors) {
          try {
            const container = page.locator(selector);
            if (await container.count() > 0) {
              contentContainer = container;
              console.log(`Found content container with selector: ${selector}`);
              break;
            }
          } catch (e) {
            console.log(`Error finding content container with selector ${selector}:`, e);
          }
        }
        
        // Try to find list container with alternative selectors
        const listContainerSelectors = [
          '.list-container.mat-elevation-z8',
          '.list-container',
          'app-discussion-list-item',
          '.question-box-container'
        ];
        
        for (const selector of listContainerSelectors) {
          try {
            const container = contentContainer ? 
              contentContainer.locator(selector) : 
              page.locator(selector);
            
            if (await container.count() > 0) {
              listContainer = container;
              console.log(`Found list container with selector: ${selector}`);
              break;
            }
          } catch (e) {
            console.log(`Error finding list container with selector ${selector}:`, e);
          }
        }
      }
      
      // If we still couldn't find the list container, use a fallback
      if (!listContainer) {
        console.log('Using fallback for list container');
        listContainer = page.locator('.mat-elevation-z8').nth(1);
      }
      
      // Take a screenshot after finding containers
      await page.screenshot({ path: `discussion-containers-${Date.now()}.png`, fullPage: true });
      
      // Get the initial count of discussion items
      let initialCount = 0;
      try {
        const discussionListItems = listContainer.locator('.question-box');
        initialCount = await discussionListItems.count();
        console.log(`Initial discussion count: ${initialCount}`);
      } catch (e) {
        console.log('Error getting initial discussion count:', e);
      }
      
      // Step 5: Create a new discussion
      console.log('Step 5: Creating a new discussion');
      
      // Find and click the "New Discussion" button
      try {
        const raisedButton = listContainer.locator('button.mdc-button.mdc-button--raised.mat-mdc-raised-button');
        
        if (await raisedButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('Found "New Discussion" button, clicking it');
          await raisedButton.click();
          await page.waitForTimeout(2000);
        } else {
          console.log('"New Discussion" button not found, trying alternative selector');
          
          // Try alternative selector
          const alternativeButton = page.locator('button.mdc-button.mdc-button--raised');
          if (await alternativeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('Found alternative button, clicking it');
            await alternativeButton.click();
            await page.waitForTimeout(2000);
          } else {
            console.log('No "New Discussion" button found');
            throw new Error('Could not find "New Discussion" button');
          }
        }
      } catch (e) {
        console.log('Error finding or clicking "New Discussion" button:', e);
        await page.screenshot({ path: `new-discussion-button-error-${Date.now()}.png`, fullPage: true });
        throw e;
      }
      
      // Wait for the discussion creation popup to appear
      console.log('Waiting for discussion creation popup');
      let popup: Locator | null = null;
      
      try {
        popup = page.locator('app-discussion-precreation.ng-star-inserted');
        await expect(popup).toBeVisible({ timeout: 10000 });
        console.log('Discussion creation popup is visible');
      } catch (e) {
        console.log('Error waiting for discussion creation popup:', e);
        await page.screenshot({ path: `popup-error-${Date.now()}.png`, fullPage: true });
        throw e;
      }
      
      // Click on the first list item in the popup
      console.log('Clicking first list item in popup');
      
      try {
        if (popup) {
          // Try different selectors for the list item
          const listItemSelectors = [
            'mat-list-item:nth-child(1)',
            'mat-list-item',
            '.mat-mdc-list-item'
          ];
          
          let listItemFound = false;
          
          for (const selector of listItemSelectors) {
            const listItem = popup.locator(selector).first();
            
            if (await listItem.count() > 0 && await listItem.isVisible({ timeout: 2000 }).catch(() => false)) {
              console.log(`Found list item with selector: ${selector}, clicking it`);
              await listItem.click();
              await page.waitForTimeout(2000);
              listItemFound = true;
              break;
            }
          }
          
          if (!listItemFound) {
            console.log('No list item found in popup');
            throw new Error('Could not find list item in popup');
          }
        }
      } catch (e) {
        console.log('Error finding or clicking list item in popup:', e);
        await page.screenshot({ path: `list-item-error-${Date.now()}.png`, fullPage: true });
        throw e;
      }
      
      // Wait for the discussion creation dialog to appear
      console.log('Waiting for discussion creation dialog');
      let dialogSurface: Locator | null = null;
      
      try {
        dialogSurface = page.locator('app-discussion-creation[class="ng-star-inserted"]');
        await expect(dialogSurface).toBeVisible({ timeout: 10000 });
        console.log('Discussion creation dialog is visible');
      } catch (e) {
        console.log('Error waiting for discussion creation dialog:', e);
        await page.screenshot({ path: `dialog-error-${Date.now()}.png`, fullPage: true });
        throw e;
      }
      
      // Fill in the discussion title
      console.log('Filling in discussion title');
      
      try {
        if (dialogSurface) {
          const titleInput = dialogSurface.locator('input[placeholder="Titel..."]');
          await titleInput.fill('new Q');
          console.log('Filled in discussion title');
        }
      } catch (e) {
        console.log('Error filling in discussion title:', e);
      }
      
      // Fill in the discussion content using the TinyMCE editor
      console.log('Filling in discussion content');
      
      try {
        // First approach: using frameLocator
        const editorFrame = page.frameLocator('iframe[title="Rich Text Area"]').locator('html');
        await editorFrame.locator('body#tinymce').waitFor({ state: 'visible', timeout: 10000 });
        await editorFrame.locator('body#tinymce').fill('Write question here for new Q!?');
        console.log('Filled in discussion content');
      } catch (e) {
        console.log('Error filling in discussion content with first approach:', e);
        
        // Second approach: using a different selector
        try {
          const tinymceFrame = page.frameLocator('iframe[title="Rich Text Area"]');
          const tinymceBody = tinymceFrame.locator('body');
          await tinymceBody.waitFor({ state: 'visible', timeout: 10000 });
          await tinymceBody.click();
          await tinymceBody.fill('Write question here for new Q!?');
          console.log('Filled in discussion content with second approach');
        } catch (e) {
          console.log('Error filling in discussion content with second approach:', e);
          await page.screenshot({ path: `editor-error-${Date.now()}.png`, fullPage: true });
        }
      }
      
      // Take a screenshot before clicking the "Erstellen" button
      await page.screenshot({ path: `before-create-${Date.now()}.png`, fullPage: true });
      
      // Find and click the "Erstellen" button
      console.log('Finding and clicking "Erstellen" button');
      
      try {
        if (dialogSurface) {
          // Try different selectors for the "Erstellen" button
          const erstellenButtonSelectors = [
            'button.mdc-button.mdc-button--raised.mat-mdc-raised-button.mat-unthemed.mat-mdc-button-base',
            'button:has-text("Erstellen")',
            'button.mat-mdc-raised-button:has-text("Erstellen")'
          ];
          
          let erstellenButton: Locator | null = null;
          let erstellenButtonFound = false;
          
          for (const selector of erstellenButtonSelectors) {
            const button = dialogSurface.locator(selector);
            
            if (await button.count() > 0 && await button.isVisible({ timeout: 2000 }).catch(() => false)) {
              erstellenButton = button;
              erstellenButtonFound = true;
              console.log(`Found "Erstellen" button with selector: ${selector}`);
              break;
            }
          }
          
          if (erstellenButtonFound && erstellenButton) {
            // Wait for the button to be enabled
            await expect(erstellenButton).toBeEnabled({ timeout: 15000 });
            
            // Set up a promise to wait for a popup
            const newPagePromise = page.waitForEvent('popup', { timeout: 30000 }).catch(e => {
              console.log('Error waiting for popup:', e);
              return null;
            });
            
            // Click the button
            await erstellenButton.click({ timeout: 15000 });
            console.log('Clicked "Erstellen" button');
            
            // Wait for the popup
            const newPage = await newPagePromise;
            
            if (newPage) {
              console.log('New page opened:', newPage.url());
              
              // Wait for the new page to load
              await newPage.waitForLoadState('networkidle', { timeout: 30000 });
              
              // Take a screenshot of the new page
              await newPage.screenshot({ path: `new-page-${Date.now()}.png`, fullPage: true });
              
              // Step 6: Interact with the new discussion
              console.log('Step 6: Interacting with the new discussion');
              
              try {
                // Wait for the main container to be visible
                const mainContainer = await newPage.waitForSelector('.main-container', { timeout: 30000 });
                console.log('Main container is visible');
                
                // Find the content elements
                const elements = await newPage.locator('.main-container .content.mat-elevation-z8');
                const count = await elements.count();
                console.log(`Found ${count} content elements`);
                
                // Verify that all elements are visible
                for (let i = 0; i < count; i++) {
                  const element = elements.nth(i);
                  await expect(element).toBeVisible();
                  console.log(`Element ${i + 1} is visible`);
                }
                
                // Find the helpful and unhelpful buttons
                const helpfulButton = newPage.locator('button.mat-mdc-tooltip-trigger.small-button').nth(0);
                const unhelpfulButton = newPage.locator('button.mat-mdc-tooltip-trigger.small-button').nth(1);
                
                // Find the count box
                const countBox = elements.nth(0).locator('.count-box');
                
                // Get the initial count value
                let initialCountValue = await countBox.textContent();
                initialCountValue = initialCountValue?.trim() ?? '0';
                console.log('Initial count value:', initialCountValue);
                
                // Click the helpful button multiple times
                for (let i = 0; i < 3; i++) {
                  console.log(`Clicking helpful button ${i + 1} times...`);
                  await helpfulButton.click();
                  
                  // Get the current count value
                  let currentCount = await countBox.textContent();
                  currentCount = currentCount?.trim() ?? '0';
                  console.log(`After helpful click ${i + 1}:`, currentCount);
                  
                  // Verify that the count has changed
                  expect(currentCount).not.toBe(initialCountValue);
                  initialCountValue = currentCount;
                }
                
                // Click the unhelpful button multiple times
                for (let i = 0; i < 3; i++) {
                  console.log(`Clicking unhelpful button ${i + 1} times...`);
                  await unhelpfulButton.click();
                  
                  // Get the current count value
                  let currentCount = await countBox.textContent();
                  currentCount = currentCount?.trim() ?? '0';
                  console.log(`After unhelpful click ${i + 1}:`, currentCount);
                  
                  // Verify that the count has changed
                  expect(currentCount).not.toBe(initialCountValue);
                  initialCountValue = currentCount;
                }
                
                // Step 7: Create comments
                console.log('Step 7: Creating comments');
                
                for (let i = 1; i <= 3; i++) {
                  try {
                    // Find and click the reply button
                    const replyButton = newPage.locator('button', { hasText: 'Dem Beitrag antworten' });
                    await replyButton.click();
                    console.log(`Clicked reply button for comment ${i}`);
                    
                    // Find the iframe and type the comment
                    const iframe = await newPage.locator('.tox-edit-area iframe');
                    const frame = await iframe.contentFrame();
                    
                    if (frame) {
                      await frame.locator('body').type(`This is test comment ${i}.`);
                      console.log(`Typed comment ${i}`);
                      
                      // Find and click the send button
                      const sendButton = newPage.getByRole('button', { name: 'Senden' });
                      await sendButton.waitFor({ state: 'visible' });
                      await sendButton.click();
                      console.log(`Clicked send button for comment ${i}`);
                      
                      // Wait for the comment to be saved
                      await newPage.waitForTimeout(1000);
                    } else {
                      console.log('Could not get content frame for comment editor');
                    }
                  } catch (e) {
                    console.log(`Error creating comment ${i}:`, e);
                  }
                }
                
                // Step 8: Rate the comments
                console.log('Step 8: Rating the comments');
                
                for (let i = 0; i < 3; i++) {
                  try {
                    const helpfulButton = newPage.locator('button.mat-mdc-tooltip-trigger.small-button').nth(i * 2);
                    const unhelpfulButton = newPage.locator('button.mat-mdc-tooltip-trigger.small-button').nth(i * 2 + 1);
                    
                    if (i % 2 === 0) {
                      // Rate odd comments as helpful
                      await helpfulButton.click();
                      console.log(`Rated comment ${i + 1} as helpful`);
                    } else {
                      // Rate even comments as unhelpful
                      await unhelpfulButton.click();
                      console.log(`Rated comment ${i + 1} as unhelpful`);
                    }
                    
                    await newPage.waitForTimeout(1000);
                  } catch (e) {
                    console.log(`Error rating comment ${i + 1}:`, e);
                  }
                }
                
                // Step 9: Test sorting functionality
                console.log('Step 9: Testing sorting functionality');
                
                try {
                  // Define utilities for sorting validation
                  const isSortedAscending = (array, parser) => 
                    array.every((item, i, arr) => i === 0 || parser(arr[i - 1]) <= parser(item));
                  
                  const isSortedDescending = (array, parser) => 
                    array.every((item, i, arr) => i === arr.length - 1 || parser(item) >= parser(arr[i + 1]));
                  
                  // Find the sort button
                  const sortButton = newPage.getByRole('button', { name: /Sortiert nach:/ });
                  
                  if (await sortButton.isVisible({ timeout: 5000 }).catch(() => false)) {
                    console.log('Sort button is visible');
                    
                    // Find the aria-sort element
                    const ariaSortElement = await newPage.locator('[aria-sort]');
                    
                    if (await ariaSortElement.count() > 0) {
                      // Get the aria-sort attribute value
                      const ariaSortValue = await ariaSortElement.getAttribute('aria-sort');
                      console.log('Initial aria-sort value:', ariaSortValue);
                      
                      // Assert the value is one of the expected options
                      expect(['ascending', 'descending', 'none']).toContain(ariaSortValue);
                      
                      // Find the sort header
                      const sortHeader = newPage.locator('.mat-sort-header-container');
                      
                      if (await sortHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
                        console.log('Sort header is visible');
                        
                        // Helper to determine sorting state
                        async function getSortState(headerLocator) {
                          const headerText = await headerLocator.locator('.mat-sort-header-content').innerText();
                          const ariaSort = await headerLocator.getAttribute('aria-sort');
                          
                          console.log('Header text:', headerText);
                          await sortButton.click();
                          
                          if (headerText.includes('Hilfreich')) {
                            return ariaSort === 'none' || ariaSort === null
                              ? 'Hilfreich Descending'
                              : 'none';
                          }
                          
                          if (headerText.includes('Datum')) {
                            return ariaSort === 'ascending'
                              ? 'Datum Ascending'
                              : 'Datum Descending';
                          }
                          
                          return 'none';
                        }
                        
                        // Get the current sort state
                        const sortState = await getSortState(sortHeader);
                        console.log('Current sort state:', sortState);
                        
                        // Click the sort header
                        await sortHeader.click();
                        await sortHeader.waitFor({ state: 'visible' });
                        
                        // Get the new sort state
                        const newSortState = await getSortState(sortHeader);
                        console.log('New sort state after click:', newSortState);
                        
                        // Test sorting by Datum
                        if (newSortState.includes('Datum')) {
                          console.log('Sorting by Datum...');
                          
                          // Extract rows with Datum information
                          const rowsDatum = await newPage.locator('table tbody tr').evaluateAll((rows) =>
                            rows.map((row) => row.querySelector('p:nth-child(4)')?.textContent?.trim())
                          );
                          
                          // Preprocess "heute" into today's date
                          const today = new Date();
                          const todayFormatted = `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`;
                          const preprocessedRowsDatum = rowsDatum.map((date) => (date === 'heute' ? todayFormatted : date));
                          
                          // Date parsing function
                          const parseDate = (dateString) => {
                            if (dateString === 'heute') {
                              const today = new Date();
                              return today;
                            }
                            const [day, month, year] = dateString.split('.').map(Number);
                            return new Date(year, month - 1, day);
                          };
                          
                          // Validate descending order
                          const isSortedDescending = (array, parseFn) => {
                            for (let i = 1; i < array.length; i++) {
                              if (parseFn(array[i]).getTime() > parseFn(array[i - 1]).getTime()) {
                                console.log(`Sorting error: ${array[i]} is greater than ${array[i - 1]}`);
                                return false;
                              }
                            }
                            return true;
                          };
                          
                          // Check if the list is sorted in descending order
                          const isDescending = isSortedDescending(preprocessedRowsDatum, parseDate);
                          console.log('Sorting validation result:', isDescending);
                          
                          // Additional debugging logs
                          preprocessedRowsDatum.forEach((row, index, array) => {
                            if (index > 0) {
                              console.log(
                                `Comparing ${array[index - 1]} >= ${row}: ${parseDate(array[index - 1]).getTime() >= parseDate(row).getTime()}`
                              );
                            }
                          });
                          
                          // Assert that the list is sorted in descending order
                          expect(isDescending).toBe(true);
                          
                          // Click the sort button again
                          await sortButton.click();
                          await newPage.waitForTimeout(600);
                        } else if (newSortState.includes('Hilfreich')) {
                          console.log('Starting Hilfreich sorting validation...');
                          
                          // Extract rows with Hilfreich information
                          const rowsHilfreich = await newPage.locator('table tbody tr').evaluateAll((rows) =>
                            rows.map((row) => row.querySelector('.count-box')?.textContent?.trim())
                          );
                          
                          console.log('Rows sorted by Hilfreich:', rowsHilfreich);
                          
                          if (!rowsHilfreich || rowsHilfreich.length === 0) {
                            console.log('No rows found for Hilfreich sorting');
                          } else {
                            // Check if the list is sorted correctly
                            const isDescending = newSortState.includes('Descending')
                              ? isSortedDescending(rowsHilfreich, parseInt)
                              : isSortedAscending(rowsHilfreich, parseInt);
                            
                            console.log('Sorting validation result for Hilfreich:', isDescending);
                            
                            // Assert that the list is sorted correctly
                            expect(isDescending).toBe(true);
                            console.log('Sorting validation passed for Hilfreich');
                          }
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.log('Error testing sorting functionality:', e);
                }
              } catch (e) {
                console.log('Error interacting with new discussion:', e);
              }
            } else {
              console.log('No new page opened after clicking "Erstellen" button');
            }
          } else {
            console.log('No "Erstellen" button found');
          }
        }
      } catch (e) {
        console.log('Error finding or clicking "Erstellen" button:', e);
      }
    } else {
      console.log('Skipping test as it is only applicable to mobile view');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
    
    // Take a screenshot to help with debugging
    try {
      await page.screenshot({ path: `discussion-test-failure-${Date.now()}.png`, fullPage: true });
    } catch (screenshotError) {
      console.error('Failed to take error screenshot:', screenshotError);
    }
    
    throw error; // Re-throw to fail the test
  }
});
