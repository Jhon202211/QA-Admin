import { expect, Page } from '@playwright/test';

export class DashboardView {
  constructor(private page: Page) {}

  async goToDashboard(baseUrl: string) {
    await this.page.goto(baseUrl);
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(this.page.getByRole('tab', { name: 'Pruebas Manuales' })).toBeVisible();
    await expect(this.page.getByRole('tab', { name: 'Automatizados' })).toBeVisible();
  }

  async openAutomatedMetrics() {
    await this.page.getByRole('tab', { name: 'Automatizados' }).click();
    await expect(this.page.getByRole('tab', { name: 'Automatizados' })).toHaveAttribute('aria-selected', 'true');
  }
}
