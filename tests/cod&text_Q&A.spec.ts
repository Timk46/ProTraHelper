import { test, expect } from '@playwright/test';
import { LoginPage } from './loginPage';

test.setTimeout(120000);
test.describe.configure({ mode: 'parallel' });

/**
 * Custom drag-and-drop function using mouse actions.
 * @param {Locator} draggable - The element to be dragged.
 * @param {Locator} dropZone - The element where the draggable will be dropped.
 * @param {Page} page - The Playwright page object.
 * @param {number} steps - Number of steps to simulate a smooth drag.
 */
async function customDragAndDrop(draggable, dropZone, page, steps = 20) {
  const draggableBox = await draggable.boundingBox();
  const dropZoneBox = await dropZone.boundingBox();

  if (!draggableBox || !dropZoneBox) {
    throw new Error('Could not retrieve bounding boxes for drag-and-drop');
  }

  await page.mouse.move(
    draggableBox.x + draggableBox.width / 2,
    draggableBox.y + draggableBox.height / 2,
    { steps }
  );
  await page.mouse.down();

  await page.mouse.move(
    dropZoneBox.x + dropZoneBox.width / 2,
    dropZoneBox.y + dropZoneBox.height / 2,
    { steps }
  );
  await page.mouse.up();
}

async function navigateToForLoopAccordion(page) {
  const rootMenuTab = page.locator('.mat-mdc-tab-labels .mdc-tab__text-label:has-text("root")');
  await rootMenuTab.click();

  const rootMenuItems = page.locator('.mat-mdc-cell .cell-container');
  const graphDiv = page.locator('.content.graph.mat-elevation-z8');
  const button = graphDiv.locator('button.mat-mdc-raised-button.mat-primary').first();

  await expect(graphDiv).toBeVisible();
  await expect(button).toBeVisible();

  const menuItem3 = rootMenuItems.nth(2);
  await menuItem3.click();
  await button.click();
  await page.waitForTimeout(3000);
  const contentDiv = page.locator('.content.mat-elevation-z8').nth(1);
  const accordions = contentDiv.locator('mat-expansion-panel');

  const forLoopAccordion = accordions.getByRole('button', { name: 'for-Schleife' });
  await expect(forLoopAccordion).toBeVisible();
  await forLoopAccordion.click();
}

test.describe('Questions Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goTo();
    await loginPage.validLogin();
    await expect(page).toHaveURL(/dashboard/);
  });


  test('Submit a coding question', async ({ page, isMobile }) => {
    if (!isMobile) {
      console.log('Skipping test as it is only applicable to mobile view');
      return;
    }
    await navigateToForLoopAccordion(page);

    const buttonInRow = page.getByRole('row', { name: '17 C++: Summe berechnen' }).getByRole('button');
    await buttonInRow.click();

    await page.waitForURL('**/tutor-kai/code/17');
    await expect(page).toHaveURL(/tutor-kai\/code\/17/);

    const codeEditor = page.locator('.view-lines');
    await codeEditor.locator('.view-line:has-text("// Vervollständigte Funktion")').click();

    await page.keyboard.press('End');
    await page.keyboard.down('Shift');
    await page.keyboard.press('Home');
    await page.keyboard.up('Shift');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(`for (int tag = a; tag <= b; ++tag) {\nsumme += 100;\n}\nreturn summe;\n`);

    const ausfuehrenButton = page.getByRole('button', { name: 'Ausführen' });
    await ausfuehrenButton.click();
    await page.waitForTimeout(5000);

    const testResults = page.locator('.test-results .points-display p');
    await expect(testResults).toBeVisible();

    const pointsText = await testResults.textContent();
    console.log('Points result:', pointsText);

    const backToDashboardLink = page.getByRole('link', { name: 'Zurück zum Dashboard' });
    await backToDashboardLink.click();
    await page.waitForURL('**/dashboard');
  });

  test('Interact with drag-and-drop questions', async ({ page, isMobile }) => {
    if (!isMobile) {
      console.log('Skipping test as it is only applicable to mobile view');
      return;
    }
    await navigateToForLoopAccordion(page);

    const buttonInRow = page.getByRole('row', { name: 'C++: Schleifen' }).getByRole('button');
    await buttonInRow.click();

    await page.waitForSelector('div#gap_bc6344fd-29cc-4cd3-a426-d34c4f7f246f');
    await page.waitForSelector('div.cdk-drag');

    const dropZone = page.locator('div#gap_bc6344fd-29cc-4cd3-a426-d34c4f7f246f');
    const draggables = page.locator('div#drag-drop-global-list');
    const firstDraggable = page.locator('div.cdk-drag').nth(0);
    const secondDraggable = page.locator('div.cdk-drag').nth(1);

    await customDragAndDrop(firstDraggable, dropZone, page);
    await page.waitForTimeout(500);

    const antwortenButton = page.locator('button:has-text("Antworten")');
    await antwortenButton.click();

    const feedbackContainer = page.locator('.feedback-container');
    await feedbackContainer.waitFor();

    const feedbackText = (await feedbackContainer.textContent())?.trim();
    console.log('Feedback:', feedbackText);

    await customDragAndDrop(dropZone, draggables, page);
    await customDragAndDrop(secondDraggable, dropZone, page);

    await antwortenButton.click();
    const secondFeedbackText = (await feedbackContainer.textContent())?.trim();
    console.log('Second Feedback:', secondFeedbackText);

    await page.mouse.click(10, 10);
  });
});



//  // test for text questions
//       //  Interact with the iframe within the task card to write text
//       const buttonInRow1 = table.locator('tbody tr:nth-child(3) button.mdc-button');
//       await buttonInRow1.click();

//       const editorFrame = page.frameLocator('iframe[title="Rich Text Area"]').locator('html');
//       await editorFrame.locator('body#tinymce').waitFor({ state: 'visible', timeout: 10000 }); // Increase timeout if needed
//       await editorFrame.locator('body#tinymce').fill('Grundlagen!?');

//       //  Click button to submit text
//       const submitButton = page.getByRole('button', { name: 'Abgeben' });
//       await submitButton.click();

//       // Check if feedback appears with score and log the line
//       const feedbackCard = page.locator('.mat-mdc-card.mdc-card.feedback');
//       await expect(feedbackCard).toBeVisible();

//       const feedbackLine = feedbackCard.locator('p:has-text("Erreichte Punktzahl")').last();
//       const feedbackText = await feedbackLine.textContent();
//       console.log('Falsch:', feedbackText);

//       // Clear and write structured text in the iframe
//       await editorFrame.locator('body#tinymce').fill('Grundlagen eines Computers:\nGrundlagen zur Entwicklung von Software:\nGrundlegende Datenstrukturen:\nGrundlegende Algorithmen:\nGrundlegende Rechner Architektur:');

//       // Click the submit button again and verify feedback line
//       await submitButton.click();
//       await page.waitForTimeout(500);

//       const feedbackTextAfter = await feedbackLine.textContent();
//       console.log('Richtig:', feedbackTextAfter);

//        //Click outside the task card to close it
//       await page.mouse.click(0, 0);
