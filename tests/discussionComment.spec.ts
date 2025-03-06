import { test, expect } from '@playwright/test';
import { LoginPage } from './loginPage';

test.describe.configure({ mode: 'parallel' });

/**
 * This end-to-end test verifies that:
 * 1. User X logs in and creates a new discussion.
 * 2. The discussion view page opens and the discussion URL (with its ID) is captured.
 * 3. User Y logs in in a separate browser context and navigates to the discussion.
 * 4. User Y uses a reply expander to post a comment.
 * 5. The test asserts the posted comment appears in the discussion view.
 * 6. User X verifies the notification and routes to the discussion.
 */
test('should allow User X to create a discussion and User Y to comment via the reply expander', async ({ browser, isMobile }) => {
  // This test is applicable only for mobile view based on the existing test structure.
  if (!isMobile) {
    console.log('Test applicable for mobile view only');
    return;
  }

  let discussionId = '';

  await test.step('User X: Create Discussion', async () => {
    // Create a separate context for User X.
    const contextX = await browser.newContext();
    const pageX = await contextX.newPage();

    // Log in as User X.
    const loginPageX = new LoginPage(pageX);
    await loginPageX.goTo();
    await loginPageX.validLogin();
    await expect(pageX).toHaveURL(/dashboard/);

    // Navigate to the discussion creation section.
    const rootMenuTab = pageX.locator('.mat-mdc-tab-labels .mdc-tab__text-label:has-text("root")');
    await rootMenuTab.click();

    // Wait for the graph container to be visible.
    const graphDiv = pageX.locator('.content.graph.mat-elevation-z8');
    await expect(graphDiv).toBeVisible();

    // Select the first menu item and click the creation button.
    const rootMenuItems = pageX.locator('.mat-mdc-cell .cell-container');
    const firstMenuItem = rootMenuItems.first();
    await firstMenuItem.click();

    const createDiscussionButton = graphDiv.locator('button.mat-mdc-raised-button.mat-primary').first();
    await expect(createDiscussionButton).toBeVisible();
    await createDiscussionButton.click();

    // Wait for the second content container to appear.
    const contentDiv = pageX.locator('.content.mat-elevation-z8').nth(1);
    await expect(contentDiv).toBeVisible();

    // Open the discussion list by clicking "Diskutieren".
    const diskutierenButton = contentDiv.locator('button:has-text("Diskutieren")');
    await expect(diskutierenButton).toBeVisible();
    await diskutierenButton.click();

    const contentContainer = contentDiv.locator('div.content-container');
    const listContainer = contentContainer.locator('.list-container.mat-elevation-z8');
    await expect(listContainer).toBeVisible();

    // Verify that the discussion filter component is visible.
    const discussionFilter = contentContainer.locator('app-discussion-filter[ng-reflect-active-concept-node-id="2"]');
    await expect(discussionFilter).toBeVisible();

    // Click the "Filter auswählen" button to show filtering options.
    const filterButton = discussionFilter.locator('button:has-text("Filter auswählen")');
    await expect(filterButton).toBeVisible();
    await filterButton.click();

    const fadeInOutDiv = contentDiv.locator('.fade-in-out.active');
    await expect(fadeInOutDiv).toBeVisible();

    // Verify dropdown, text field, checkbox, and "Wählen" button appear.
    const dropdownMenu = fadeInOutDiv.locator('div').filter({ hasText: /^Abschnittskarte$/ }).first();
    const titleTextField = fadeInOutDiv.locator('input[placeholder="Bitte eingeben..."]');
    const questionCheckbox = fadeInOutDiv.locator('#mat-mdc-checkbox-1 div').filter({ hasText: 'Frage als \'geklärt\'' });
    const chooseButton = fadeInOutDiv.locator('button:has-text("Wählen")');

    await expect(dropdownMenu).toBeVisible();
    await expect(titleTextField).toBeVisible();
    await expect(questionCheckbox).toBeVisible();
    await expect(chooseButton).toBeVisible();

    // Select "Wasserfallmodell" in the dropdown, fill in filter text, and click "Wählen".
    await dropdownMenu.click();
    await pageX.getByText('Wasserfallmodell', { exact: true }).first().click();
    await titleTextField.fill('test Q2');
    await chooseButton.click();

    // Instead of a fixed timeout, check if a "no posts" message appears.
    const noPostsMessage = contentContainer.locator('text=Zu diesem Thema/Filter wurden keine Beiträge gefunden');
    if (await noPostsMessage.isVisible({ timeout: 5000 })) {
      console.log('No posts found for this topic/filter.');
    } else {
      const discussionListItems = listContainer.locator('.question-box');
      await expect(discussionListItems.first()).toBeVisible();
    }

    // Open the discussion creation popup.
    const raisedButton = listContainer.locator('button.mdc-button.mdc-button--raised.mat-mdc-raised-button');
    await expect(raisedButton).toBeVisible();
    await raisedButton.click();

    // Wait for the pre-creation popup and select the first list item.
    const popup = pageX.locator('app-discussion-precreation.ng-star-inserted');
    await expect(popup).toBeVisible();
    const firstListItem = popup.locator('mat-list-item').first();
    await firstListItem.click();

    // Wait for the discussion creation dialog to appear.
    const dialogSurface = pageX.locator('app-discussion-creation.ng-star-inserted');
    await expect(dialogSurface).toBeVisible();

    // Fill in the discussion title.
    const titleInput = dialogSurface.locator('input[placeholder="Titel..."]');
    const discussionTitle = 'Discussion from User X';
    await titleInput.fill(discussionTitle);

    // Fill the TinyMCE rich text editor for discussion content.
    const tinymceFrame = pageX.frameLocator('iframe[title="Rich Text Area"]');
    const tinymceBody = tinymceFrame.locator('body');
    await expect(tinymceBody).toBeVisible({ timeout: 10000 });
    await tinymceBody.click(); // Ensure focus.
    const discussionContent = 'Content of discussion created by User X';
    await tinymceBody.fill(discussionContent);

    // Click the "Erstellen" button and wait for the discussion view page to open.
    const erstellenButton = dialogSurface.locator(
      'button.mdc-button.mdc-button--raised.mat-mdc-raised-button.mat-unthemed.mat-mdc-button-base',
      { hasText: 'Erstellen' }
    );
    await expect(erstellenButton).toBeVisible({ timeout: 15000 });
    await expect(erstellenButton).toBeEnabled({ timeout: 15000 });

    const [discussionPage] = await Promise.all([
      pageX.context().waitForEvent('page'),
      erstellenButton.click({ timeout: 15000 })
    ]);

    await discussionPage.waitForLoadState();
    const discussionUrl = discussionPage.url();
    console.log('Discussion URL created by User X:', discussionUrl);
    const discussionIdMatch = discussionUrl.match(/discussion-view\/(\d+)/);
    if (discussionIdMatch && discussionIdMatch[1]) {
      discussionId = discussionIdMatch[1];
    }
    await discussionPage.close();

    // Clean up User X's context.
    await contextX.close();
  });

  await test.step('User Y: Comment on Discussion Using the Reply Expander', async () => {
    // Create a separate browser context for User Y.
    const contextY = await browser.newContext();
    const pageY = await contextY.newPage();

    // Log in as User Y (credentials are directly provided in this case).
    const loginPageY = new LoginPage(pageY);
    await loginPageY.goTo();
    await loginPageY.userName.fill('pferd@proband.de'); // Adjust if needed.
    await loginPageY.password.fill('Pferd1444');
    await loginPageY.signInbutton.click();
    await pageY.waitForLoadState('networkidle');
    await expect(pageY).toHaveURL(/dashboard/);

    // Navigate directly to the discussion page using the captured discussionId.
    const baseUrl = new URL(pageY.url()).origin;
    const discussionViewUrl = `${baseUrl}/discussion-view/${discussionId}`;
    await pageY.goto(discussionViewUrl);
    await pageY.waitForLoadState();

    // Locate the reply expander button and click it.
    const replyButton = pageY.locator('button:has-text("Dem Beitrag antworten")');
    await expect(replyButton).toBeVisible({ timeout: 10000 });
    await replyButton.click();

    // Wait for the reply section to expand.
    const expandedArea = pageY.locator('div.fade-in-out.active');
    await expect(expandedArea).toBeVisible({ timeout: 10000 });

    // Interact with the TinyMCE editor in the expanded reply section.
    const tinymceReplyFrame = pageY.frameLocator('iframe[title="Rich Text Area"]');
    const tinymceReplyBody = tinymceReplyFrame.locator('body');
    await expect(tinymceReplyBody).toBeVisible({ timeout: 10000 });
    await tinymceReplyBody.click();
    const commentText = 'This is a comment from User Y using the reply expander.';
    await tinymceReplyBody.fill(commentText);

    // Click the "Senden" button to post the comment.
    const sendButton = pageY.locator('button:has-text("Senden")');
    await expect(sendButton).toBeVisible({ timeout: 10000 });
    await sendButton.click();

    // Verify that the comment appears in the discussion view.
    const commentLocator = pageY.locator('app-discussion-view-message', { hasText: commentText });
    await expect(commentLocator).toBeVisible({ timeout: 15000 });
    console.log('User Y successfully commented on the discussion.');

    // Clean up User Y's context.
    await contextY.close();
  });

  await test.step('User X: Verify Notification and Route to Discussion', async () => {
    // Create a new browser context for User X.
    const contextX = await browser.newContext();
    const pageX = await contextX.newPage();

    // Log in as User X.
    const loginPageX = new LoginPage(pageX);
    await loginPageX.goTo();
    await loginPageX.validLogin();
    await pageX.waitForLoadState('networkidle');
    await expect(pageX).toHaveURL(/dashboard/);

    // Navigate to the dashboard to reveal the notification bell.
    await pageX.goto(`${new URL(pageX.url()).origin}/dashboard`);

    // Click the notification bell.
    const bellButton = pageX.locator('app-notification-bell button[mat-icon-button]');
    await expect(bellButton).toBeVisible({ timeout: 10000 });
    await bellButton.click();

    // Verify that the notifications panel appears.
    const notificationsPanel = pageX.locator('.notifications-panel');
    await expect(notificationsPanel).toBeVisible({ timeout: 10000 });

    // Verify the topmost notification details.
    const firstNotification = notificationsPanel.locator('mat-expansion-panel').first();
    const notificationDate = firstNotification.locator('.notification-date');
    const notificationTitle = firstNotification.locator('.notification-title');
    const notificationStatus = firstNotification.locator('.notification-status');

    await expect(notificationDate).toHaveText(/\d{2}\.\d{2}\.\d{4}/, { timeout: 10000 });
    await expect(notificationTitle).toHaveText(/Kommentar/, { timeout: 10000 });
    await expect(notificationStatus).toHaveText('New', { timeout: 10000 });

    // Expand the notification details.
    const panelHeader = firstNotification.locator('mat-expansion-panel-header');
    await expect(panelHeader).toBeVisible({ timeout: 10000 });
    await panelHeader.click();

    // Mark the notification as read.
    const markAsReadButton = firstNotification.locator('button:has-text("als gelesen markieren")');
    await expect(markAsReadButton).toBeVisible({ timeout: 10000 });
    await markAsReadButton.click();

    // Optionally, toggle the panel before routing.
    await panelHeader.click();

    // Click the "Anzeigen" button to navigate to the discussion.
    const anzeigenButton = firstNotification.locator('button:has-text("Anzeigen")');
    await expect(anzeigenButton).toBeVisible({ timeout: 10000 });
    await anzeigenButton.click();

    // Verify that User X is routed to the discussion view page.
    await expect(pageX).toHaveURL(new RegExp(`discussion-view/${discussionId}`));
    console.log('User X successfully navigated to the discussion via notification.');

    // Clean up User X's context.
    await contextX.close();
  });
});