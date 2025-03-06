import { test, expect } from '@playwright/test';
import { LoginPage } from './loginPage';

test.setTimeout(180000); // 3 minutes timeout
test.describe.configure({ mode: 'parallel' });

test('should interact with discussion button and verify filtering and creating new question', async ({ page, isMobile }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goTo();
  await loginPage.validLogin();
  await expect(page).toHaveURL(/dashboard/);

  if (isMobile) {
    const rootMenuTab = page.locator('.mat-mdc-tab-labels .mdc-tab__text-label:has-text("root")');
    await rootMenuTab.click();

    const rootMenuItems = page.locator('.mat-mdc-cell .cell-container');
    const graphDiv = page.locator('.content.graph.mat-elevation-z8');
    const button = graphDiv.locator('button.mat-mdc-raised-button.mat-primary').first();

    await expect(graphDiv).toBeVisible();
    await expect(button).toBeVisible();

    const firstMenuItem = rootMenuItems.nth(0);
    await firstMenuItem.click();
    await button.click();
    await page.waitForTimeout(3000);

    const contentDiv = page.locator('.content.mat-elevation-z8').nth(1);

    const diskutierenButton = contentDiv.locator('button:has-text("Diskutieren")');
    await diskutierenButton.click();

    const contentContainer = contentDiv.locator('div.content-container');
    const listContainer = contentContainer.locator('.list-container.mat-elevation-z8');
    await expect(listContainer).toBeVisible();

    const discussionList = listContainer.locator('app-discussion-list-item.ng-star-inserted');
    const discussionListItems = await listContainer.locator('.question-box');
    const initialCount = await discussionListItems.count();

    // Locate and click the "raisedButton" inside the listContainer
    const raisedButton = listContainer.locator('button.mdc-button.mdc-button--raised.mat-mdc-raised-button');
    await expect(raisedButton).toBeVisible();
    await raisedButton.click(); // Click to trigger the popup

    // Wait for the app-discussion-precreation popup to appear
    const popup = page.locator('app-discussion-precreation.ng-star-inserted');
    await expect(popup).toBeVisible();

    // Click on the first mat-list-item in the popup
    const firstListItem = popup.locator('mat-list-item:nth-child(1)');
    await firstListItem.click();

    // Wait for the mat-mdc-dialog-surface (the dialog) to appear
    const dialogSurface = page.locator('app-discussion-creation[class="ng-star-inserted"]');
    await expect(dialogSurface).toBeVisible();

    // Locate the input field within dialogSurface by its placeholder attribute
    const titleInput = dialogSurface.locator('input[placeholder="Titel..."]');
    await titleInput.fill('new Q');

    // Wait for the iframe (Rich Text Area) to be visible and interact with it
    const editorFrame = page.frameLocator('iframe[title="Rich Text Area"]').locator('html');
    await editorFrame.locator('body#tinymce').waitFor({ state: 'visible', timeout: 10000 }); // Wait for iframe content to be visible
    await editorFrame.locator('body#tinymce').fill('Write question here for new Q!?'); // Fill the Rich Text Area

    // Click the "Erstellen" button, which opens a new page and closes the popup
    const erstellenButton = dialogSurface.locator('button.mdc-button.mdc-button--raised.mat-mdc-raised-button.mat-unthemed.mat-mdc-button-base', { hasText: 'Erstellen' });
    await expect(erstellenButton).toBeVisible({ timeout: 15000 });
    await expect(erstellenButton).toBeEnabled({ timeout: 15000 });

    // Click the "Erstellen" button, which should open a new page
    const newPagePromise = page.waitForEvent('popup');
    await erstellenButton.click({ timeout: 15000 });
    const newPage = await newPagePromise;

    // Wait for the new page to load without closing it
    await newPage.waitForLoadState();
    //const newUrl = expect(newPage.url()).toMatch(/http:\/\/localhost:4200\/discussion-view\/\d+/); // Match the new URL pattern
    
    // Get the new URL of the page
    // const newUrl = newPage.url(); // Capture the new URL of the opened page
    // await expect(newPage).toHaveURL(newUrl);

    const mainContainer = await newPage.waitForSelector('.main-container', { timeout: 100000 });
    expect(mainContainer).toBeTruthy();

    const elements = await newPage.locator('.main-container .content.mat-elevation-z8');
    const count = await elements.count();
    expect(count).toBe(3);

    for (let i = 0; i < count; i++) {
    const element = elements.nth(i);
    await expect(element).toBeVisible();

    const text = await element.textContent();
    // console.log(`Element ${i + 1}: ${text?.trim()}`);
    }

    const helpfulButton = newPage.locator('button.mat-mdc-tooltip-trigger.small-button').nth(0);
    const unhelpfulButton = await newPage.locator('button.mat-mdc-tooltip-trigger.small-button').nth(1);
    const countBox = await elements.nth(0).locator('.count-box');

    let initialCountValue = await countBox.textContent();
    initialCountValue = initialCountValue?.trim() ?? '0'; 

    console.log('Initial count value:', initialCountValue);

    for (let i = 0; i < 3; i++) {
    console.log(`Clicking helpful button ${i + 1} times...`);
    await helpfulButton.click();

    let currentCount = await countBox.textContent();
    currentCount = currentCount?.trim() ?? '0'; 
    console.log(`After helpful click ${i + 1}:`, currentCount);

    expect(currentCount).not.toBe(initialCountValue);
    initialCountValue = currentCount;
    }

    for (let i = 0; i < 3; i++) {
    console.log(`Clicking unhelpful button ${i + 1} times...`);
    await unhelpfulButton.click();

    let currentCount = await countBox.textContent();
    currentCount = currentCount?.trim() ?? '0'; 
    //console.log(`After unhelpful click ${i + 1}:`, currentCount);

    expect(currentCount).not.toBe(initialCountValue);
    initialCountValue = currentCount;
    }

    // const replyButton = newPage.locator('button', { hasText: 'Dem Beitrag antworten' });
    // const iframe = await newPage.locator('.tox-edit-area iframe');
    // const frame = await iframe.contentFrame();    
    // const sendButton = await newPage.getByRole('button', { name: 'Senden' });

     // Step 3: Create 3 comments and rate them differently
     for (let i = 1; i <= 3; i++) {
        const replyButton = newPage.locator('button', { hasText: 'Dem Beitrag antworten' });
        await replyButton.click();
        const iframe = await newPage.locator('.tox-edit-area iframe');
        const frame = await iframe.contentFrame();
        await frame.locator('body').type(`This is test comment ${i}.`);
        const sendButton = newPage.getByRole('button', { name: 'Senden' });
        await sendButton.waitFor({ state: 'visible' });
        await sendButton.click();
        await newPage.waitForTimeout(1000); // Ensure the comment is saved
      }
  
      // Step 4: Rate the comments differently
      for (let i = 0; i < 3; i++) {
        const helpfulButton = newPage.locator('button.mat-mdc-tooltip-trigger.small-button').nth(i * 2);
        const unhelpfulButton = newPage.locator('button.mat-mdc-tooltip-trigger.small-button').nth(i * 2 + 1);
        if (i % 2 === 0) {
          await helpfulButton.click(); // Rate odd comments as helpful
        } else {
          await unhelpfulButton.click(); // Rate even comments as unhelpful
        }
        await newPage.waitForTimeout(1000);
      }

        // Define locators for the headers
    const sortButton = newPage.getByRole('button', { name: /Sortiert nach:/ });

    // Utility to check if an array is sorted in ascending order
    const isSortedAscending = (array, parser) =>array.every((item, i, arr) => i === 0 || parser(arr[i - 1]) <= parser(item));

    // Utility to check if an array is sorted in descending order
    const isSortedDescending = (array, parser) => array.every((item, i, arr) => i === arr.length - 1 || parser(item) >= parser(arr[i + 1]));
    await newPage.waitForTimeout(600);

    const ariaSortElement = await newPage.locator('[aria-sort]'); 
    // Get the aria-sort attribute value
    const ariaSortValue = await ariaSortElement.getAttribute('aria-sort');
    // Assert the value is one of the expected options
    expect(['ascending', 'descending', 'none']).toContain(ariaSortValue);  
    
 
    const sortHeader = newPage.locator('.mat-sort-header-container'); // General selector for sorting headers 

    // Helper to determine sorting state
    async function getSortState(headerLocator) {
        const headerText = await headerLocator.locator('.mat-sort-header-content').innerText();
        const ariaSort = await headerLocator.getAttribute('aria-sort');
    
        console.log('Header text:', headerText);
        await sortButton.click();

        if (headerText.includes('Hilfreich')) {
        return ariaSort === 'none' || ariaSort === null
            ? 'Hilfreich Descending' // `none` =  descending
            : 'none';
        }
    
        if (headerText.includes('Datum')) {
        return ariaSort === 'ascending'
            ? 'Datum Ascending'
            : 'Datum Descending';
        }
    
        return 'none'; 
    }
    
    if (await sortHeader.isVisible()) {
        const sortState = await getSortState(sortHeader);
    
        console.log('Current sort state:', sortState);
    
        await sortHeader.click();
        await sortHeader.waitFor({ state: 'visible' }); 
        const newSortState = await getSortState(sortHeader);
    
        console.log('New sort state after click:', newSortState);
    
        if (newSortState.includes('Datum')) {
        console.log('Sorting by Datum...');
    
        // Extract rows with Datum information
        const rowsDatum = await newPage.locator('table tbody tr').evaluateAll((rows) =>
            rows.map((row) => row.querySelector('p:nth-child(4)')?.textContent?.trim())
        );
        // console.log('Rows sorted by Datum:', rowsDatum);
    
        // Preprocess "heute" into today's date
        const today = new Date();
        const todayFormatted = `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`;
        const preprocessedRowsDatum = rowsDatum.map((date) => (date === 'heute' ? todayFormatted : date));
        // console.log('Preprocessed Rows:', preprocessedRowsDatum);
    
        // Date parsing function (Move this up before it's used)
        const parseDate = (dateString) => {
            if (dateString === 'heute') {
                const today = new Date();
                return today; 
            }
            const [day, month, year] = dateString.split('.').map(Number);
            return new Date(year, month - 1, day);
        };
    
        // Sort the rows in descending order based on the Datum
        preprocessedRowsDatum.sort((a, b) => parseDate(b).getTime() - parseDate(a).getTime());
    
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
    
        // Additional Debugging Logs for Validation
        preprocessedRowsDatum.forEach((row, index, array) => {
            if (index > 0) {
                console.log(
                    `Comparing ${array[index - 1]} >= ${row}: ${parseDate(array[index - 1]).getTime() >= parseDate(row).getTime()}`
                );
            }
        });
    
        expect(isDescending).toBe(true);

        await sortButton.click();
        await newPage.waitForTimeout(600);

        } else if (newSortState.includes('Hilfreich')) {
        console.log('Starting Hilfreich sorting validation...');
    
        const rowsHilfreich = await newPage.locator('table tbody tr').evaluateAll((rows) =>
            rows.map((row) => row.querySelector('.count-box')?.textContent?.trim())
        );
    
        console.log('Rows sorted by Hilfreich:', rowsHilfreich);
    
        if (!rowsHilfreich || rowsHilfreich.length === 0) {
            throw new Error('No rows found for Hilfreich sorting');
        }
    
        const isDescending = newSortState.includes('Descending')
            ? isSortedDescending(rowsHilfreich, parseInt)
            : isSortedAscending(rowsHilfreich, parseInt);
    
        console.log('Sorting validation result for Hilfreich:', isDescending);
    
        try {
            expect(isDescending).toBe(true);
            console.log('Sorting validation passed for Hilfreich');
        } catch (error) {
            console.error('Sorting validation failed for Hilfreich:', error);
            throw error; 
        }
    
        console.log('Finished Hilfreich sorting validation...');
    }
    
    }
}
});


