import { test, expect } from '@playwright/test';
import { LoginPage } from './loginPage'; //

test.setTimeout(180000); // 1 minute
test.describe.configure({mode:'parallel'})
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

    // Verify the appearance of the app-discussion-filter component
    const discussionFilter = contentContainer.locator('app-discussion-filter[ng-reflect-active-concept-node-id="2"]');
    await expect(discussionFilter).toBeVisible();

    // Click the "Filter auswählen" button
    const filterButton = discussionFilter.locator('button:has-text("Filter auswählen")');
    await filterButton.click();

    // Verify the appearance of .fade-in-out.active and its elements
    const fadeInOutDiv = contentDiv.locator('.fade-in-out.active');
    await expect(fadeInOutDiv).toBeVisible();
    await page.waitForTimeout(3000);

    
    // Verify dropdown menu "Abschnittskarte", text field, checkbox, and button "Wählen"
    const dropdownMenu = fadeInOutDiv.locator('div').filter({ hasText: /^Abschnittskarte$/ }).first();
    const titleTextField = fadeInOutDiv.locator('input[placeholder="Bitte eingeben..."]');
    const questionCheckbox = fadeInOutDiv.locator('#mat-mdc-checkbox-1 div').filter({ hasText: 'Frage als \'geklärt\'' });
    const chooseButton = fadeInOutDiv.locator('button:has-text("Wählen")');

    await expect(dropdownMenu).toBeVisible();
    await page.waitForTimeout(300);

    await expect(titleTextField).toBeVisible();
    await page.waitForTimeout(300);

    await expect(questionCheckbox).toBeVisible();
    await page.waitForTimeout(300);

    await expect(chooseButton).toBeVisible();
    await page.waitForTimeout(300);


    // Select "Wasserfallmodell" in dropdown, enter text, and click "Wählen"
    await dropdownMenu.click();
    await page.getByText('Wasserfallmodell', { exact: true }).nth(0).click();
    await titleTextField.fill('test Q2');
    await chooseButton.click();
    await page.waitForTimeout(600);
    // Inside contentContainer, locate the list container

    // Check if the message "Zu diesem Thema/Filter wurden keine Beiträge gefunden" exists
    const noPostsMessage = contentContainer.locator('text=Zu diesem Thema/Filter wurden keine Beiträge gefunden');

    // If the message exists, handle the case where no posts are found
    if (await noPostsMessage.isVisible()) {
      console.log('No posts found for this topic/filter.');
    } else {    
      await expect(discussionListItems.first()).toBeVisible();
    }

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

    const tinymceFrame = page.frameLocator('iframe[title="Rich Text Area"]');
    const tinymceBody = tinymceFrame.locator('body');
    await tinymceBody.waitFor({ state: 'visible', timeout: 10000 }); // wait until the editor is ready
    await tinymceBody.click(); // set focus inside the editor
    await tinymceBody.fill('Write question here for newnewnew Q!?'); // fill the content
    await page.waitForTimeout(800);

    // Wait for the iframe (Rich Text Area) to be visible and interact with it
    const editorFrame = page.frameLocator('iframe[title="Rich Text Area"]').locator('html');
    await editorFrame.locator('body#tinymce').waitFor({ state: 'visible', timeout: 10000 }); // Wait for iframe content to be visible
    await editorFrame.locator('body#tinymce').fill('input text for discussion box'); // Fill the Rich Text Area
    await page.waitForTimeout(800);
    // Click the "Erstellen" button, which opens a new page and closes the popup
    const erstellenButton = dialogSurface.locator('button.mdc-button.mdc-button--raised.mat-mdc-raised-button.mat-unthemed.mat-mdc-button-base', { hasText: 'Erstellen' });
    await expect(erstellenButton).toBeVisible({ timeout: 15000 });
    await expect(erstellenButton).toBeEnabled({ timeout: 15000 });

    // Click the "Erstellen" button, and wait for the new page
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'), // Wait for the new page to open
      erstellenButton.click({ timeout: 15000 }) // Increase the timeout for this click
    ]);

    console.log('New page opened:', newPage.url());
    await newPage.waitForLoadState();
    expect(newPage.url()).toMatch(/discussion-view\/\d+/);
    await newPage.close();


    const alleButton = discussionFilter.locator('button:has-text("Alle")');
    await alleButton.click();
    await expect(fadeInOutDiv).not.toBeVisible();
    await page.waitForTimeout(800);

    // Re-check the count of discussion items after the new page closes
    const finalCount = await discussionListItems.count();

    console.log('Initial Count:', initialCount);
    console.log('Final Count:', finalCount);

    expect(finalCount).not.toEqual(initialCount); // Validate count increment
    // Verify the title of the new item in the discussion list
    const newItem = discussionListItems.last();
    await expect(newItem.locator('h1.nowrap-text')).toHaveText('new Q');

   
    } else {
      console.log('Skipping test as it is only applicable to mobile view');
    }
    });
