import { expect, Page } from '@playwright/test';

export class LoginView {
  constructor(private page: Page) {}

  async goToLogin(baseUrl: string) {
    await this.page.goto(`${baseUrl}/login`);
  }

  async login(email: string, password: string) {
    await this.page.getByRole('textbox', { name: 'Correo electrónico' }).fill(email);
    await this.page.getByLabel('Contraseña').fill(password);
    await this.page.getByRole('button', { name: 'Iniciar sesión' }).click();
  }

  async expectLoginPage() {
    await expect(this.page.getByRole('heading', { name: 'Accede con tu cuenta' })).toBeVisible();
  }

  async expectAuthenticated() {
    await expect(this.page.getByText('QAScope')).toBeVisible();
    await expect(this.page).not.toHaveURL(/\/login$/);
  }
}
