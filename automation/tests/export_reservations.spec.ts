import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const BASE_URL = process.env.BASE_URL;
const USER_EMAIL = process.env.USER_EMAIL || '';
const USER_PASSWORD = process.env.USER_PASSWORD || '';

test('test', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });

  // ========== LOGIN ==========
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: '*********' }).click();
  await page.getByRole('textbox', { name: '*********' }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  // Esperar a que la página principal cargue después del login
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  // Sidebar: botón "Espacios de trabajo"
  const workSpacesButton = page.getByRole('button', { name: 'Espacios de trabajo' });
  await expect(workSpacesButton).toBeVisible({ timeout: 10000 });
  await workSpacesButton.scrollIntoViewIfNeeded();
  await workSpacesButton.click();

  // Esperar a que se abra el sidebar y aparezca "Reservaciones"
  const reservationsLink = page.getByRole('link', { name: 'Reservaciones' });
  await expect(reservationsLink).toBeVisible({ timeout: 10000 });
  await reservationsLink.click();

  // Esperar a que cargue la vista de Reservaciones
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  // ========== FILTRO POR TEXTO "sdk" ==========
  const searchReservationsInput = page.getByRole('textbox', { name: 'Buscar reservaciones' });
  await searchReservationsInput.click();
  await searchReservationsInput.fill('sdk');

  // Esperar a que se apliquen los filtros de texto
  await page.waitForLoadState('networkidle');

  // Intentar detectar si ya hay registros visibles
  const table = page.getByRole('table').first();
  const rows = table.getByRole('row');
  const rowCount = await rows.count();

  if (rowCount <= 1) {
    // ========== FILTROS AVANZADOS POR RANGO DE FECHAS ==========
    const filterToggleButton = page.locator('xpath=//*[@id="headlessui-disclosure-button-:r0:"]');
    await expect(filterToggleButton).toBeVisible({ timeout: 10000 });
    await filterToggleButton.click();

    const dateRangeInput = page.locator('xpath=//*[@id="daterange"]');
    await expect(dateRangeInput).toBeVisible({ timeout: 10000 });
    await dateRangeInput.click();

    const startDateCell = page.locator(
      'xpath=//*[@id="headlessui-disclosure-panel-:r1:"]/div[1]/div[1]/div/div[1]/div/div[2]/div[2]/div/div/div[2]/div[2]/div[1]/div[4]',
    );
    await expect(startDateCell).toBeVisible({ timeout: 10000 });
    await startDateCell.click();

    const endDateCell = page.locator(
      'xpath=//*[@id="headlessui-disclosure-panel-:r1:"]/div[1]/div[1]/div/div[1]/div/div[2]/div[2]/div/div/div[3]/div[2]/div[5]/div[3]',
    );
    await expect(endDateCell).toBeVisible({ timeout: 10000 });
    await endDateCell.click();

    // Esperar a que se apliquen los filtros por fecha y se recargue la lista
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
  }

  // Validar si hay registros antes de exportar
  const finalRowCount = await rows.count();
  if (finalRowCount <= 1) {
    // No hay registros para exportar; el comportamiento esperado es no fallar
    return;
  }

  // ========== EXPORTAR RESERVACIONES ==========
  const exportButton = page.getByRole('button', { name: 'Exportar' });
  await expect(exportButton).toBeVisible({ timeout: 10000 });
  await exportButton.click();

  // Esperar a que aparezca el modal de confirmación y confirmarlo
  const confirmButton = page.getByTestId('undefined-confirmation-modal-confirm-button');
  await expect(confirmButton).toBeVisible({ timeout: 10000 });
  await confirmButton.click();
});