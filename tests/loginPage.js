class LoginPage {

    constructor(page)
    {
        this.page = page;
        this.signInbutton= page.getByRole('button', { name: 'Login', exact: true });
        this.userName = page.locator('input[formcontrolname="username"]');
        this.password = page.locator('input[formcontrolname="password"]');
    
    }
    
    async goTo()
    {
        await this.page.goto("http://localhost:4200/login");
    }
    
    async validLogin()
    {
        console.log('Attempting to login...');
        try {
            // Wait for the login form to be visible
            await this.userName.waitFor({ state: 'visible', timeout: 10000 });
            
            // Fill in admin credentials
            await this.userName.fill('admin@test.de'); // Admin account for Edit Mode access
            await this.password.fill('admin');
            
            // Click the login button
            await this.signInbutton.click();
            
            // Wait for navigation to complete
            await this.page.waitForURL(/dashboard/, { timeout: 15000 });
            
            // Wait for the page to be fully loaded
            await this.page.waitForLoadState('networkidle', { timeout: 15000 });
            
            console.log('Login successful!');
        } catch (error) {
            console.error('Login failed:', error);
            
            // Take a screenshot to help debug
            await this.page.screenshot({ path: 'login-failed.png' });
            
            // Try to continue anyway
            console.log('Attempting to continue despite login issues...');
        }
    }
    
    }

module.exports = {LoginPage};
