import { test, expect } from '@playwright/test';


test(`Login test for wrong PW `, async ({ page }) => {
  await page.goto('http://localhost:4200/login');

    // Fill in an invalid email
  await page.fill('input[formcontrolname="username"]', 'pferd@proband.de');
  await page.fill('input[formcontrolname="password"]', '------');

  // Click the login button
  await page.getByRole('button', { name: 'Login', exact: true }).click();

  // Selector for the popup message
  const popupSelector = 'text=Der Login ist fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.';

  // Wait for the popup to appear
  await expect(page.locator(popupSelector)).toBeVisible({ timeout: 5000 });

  // // Optionally, verify the popup text
  // const popupText = await page.locator(popupSelector).textContent();
  // expect(popupText).toContain('Der Login ist fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.');

  // Wait for the popup to disappear
  await page.waitForSelector(popupSelector, { state: 'detached', timeout: 5000 });

  // Assert that the popup is no longer visible
  expect(await page.isVisible(popupSelector)).toBe(false);

});
test(`Login test for wrong email format `, async ({ page }) => {
  await page.goto('http://localhost:4200/login');

    // Fill in an invalid email
  await page.fill('input[formcontrolname="username"]', 'myMailQhotmail.com');
  await page.fill('input[formcontrolname="password"]', 'Katze7793');
  await page.getByRole('button', { name: 'Login', exact: true }).click();

  // Wait for the popup to appear
  await expect(page.getByText('Invalid email format')).toBeVisible({ timeout: 5000 });


});

test('Missing password error', async ({ page }) => {
  await page.goto('http://localhost:4200/login');

  // Fill in the email, but leave the password empty
  await page.fill('input[formcontrolname="username"]', 'katze@proband.de');

  // Click the login button
  await page.click('button:has-text("Login")');

  // Check for the missing password error message
  const passwordError = page.locator('mat-error:has-text("Password is required")');
  await expect(passwordError).toBeVisible();
});