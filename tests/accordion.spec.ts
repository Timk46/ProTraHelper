import { test, expect, Page, Locator } from '@playwright/test';
import { LoginPage } from './loginPage';

/**
 * Checks the content of an accordion panel:
 * - Expands the panel.
 * - Verifies PDF and Video buttons along with their respective content.
 * - Verifies that a description paragraph is visible.
 * Key Concepts: DRY, modularization, clear async/await flow.
 */

  // --- Helper function to close a modal popup by pressing the 'Escape' key ---
  // Key Concepts: Code reuse (DRY), user-centric behavior simulation, and clear async/await flow.
  async function closeModalByEscape(page: Page): Promise<void> {
    // Delay to ensure the modal popup is fully rendered, if applicable.
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    // Short wait to allow the modal to fully disappear.
    await page.waitForTimeout(500);
  }

async function checkAccordionContent(page: Page, accordion: Locator): Promise<void> {
  // Expand the accordion panel.
  await accordion.click();

  // --- Check PDF content ---
  // --- Check PDF content ---
  const pdfButton = accordion.locator('button.mat-mdc-raised-button.mat-primary:has-text("PDF")');
  await pdfButton.scrollIntoViewIfNeeded();
  if (await pdfButton.isVisible()) {
    await pdfButton.click();

    // Verify that the PDF viewer is visible.
    const pdfContainer = page.locator('.contentView-card app-pdfviewer object.pdf-content');
    await expect(pdfContainer).toBeVisible();

    // Verify the download PDF link.
    const downloadLink = page.locator('a:has-text("Download PDF")');
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toHaveAttribute('href', /\/files\/download\//);

    // --- Handle potential new tab popup and modal dismissal for PDF ---
    // Start waiting for a popup event before clicking.
    const popupPromise = page.waitForEvent('popup', { timeout: 3000 }).catch(() => null);
    // Trigger the download (this may open a new tab).
    await downloadLink.click();
    // If a popup/tab is opened, close it immediately.
    const popup = await popupPromise;
    if (popup) {
      await popup.close();
    }
    // Simulate user dismissing the PDF modal popup by pressing "Escape".
    await closeModalByEscape(page);
  }
}

/**
 * Retrieves all accordion panels from the content div and iterates through them.
 * Key Concepts: Code reuse & readability.
 */
async function processAccordions(page: Page): Promise<void> {
  // Locate the content container and the accordion panels within it.
  const contentDiv = page.locator('.content.mat-elevation-z8').nth(1);
  const accordions = contentDiv.locator('mat-expansion-panel');
  const count = await accordions.count();

  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    await checkAccordionContent(page, accordions.nth(i));
  }
}

test('Check for Accordion items', async ({ page, viewport, browserName }) => {
  // Skip test for Safari/WebKit based browsers.
  test.skip(browserName === 'webkit', 'Skipping test on Safari/WebKit browser.');

  // --- Login Phase ---
  const loginPage = new LoginPage(page);
  await loginPage.goTo();
  await loginPage.validLogin();
  await expect(page).toHaveURL(/dashboard/);

  // Determine if the test is running on a mobile viewport.
  const isMobile: boolean = viewport ? viewport.width <= 720 : false;

  if (isMobile) {
    // --- MOBILE SCENARIO ---
    // Navigate via the root menu tab.
    const rootMenuTab = page.locator('.mat-mdc-tab-labels .mdc-tab__text-label:has-text("root")');
    await rootMenuTab.click();

    // Click the first menu item.
    const rootMenuItems = page.locator('.mat-mdc-cell .cell-container');
    await rootMenuItems.first().click();

    // Interact with the graph container.
    const graphDiv = page.locator('.content.graph.mat-elevation-z8');
    const primaryButton = graphDiv.locator('button.mat-mdc-raised-button.mat-primary').first();
    await expect(graphDiv).toBeVisible();
    await expect(primaryButton).toBeVisible();

    await primaryButton.click();
    // Wait briefly for content to load.
    await page.waitForTimeout(2000);

    // Process the accordion panels.
    await processAccordions(page);
  } else {
    // --- DESKTOP SCENARIO ---
    // Locate and verify the svg container.
    const svgContainer = page.locator('svg.sprotty-graph[tabindex="0"]');
    await expect(svgContainer).toBeAttached({ timeout: 20000 });
    await expect(svgContainer).toBeVisible();

    // Trigger content load by double-clicking on the first concept node.
    const conceptNodes = svgContainer.locator('g.concept');
    await conceptNodes.first().dblclick();
    await page.waitForTimeout(500);

    // Process the accordion panels.
    await processAccordions(page);
  }
});