// // Alternate between sorting by "Datum" and "Hilfreich"
    // if (await hilfreichSortHeader.isVisible()) {
    //   console.log('Hilfreich header is visible.');
    //   const buttonHTML = await hilfreichSortHeader.evaluate((node) => node.outerHTML);
    //   console.log('Button HTML:', buttonHTML);

    
    //   let hilfreichSortState = await ariaSortValue;
    //   console.log('Hilfreich sort state:', hilfreichSortState);
    
    //   if (!hilfreichSortState || hilfreichSortState === 'none') {
    //     const rowsHilfreichDesc = await page.locator('table tbody tr').evaluateAll((rows) =>
    //       rows.map((row) => row.querySelector('.count-box')?.textContent?.trim())
    //     );
    
    //     console.log('Rows (descending):', rowsHilfreichDesc);
    //     expect(isSortedDescending(rowsHilfreichDesc, parseInt)).toBe(true);
    
    //     await hilfreichSortHeader.click();
    //     console.log('Clicked Hilfreich header ');
    //    }
        
    // } 
    
    // await page.waitForTimeout(1000);


    // if (await datumSortHeader.isVisible()) {
    //   console.log('Datum header is visible.');
        
    //   const datumSortState = await ariaSortValue;
    //   const buttonHTML = await datumSortHeader.evaluate((node) => node.outerHTML);
    //   console.log('Button HTML:', buttonHTML);

    //   console.log('Datum sort state:', datumSortState);
    
    //   if (!datumSortState || datumSortState === 'descending') {
    //     const rowsDatumDesc = await page.locator('table tbody tr').evaluateAll((rows) =>
    //       rows.map((row) => row.querySelector('p:nth-child(4)')?.textContent?.trim())
    //     );
    //     console.log('Rows for Datum (descending):', rowsDatumDesc);
    
    //     const isDesc = isSortedDescending(rowsDatumDesc, parseDate);
    //     console.log('Is sorted descending:', isDesc);
    //     expect(isDesc).toBe(true);
    
    //     await datumSortHeader.click();
    //   } else if (!datumSortState || datumSortState === 'ascending') {
    //     const rowsDatumAsc = await page.locator('table tbody tr').evaluateAll((rows) =>
    //       rows.map((row) => row.querySelector('p:nth-child(4)')?.textContent?.trim())
    //     );
    //     console.log('Rows for Datum (ascending):', rowsDatumAsc);
    
    //     const isAsc = isSortedAscending(rowsDatumAsc, parseDate);
    //     console.log('Is sorted ascending:', isAsc);
    //     expect(isAsc).toBe(true);
    
    //     await datumSortHeader.click();
    //   }
    // }  
    