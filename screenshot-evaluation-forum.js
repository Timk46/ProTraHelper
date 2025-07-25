const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to http://localhost:4200/evaluation-discussion-forum...');
    await page.goto('http://localhost:4200/evaluation-discussion-forum', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Check if we're getting any JavaScript errors
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // Check the URL after navigation
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check if the page contains any error messages
    const errorText = await page.evaluate(() => {
      const body = document.body.textContent || '';
      return body.includes('error') || body.includes('Error') || body.includes('404') ? body : null;
    });
    
    if (errorText) {
      console.log('Page error content:', errorText);
    }
    
    // Check for the main content
    const mainContent = await page.evaluate(() => {
      return document.querySelector('app-evaluation-discussion-forum') || 
             document.querySelector('evaluation-discussion-forum') ||
             document.querySelector('.evaluation-discussion') ||
             document.body.innerHTML.length;
    });
    
    console.log('Main content found:', !!mainContent);
    
    // Wait a bit for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'evaluation-forum-current-state.png',
      fullPage: true 
    });
    
    console.log('Screenshot saved as evaluation-forum-current-state.png');
    
    // Try to find the comment input area specifically
    const inputSelector = 'input[placeholder*="Antworten"], textarea[placeholder*="Antworten"], input[placeholder*="Diskussion"], textarea[placeholder*="Diskussion"]';
    const inputField = await page.$(inputSelector);
    if (inputField) {
      console.log('Found input field');
      
      // Get the bounding box and take a focused screenshot
      const boundingBox = await inputField.boundingBox();
      if (boundingBox) {
        // Expand the area to include the button next to it
        const expandedBox = {
          x: Math.max(0, boundingBox.x - 20),
          y: Math.max(0, boundingBox.y - 20),
          width: Math.min(1200, boundingBox.width + 200),
          height: boundingBox.height + 40
        };
        
        await page.screenshot({
          path: 'comment-input-focused.png',
          clip: expandedBox
        });
        console.log('Focused screenshot of input area saved as comment-input-focused.png');
      }
    } else {
      console.log('Could not find input field with expected placeholder');
      
      // Try to find any input or textarea in the comment area
      const anyInputSelector = '.comment-input input, .comment-input textarea, app-comment-input input, app-comment-input textarea';
      const anyInput = await page.$(anyInputSelector);
      if (anyInput) {
        console.log('Found input field by component selector');
        const boundingBox = await anyInput.boundingBox();
        if (boundingBox) {
          const expandedBox = {
            x: Math.max(0, boundingBox.x - 20),
            y: Math.max(0, boundingBox.y - 20),
            width: Math.min(1200, boundingBox.width + 200),
            height: boundingBox.height + 40
          };
          
          await page.screenshot({
            path: 'comment-input-focused.png',
            clip: expandedBox
          });
          console.log('Focused screenshot of input area saved as comment-input-focused.png');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();