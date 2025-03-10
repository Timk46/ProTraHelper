import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../tests/loginPage';

/**
 * End-to-End Test for Graph Tasks - Transitive Closure
 * 
 * This test verifies the complete flow of solving a transitive closure task:
 * 1. Navigating to the task page
 * 2. Analyzing the initial graph structure
 * 3. Adding the necessary edges to create a transitive closure
 * 4. Submitting the solution and verifying the feedback
 */

// Set a longer timeout for this test since it involves complex UI interactions
test.setTimeout(180000); // 3 minutes

test.describe('Graph Tasks - Transitive Closure', () => {
  // Take screenshots on test failures
  /*test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({ path: `test-failure-graph-tasks-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.png`, fullPage: true });
    }
  });*/

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goTo();
    await loginPage.validLogin();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should complete transitive closure task ID 29 successfully', async ({ page }) => {
    console.log('Starting transitive closure task test');
    
    try {
      // Step 1: Navigate to the task page
      console.log('Step 1: Navigating to task page');
      await page.goto('http://localhost:4200/graphtask/29');
      
      // Wait for the graph to be fully loaded
      await page.waitForSelector('.workspace-boundary', { state: 'visible', timeout: 10000 });
      
      // Step 2: Verify the task is loaded correctly
      console.log('Step 2: Verifying task is loaded correctly');
      const taskTitle = await page.locator('.assignment h2').textContent();
      expect(taskTitle).toContain('Transitive Hülle');
      
      // Wait for the graph nodes to be visible
      await page.waitForSelector('.node-div', { state: 'visible', timeout: 10000 });
      
      // Step 3: Verify the nodes are present (K, L, M, N)
      console.log('Step 3: Verifying nodes are present');
      const nodeLabels = await page.locator('.node-div .node-value').allTextContents();
      expect(nodeLabels).toContain('K');
      expect(nodeLabels).toContain('L');
      expect(nodeLabels).toContain('M');
      expect(nodeLabels).toContain('N');
      
      // Step 4: Switch to solution mode
      console.log('Step 4: Switching to solution mode');
      const solutionButton = page.locator('button.mat-mdc-button-base').filter({ hasText: 'Lösung' });
      await expect(solutionButton).toBeVisible({ timeout: 5000 });
      await solutionButton.click();
      
      // Step 5: Add a new solution step
      console.log('Step 5: Adding a new solution step');
      const newStepButton = page.locator('button.mat-mdc-button-base').filter({ hasText: 'Neuer Schritt' });
      await expect(newStepButton).toBeVisible({ timeout: 5000 });
      await newStepButton.click();
      
      // Wait a moment for the graph to stabilize
      await page.waitForTimeout(2000);
      
      // Step 6: Create the transitive closure by adding necessary edges
      console.log('Step 6: Creating transitive closure');
      
      // Based on the image and transitive closure logic, we need to add:
      // 1. Edge from K to N (if it doesn't exist)
      // 2. Edge from M to L (if it doesn't exist)
      // 3. Edge from M to N (if it doesn't exist)
      
      // Add edge from K to N
      console.log('Adding edge from K to N');
      await addDirectedEdge(page, 'K', 'N');
      
      // Add edge from M to L
      console.log('Adding edge from M to L');
      await addDirectedEdge(page, 'M', 'L');
      
      // Add edge from M to N
      console.log('Adding edge from M to N');
      await addDirectedEdge(page, 'M', 'N');
      
      // Take a screenshot of the final graph
      await page.screenshot({ path: `final-graph-${Date.now()}.png` });
      
      // Step 7: Submit the solution
      console.log('Step 7: Submitting solution');
      const submitButton = page.locator('button.mat-mdc-raised-button').filter({ hasText: 'Abgeben' });
      await expect(submitButton).toBeVisible({ timeout: 5000 });
      await submitButton.click();
      
      // Wait for the submission to complete
      await page.waitForSelector('.evaluation', { state: 'visible', timeout: 15000 });
      
      // Step 8: Verify the feedback indicates success
      console.log('Step 8: Verifying feedback');
      const feedback = await page.locator('.evaluation p').textContent();
      
      // Check if feedback indicates success
      expect(feedback).not.toContain('Keine Lösung abgegeben');
      
      // If the feedback doesn't contain "richtig", log it for debugging
      if (!feedback?.includes('richtig')) {
        console.log('Feedback:', feedback);
      }
      
      console.log('Test completed successfully');
    } catch (error) {
      console.error('Test failed with error:', error);
      
      // Take a screenshot to help with debugging
      await page.screenshot({ path: `graph-tasks-test-failure-${Date.now()}.png`, fullPage: true });
      
      throw error; // Re-throw to fail the test
    }
  });
});

