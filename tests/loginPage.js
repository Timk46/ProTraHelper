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
        await this.userName.fill('pferd@proband.de'); // best use admin or something like that
        await this.password.fill('Pferd1444');
        await this.signInbutton.click();
        //await this.page.waitForNavigation({ url: '**/dashboard' });

        await this.page.waitForLoadState('networkidle');

    
    }
    
    }

module.exports = {LoginPage};