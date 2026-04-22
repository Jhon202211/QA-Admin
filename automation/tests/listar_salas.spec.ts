import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const BASE_URL = process.env.BASE_URL;

test('listar salas y ver reservas', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });

  // ========== LOGIN ==========
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(process.env.USER_EMAIL || '');
  await page.getByRole('textbox', { name: '*********' }).fill(process.env.USER_PASSWORD || '');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  // Esperar a que la página cargue después del login
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  // ========== NAVEGACIÓN A SALAS ==========
  const salasButton = page.getByRole('button', { name: 'Salas' });
  await expect(salasButton).toBeVisible({ timeout: 10000 });
  await salasButton.click();

  const listaSalasLink = page.getByRole('link', { name: 'Lista de salas Inventario de' });
  await expect(listaSalasLink).toBeVisible({ timeout: 10000 });
  await listaSalasLink.click();

  // Esperar a que cargue la lista de salas
  await page.waitForLoadState('networkidle');

  // ========== BÚSQUEDA Y DETALLES ==========
  const searchInput = page.getByRole('textbox', { name: 'Buscar por nombre de usuario' });
  await expect(searchInput).toBeVisible();
  await searchInput.fill('Sala de Juntas QA');
  await searchInput.press('Enter');

  // Esperar a que los resultados se filtren
  await page.waitForTimeout(2000);

  // Click en detalles de la sala (usando el testId si es posible, o el texto)
  const roomDetails = page.getByTestId('detailsRoom54');
  if (await roomDetails.isVisible()) {
    await roomDetails.click();
  } else {
    await page.getByText('Sala de Juntas QA').first().click();
  }

  // ========== ACCIONES EN LA SALA ==========
  await page.getByTestId('customMenu').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByTestId('customMenu').click();
  
  const verReservasItem = page.getByRole('menuitem', { name: 'Ver Reservas' });
  await expect(verReservasItem).toBeVisible();
  await verReservasItem.click();

  // Verificar que navegó a la vista de reservas
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/.*reservations.*/);
});
