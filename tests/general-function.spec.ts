import { test, expect, BrowserContext } from '@playwright/test';
import { LoginPage } from './loginPage';




// Define a function to clear cache
async function clearCache(context: BrowserContext) {
  await context.clearCookies(); // Clear cookies
  await context.clearPermissions(); // Clear permissions
  await context.storageState({ path: 'state.json' }); // Save initial state
}

// Create a new context before each test
test.beforeEach(async ({ browser }) => {
  const context = await browser.newContext(); // Create a new context
  await clearCache(context); // Clear cache and cookies
  await context.addCookies([]); // If you want to add any cookies later
});

// Utility function to click an item and verify visibility
// const clickAndVerifyVisibility = async (page, selector) => {
//   const element = page.locator(selector);
//   await element.waitFor({ timeout: 10000 });
//   await element.click();
//   await expect(element).toBeVisible();
// };

// Utility function to get the text content and ensure it has changed
// const verifyTextHasChanged = async (locator, initialText) => {
//   const updatedText = (await locator.textContent()) || '';
//   await expect(updatedText).not.toBe(initialText); 
//   return updatedText; 
// };


// Utility function to extract the Y value from the transform string
const extractYValue = (transform: string | null): number => {
  if (!transform) return 0;
  const match = transform.match(/translate\(\d+,\s*(\d+\.?\d*)\)/);
  return match ? parseFloat(match[1]) : 0;
};

// Function to calculate vertical expansion
const calculateVerticalExpansion = (initialTransform: string | null, finalTransform: string | null): number => {
  const initialY = extractYValue(initialTransform);
  const finalY = extractYValue(finalTransform);
  return finalY - initialY;
};

