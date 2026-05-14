import { expect, Page } from '@playwright/test';

export class TestCasesView {
  constructor(private page: Page) {}

  async goToManualTests(baseUrl: string) {
    await this.page.goto(`${baseUrl}/test_cases`);
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: 'Pruebas Manuales' })).toBeVisible();
    await expect(this.page.getByRole('tab', { name: 'Vista Jerárquica' })).toBeVisible();
    await expect(this.page.getByRole('tab', { name: 'Archivados' })).toBeVisible();
    await expect(this.page.getByRole('tab', { name: 'Vista de Lista' })).toBeVisible();
  }

  async openListView() {
    await this.page.getByRole('tab', { name: 'Vista de Lista' }).click();
    await expect(this.page.getByRole('tab', { name: 'Vista de Lista' })).toHaveAttribute('aria-selected', 'true');
  }

  async goToCreate() {
    await this.page.goto('/test_cases/create');
    await expect(this.page.getByText('Nuevo Caso de Prueba')).toBeVisible();
  }
}
