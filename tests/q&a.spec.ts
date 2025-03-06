import { test, expect } from '@playwright/test';
import { LoginPage } from './loginPage';

test.describe.configure({ mode: 'parallel' });

async function navigateToQuestionsSection(page) {
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
  await page.waitForTimeout(6000);
}

test.describe('Questions Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goTo();
    await loginPage.validLogin();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('Interact with and submit a single-choice question', async ({ page, isMobile }) => {
    if (!isMobile) {
      console.log('Skipping test as it is only applicable to mobile view');
      return;
    }
    await navigateToQuestionsSection(page);
    const contentDiv = page.locator('.content.mat-elevation-z8').nth(1);
    const accordions = contentDiv.locator('mat-expansion-panel');
    const taskCard = page.locator('app-mctask .content');
    const submitButton = taskCard.getByRole('button', { name: 'Antworten' });
    const feedback = taskCard.locator('p:has-text("Score")');
    const table = accordions.locator('table.mat-mdc-table.mdc-data-table__table.cdk-table');
    const buttonInRow = page.locator('tbody tr:first-child button.mdc-button');

    await accordions.first().click();
    await expect(table.first()).toBeVisible();
    await table.first().locator(buttonInRow).click();

    await expect(taskCard).toBeVisible();
    const firstAnswerOption = taskCard.getByRole('option').nth(0);
    await firstAnswerOption.click();
    await submitButton.click();

    await page.waitForTimeout(1500);
    await expect(feedback).toBeVisible();
    console.log('Feedback:', await feedback.textContent());

    await page.mouse.click(0, 0); 
  });

  test('Interact with and submit a multi-choice question', async ({ page, isMobile }) => {
    if (!isMobile) {
      console.log('Skipping test as it is only applicable to mobile view');
      return;
    }
    await navigateToQuestionsSection(page);
    const contentDiv = page.locator('.content.mat-elevation-z8').nth(1);
    const accordions = contentDiv.locator('mat-expansion-panel');
    const taskCard = page.locator('app-mctask .content');
    const submitButton = taskCard.getByRole('button', { name: 'Antworten' });
    const feedback = taskCard.locator('p:has-text("Score")');
    const table = accordions.locator('table.mat-mdc-table.mdc-data-table__table.cdk-table');
    const buttonInRow = page.locator('tbody tr:first-child button.mdc-button');

    await accordions.last().click();
    await expect(table.last()).toBeVisible();
    await table.last().locator(buttonInRow).click();

    await expect(taskCard).toBeVisible();
    const answerOptions = taskCard.getByRole('option');
    await answerOptions.nth(0).click();
    await answerOptions.nth(1).click();
    await answerOptions.nth(2).click();
    await submitButton.click();

    await page.waitForTimeout(1500);
    await expect(feedback).toBeVisible();
    console.log('Feedback:', await feedback.textContent());

    await page.mouse.click(0, 0); 
  });
});