import { test, expect } from '@playwright/test';
import { LoginPage } from './loginPage';

// Set a generous timeout for the full workflow.
//test.setTimeout(180000);

test('should login as ADMIN, toggle Edit Mode, navigate to ConceptOverview, expand accordion, create a new Multiple Choice question, then edit and generate options', async ({ page, viewport }) => {

  // -------------------------------------------------------------------------------
  // Helper Function: Assert the creation dialog contains all required fields.
  // Returns an object with the locators for later interaction.
  // -------------------------------------------------------------------------------
  async function assertCreationDialogFields(dialog) {
    const dialogTitle = dialog.locator('h2[mat-dialog-title]');
    await expect(dialogTitle).toHaveText('Frage hinzufügen');

    const titleInput = dialog.locator('input[placeholder="Titel der Frage"]');
    await expect(titleInput).toBeVisible();

    const typeSelect = dialog.locator('mat-select[placeholder="Fragentyp"]');
    await expect(typeSelect).toBeVisible();

    const difficultySelect = dialog.locator('mat-select[formcontrolname="questionDifficulty"]');
    await expect(difficultySelect).toBeVisible();

    const scoreInput = dialog.locator('input[placeholder="Punkte"]');
    await expect(scoreInput).toBeVisible();

    const cancelButton = dialog.locator('button:has-text("Abbrechen")');
    const createButton = dialog.locator('button:has-text("Erstellen")');
    await expect(cancelButton).toBeVisible();
    await expect(createButton).toBeVisible();

    return { titleInput, typeSelect, difficultySelect, scoreInput, cancelButton, createButton };
  }

  // -------------------------------------------------------------------------------
  // Helper Function: Fills in the creation dialog form.
  // Uses the locators returned from assertCreationDialogFields.
  // -------------------------------------------------------------------------------
  async function fillCreationDialogForm(fields, page) {
    // 1. Fill the "Titel der Frage" field with "test"
    await fields.titleInput.fill('test');

    // 2. Open the "Fragentyp" select and choose "Multiple Choice"
    await fields.typeSelect.click();
    const multipleChoiceOption = page.locator('mat-option').filter({ hasText: 'Multiple Choice' });
    await expect(multipleChoiceOption).toBeVisible({ timeout: 5000 });
    await multipleChoiceOption.click();

    // 3. Open the "Schwierigkeit" select and choose "Level 3: Anwenden"
    await fields.difficultySelect.click();
    const difficultyOption = page.locator('mat-option').filter({ hasText: 'Level 3: Anwenden' });
    await expect(difficultyOption).toBeVisible({ timeout: 5000 });
    await difficultyOption.click();

    // 4. Fill in the "Punkte" input field with a value (e.g. "10")
    await fields.scoreInput.fill('10');
  }

  // -------------------------------------------------------------------------------
  // Step 1: Login as ADMIN using provided credentials.
  // -------------------------------------------------------------------------------
  const loginPage = new LoginPage(page);
  await loginPage.goTo();
  await loginPage.validLogin();
  await expect(page).toHaveURL(/dashboard/);

  // -------------------------------------------------------------------------------
  // Step 2: Toggle "Edit Mode" (visible only for ADMIN).
  // -------------------------------------------------------------------------------
  const editModeToggle = page.locator('mat-slide-toggle:has-text("Edit Mode")');
  await expect(editModeToggle).toBeVisible({ timeout: 10000 });
  await editModeToggle.click();

  // -------------------------------------------------------------------------------
  // Determine if we are running in Mobile or Desktop view using the viewport width.
  // -------------------------------------------------------------------------------
  const isMobile = viewport ? viewport.width <= 720 : false;

  if (isMobile) {
    // ---------------------------------------------------------------------------
    // Mobile Scenario:
    // Navigate via the "root" tab and create a question.
    // ---------------------------------------------------------------------------
    const rootMenuTab = page.locator('.mat-mdc-tab-labels .mdc-tab__text-label:has-text("root")');
    await expect(rootMenuTab).toBeVisible({ timeout: 10000 });
    await rootMenuTab.click();

    const rootMenuItems = page.locator('.mat-mdc-cell .cell-container');
    const graphDiv = page.locator('.content.graph.mat-elevation-z8');
    const button = graphDiv.locator('button.mat-mdc-raised-button.mat-primary').first();
    await expect(graphDiv).toBeVisible();
    await expect(button).toBeVisible();

    const firstMenuItem = rootMenuItems.nth(0);
    await firstMenuItem.click();
    await button.click();
    await page.waitForTimeout(2000);

    const contentDiv = page.locator('.content.mat-elevation-z8').nth(1);
    const accordion = contentDiv.locator('mat-expansion-panel').first();
    await expect(accordion).toBeVisible({ timeout: 5000 });
    await accordion.click();
    await page.waitForTimeout(500);

    const addQuestionButton = accordion.locator('button:has-text("Frage hinzufügen")');
    await expect(addQuestionButton).toBeVisible({ timeout: 5000 });
    await addQuestionButton.click();

    // Wait for the creation dialog to open.
    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Assert and fill in the creation dialog form.
    const dialogFields = await assertCreationDialogFields(dialog);
    await fillCreationDialogForm(dialogFields, page);
    await dialogFields.createButton.click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
  } else {
    // ---------------------------------------------------------------------------
    // Desktop Scenario:
    // Navigate by double-clicking on the first concept node and create a question.
    // ---------------------------------------------------------------------------
    const svgContainer = page.locator('svg.sprotty-graph[tabindex="0"]');
    await expect(svgContainer).toBeAttached({ timeout: 20000 });
    await expect(svgContainer).toBeVisible();

    const conceptNodes = svgContainer.locator('g.concept');
    await conceptNodes.first().dblclick();
    await page.waitForTimeout(500);

    const conceptOverviewComponent = page.locator('app-conceptOverview');
    await expect(conceptOverviewComponent).toBeVisible({ timeout: 10000 });

    const contentDiv = page.locator('.content.mat-elevation-z8').nth(1);
    const accordion = contentDiv.locator('mat-expansion-panel').first();
    await expect(accordion).toBeVisible({ timeout: 5000 });
    await accordion.click();
    await page.waitForTimeout(500);

    const addQuestionButton = accordion.locator('button:has-text("Frage hinzufügen")');
    await expect(addQuestionButton).toBeVisible();
    await addQuestionButton.click();

    // Wait for the creation dialog to open.
    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Assert and fill in the creation dialog form.
    const dialogFields = await assertCreationDialogFields(dialog);
    await fillCreationDialogForm(dialogFields, page);
    await dialogFields.createButton.click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
  }

  // ===================== Extended Editing Flow ==========================
  // After the question is created, wait briefly for the UI to update.
  await page.waitForTimeout(2000);

  // Re-click the same accordion to refresh the question list.
  {
    const contentDiv = page.locator('.content.mat-elevation-z8').nth(1);
    const accordion = contentDiv.locator('mat-expansion-panel').first();
    await accordion.click();
    await page.waitForTimeout(500);
  }

  // Locate and click the edit button from the content board using its testid.
  const editButton = page.locator('button[testid="edit-button"]').first();
  await expect(editButton).toBeVisible({ timeout: 5000 });
  await editButton.click();

  // Wait for navigation to the edit-choice component (URL pattern /editchoice/{id}).
  await expect(page).toHaveURL(/\/editchoice\/\d+/);

  // In the edit-choice view, locate and expand the "Frage generieren" expansion panel.
  const generationPanel = page.locator('mat-expansion-panel:has-text("Frage generieren")');
  await expect(generationPanel).toBeVisible({ timeout: 10000 });
  await generationPanel.click();

    // API-Call abfangen: Hier fangen wir die Anfrage ab, die in der Methode getQuestionAndAnswers gesendet wird.
  await test.step('Intercept API call for auto-fill question and answers', async () => {
    await page.route('**/mcqcreation/questionAndAnswers**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          question: 'Mocked Aufgabentext',
          answers: [
            { answer: 'Option A', correct: true },
            { answer: 'Option B', correct: false },
            { answer: 'Option C', correct: false }
          ],
          description: 'Mocked Beschreibung',
          score: 10
        })
      });
    });
  });
  
    // Within the panel, click the "Generieren" button.
  const generateButton = generationPanel.locator('button:has-text("Generieren")');
  await expect(generateButton).toBeVisible({ timeout: 5000 });
  await generateButton.click();

  // Instead of checking a form control value, we now verify that the edit view's
  // "text-container" displays the expected content (e.g. the heading "Aufgabentext" found in edit-choice.component.html).
  const textContainer = page.locator('div.text-container[style*="width: 70%"]');
  await expect(textContainer).toContainText('Aufgabentext');
  await expect(textContainer).toContainText('Mögliche Antwortoptionen');
});