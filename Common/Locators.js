export default class Login_Locators{

    constructor(page){
    this.UsernameInput = "#nfr_login_authname"
    this.PasswordInput = "#nfr_login_authid";
    this.LoginButton = "#nfr_login_btnlogin";
    this.Processing = "//div[text()='Processing']";
    this.ModuleInput = "#nfr_topbar_autocomp_input";
    this.SelectII = "//li[@data-item-label='Import Invoice']";

    }
}