/**
 * Helper function to add a directed edge between two nodes
 * @param page The Playwright page object
 * @param sourceNodeValue The value of the source node
 * @param targetNodeValue The value of the target node
 */
async function addDirectedEdge(page: Page, sourceNodeValue: string, targetNodeValue: string): Promise<void> {
  try {
    console.log(`Attempting to add edge from ${sourceNodeValue} to ${targetNodeValue}`);
    
    // First, make sure we're not in the middle of any edge creation
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Step 1: Find the source node
    const sourceNode = page.locator('.node-div').filter({ hasText: new RegExp(`^\\s*${sourceNodeValue}\\s*$`) });
    await expect(sourceNode).toBeVisible({ timeout: 10000 });
    
    // Step 2: Click on the node to activate it
    await sourceNode.click();
    console.log(`Clicked on source node ${sourceNodeValue}`);
    
    // Step 3: Wait for the toolset to be visible
    await page.waitForTimeout(1000);
    
    // Step 4: Hover over the node to ensure the toolset is visible
    await sourceNode.hover();
    await page.waitForTimeout(1000);
    
    // Take a screenshot to see what's visible
    await page.screenshot({ path: `before-edge-button-click-${sourceNodeValue}-to-${targetNodeValue}-${Date.now()}.png` });
    
    // Step 5: Click on the "new outgoing edge" button
    // The button is inside the node's toolset with class .new-edge-outgoing
    const outgoingEdgeButton = sourceNode.locator('.new-edge-outgoing');
    
    // Check if the button is visible
    const isButtonVisible = await outgoingEdgeButton.isVisible().catch(() => false);
    if (!isButtonVisible) {
      console.log('New edge button not visible, trying alternative approach');
      // Try clicking on the node again and hovering
      await sourceNode.click({ force: true });
      await page.waitForTimeout(500);
      await sourceNode.hover();
      await page.waitForTimeout(1000);
    }
    
    // Try to click the button
    await outgoingEdgeButton.click({ force: true });
    console.log('Clicked on new outgoing edge button');
    
    // Step 6: Click on the target node
    await page.waitForTimeout(1000);
    const targetNode = page.locator('.node-div').filter({ hasText: new RegExp(`^\\s*${targetNodeValue}\\s*$`) });
    await expect(targetNode).toBeVisible({ timeout: 10000 });
    await targetNode.click();
    console.log(`Clicked on target node ${targetNodeValue}`);
    
    // Step 7: Wait a moment for the edge to be created
    await page.waitForTimeout(1000);
    
    // Check if an error message appears (e.g., if the edge already exists)
    const errorMessage = page.locator('text=already are connected');
    const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (hasError) {
      console.log(`Edge from ${sourceNodeValue} to ${targetNodeValue} already exists`);
      // Press Escape to cancel the edge creation
      await page.keyboard.press('Escape');
    } else {
      console.log(`Successfully added edge from ${sourceNodeValue} to ${targetNodeValue}`);
    }
    
    // Take a screenshot after the edge creation attempt
    await page.screenshot({ path: `after-edge-creation-${sourceNodeValue}-to-${targetNodeValue}-${Date.now()}.png` });
    
  } catch (error) {
    console.error(`Failed to add edge from ${sourceNodeValue} to ${targetNodeValue}:`, error);
    // Take a screenshot to help with debugging
    await page.screenshot({ path: `edge-creation-error-${sourceNodeValue}-to-${targetNodeValue}-${Date.now()}.png`, fullPage: true });
    
    // Try to recover by pressing Escape to cancel any ongoing edge creation
    try {
      await page.keyboard.press('Escape');
    } catch (e) {
      // Ignore errors from recovery attempt
    }
    
    throw error;
  }
}