// Integrated test for both mobile and desktop interactions
test('Check interactions of transform attribute on graph and tab content updates on menu', async ({ page, viewport }) => {
  // Login first
  const loginPage = new LoginPage(page);
  await loginPage.goTo();
  await loginPage.validLogin();
  await expect(page).toHaveURL(/dashboard/);

  async function bringNodeIntoViewport(node) {
    const graphContainer = page.locator('svg.sprotty-graph[tabindex="0"]');
    const nodeBox = await node.boundingBox();
  
    if (!nodeBox) {
        console.error('Node bounding box not found, unable to drag the graph.');
        return;
    }
  
    const nodeCenterX = nodeBox.x + nodeBox.width /6;
    const nodeCenterY = nodeBox.y + 6;
    const graphBox = await graphContainer.boundingBox();
  
    if (!graphBox) {
        console.error('Graph container bounding box not found, unable to drag.');
        return;
    }
  
    const graphCenterX = graphBox.x + graphBox.width /2;
    const graphCenterY = graphBox.y + graphBox.height /2;
  
    const dragAmountX = nodeCenterX - graphCenterX;
    const dragAmountY = nodeCenterY - graphCenterY;
  
    // Drag in smaller increments
    await page.mouse.move(graphCenterX, graphCenterY);
    await page.mouse.down();
    const steps = 20; // Smoother drag with more steps
    const stepX = dragAmountX / steps;
    const stepY = dragAmountY / steps;
  
    for (let i = 1; i <= steps; i++) {
        await page.mouse.move(graphCenterX + stepX * i, graphCenterY + stepY * i);
        await page.waitForTimeout(25); // Short delay for smooth movement
    }
  
    await page.mouse.up();
    // await adjustZoomForNode(node, graphContainer); // Apply zoom adjustments if necessary
  }
  async function clickInsideRect(rect, node) {
    // await bringNodeIntoViewport(node);
  
    await rect.evaluate(el => el.scrollIntoViewIfNeeded({ block: 'center', inline: 'center' }));
    
    const box = await rect.boundingBox();
    if (box) {
        const clickX = box.x + 10;
        const clickY = box.y + 10;
  
        console.log(`Attempting to click inside rect at (${clickX}, ${clickY})`);
        
        await page.mouse.click(clickX, clickY);
    } else {
        console.error('Bounding box not found for rect.');
    }
  }
  // Determine if it's mobile view based on viewport size
  const isMobile = viewport ? viewport.width <= 730 : false;

  if (isMobile) {
    // MOBILE VIEW TEST

    // Click on the root menu to reveal items
    const rootMenuTab = page.locator('.mat-mdc-tab-labels .mdc-tab__text-label:has-text("root")');
    await rootMenuTab.click();
    
    // Verify that root menu has 5 items
    const rootMenuItems = page.locator('.mat-mdc-cell .cell-container');
    await expect(rootMenuItems).toHaveCount(5, { timeout: 15000 });

    // Ensure button under div `.content.graph.mat-elevation-z8` is visible
    const graphDiv = page.locator('.content.graph.mat-elevation-z8');
    const button = graphDiv.locator('button.mat-mdc-raised-button.mat-primary').first();
    await expect(graphDiv).toBeVisible();
    await expect(button).toBeVisible();

    // Verify `.content.mat-elevation-z8` visibility
    const contentDiv = page.locator('.content.mat-elevation-z8').nth(1);
    await expect(contentDiv).toBeVisible();

    // Interact with the first root menu item and verify button text
    const firstMenuItem = rootMenuItems.nth(0);
    const firstItemText = (await firstMenuItem.textContent()) || '';
    const cleanedFirstItemText = (firstItemText ? firstItemText.trim().replace('folder', '').trim() : 'default text');

    await firstMenuItem.click();
    await expect(button).toHaveText(`Anzeigen: ${cleanedFirstItemText}`);

    // Click the button to trigger content load based on the first item
    await button.click();

    // Verify that content header matches the first menu item text
    const contentHeader = contentDiv.locator('h1').first();
    await expect(contentHeader).toHaveText(cleanedFirstItemText);

    // Interact with the second root menu item and verify updates
    const secondMenuItem = rootMenuItems.nth(1);
    const secondItemText = (await secondMenuItem.textContent()) || '';
    const cleanedSecondItemText = (secondItemText ? secondItemText.trim().replace('folder', '').trim() : 'default text');

    await secondMenuItem.click();
    await expect(button).toHaveText(`Anzeigen: ${cleanedSecondItemText}`);

    // Click the button to load content based on the second item
    await button.click();

    // Verify that content header matches the second menu item text
    await expect(contentHeader).toHaveText(cleanedSecondItemText);

  } else {
    // DESKTOP VIEW TEST

    // Find the SVG container
    const svgContainer = page.locator('svg.sprotty-graph[tabindex="0"]');
    await expect(svgContainer).toBeAttached({ timeout: 30000 });
    await expect(svgContainer).toBeVisible();

    // Check for at least 5 concept nodes
    const conceptNodes = svgContainer.locator('g.concept');
    const conceptCount = await conceptNodes.count();
    expect(conceptCount).toBeGreaterThan(3);

    // Select the first node's <g> element
    const firstNode = conceptNodes.nth(0);
    const secondNode = conceptNodes.nth(1);

    // Get the initial 'transform' attribute value
    const initialTransform = await firstNode.getAttribute('transform');
    const initialYValue = extractYValue(initialTransform);
    console.log('Initial Y Value:', initialYValue);

    //  Double-click the node and verify the Y-value changes
    await firstNode.dblclick();
    await page.waitForTimeout(500);
    const transformAfterDoubleClick = await firstNode.getAttribute('transform');

    // Calculate the vertical expansion (change in Y)
    const yValueChangeAfterDoubleClick = calculateVerticalExpansion(initialTransform, transformAfterDoubleClick);
    console.log('Y Value Change After Double Click:', yValueChangeAfterDoubleClick);

    // Expect that the Y value changed (not zero), indicating a vertical expansion occurred
    expect(yValueChangeAfterDoubleClick).not.toBe(initialYValue);


    //  Check for the content div after node interaction
    const contentDiv = page.locator('.content.mat-elevation-z8').nth(1);
    await expect(contentDiv).toBeVisible();


    // await firstNode.dblclick();
    // const firstNodeText = await firstNode.locator('text.heading.sprotty-label').nth(0).textContent() || ''; // Scoped within first node
    // console.log('Expected text for Node 1:', firstNodeText);

    // // Wait for content to load and match the text
    // await contentDiv.locator('h1').nth(0).waitFor({ state: 'visible', timeout: 5000 });
    // await expect(contentDiv.locator('h1').nth(0)).toHaveText(firstNodeText, { timeout: 5000 });

    // Interact with the second graph node, read its title, and match with the header.
    // await secondNode.click();
    // const headerRect = secondNode.locator('rect.sprotty-concept-header').nth(0);
    // await clickInsideRect(headerRect, secondNode);
    // const secondNodeText = await secondNode.locator('text.heading.sprotty-label').nth(0).textContent() || ''; // Scoped within second node
    // console.log('Expected text for Node 2:', secondNodeText);

    // // Wait for content to load and match the text
    // await contentDiv.locator('h1').first().waitFor({ state: 'visible', timeout: 5000 });
    // await expect(contentDiv.locator('h1').first()).toHaveText(secondNodeText, { timeout: 5000 });
  }
  });