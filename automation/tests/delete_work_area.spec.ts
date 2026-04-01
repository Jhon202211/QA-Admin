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

  // Esperar a que la página cargue después del login
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  // Esperar a que el sidebar se renderice completamente y se vea el botón de Espacios de trabajo
  const workSpacesButton = page.getByRole('button', { name: 'Espacios de trabajo' });
  await expect(workSpacesButton).toBeVisible({ timeout: 10000 });
  await workSpacesButton.scrollIntoViewIfNeeded();
  await workSpacesButton.click();

  // Esperar a que el menú del sidebar se abra y aparezca la opción "Áreas de trabajo"
  const areasTrabajoLink = page.getByRole('link', { name: 'Áreas de trabajo' });
  await expect(areasTrabajoLink).toBeVisible({ timeout: 10000 });
  await areasTrabajoLink.click();

  // Esperar a que cargue completamente la página de "Áreas de trabajo"
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  const searchInput = page.getByRole('textbox', { name: 'Buscar por nombre de áreas de' });
  await searchInput.click();
  await searchInput.fill('eliminar area');

  // Esperar a que carguen los resultados filtrados y obtener una tarjeta específica
  await page.waitForLoadState('networkidle');
  const areaCard = page
    .getByTestId(/detailsWorkArea/)
    .filter({ hasText: 'eliminar area' })
    .first();
  await expect(areaCard).toBeVisible({ timeout: 10000 });

  // Abrir el menú de los tres puntos de esa tarjeta
  const menuButton = areaCard.locator('[id^="headlessui-menu-button"]');
  await expect(menuButton).toBeVisible({ timeout: 10000 });
  await menuButton.click();

  // Seleccionar "Eliminar" desde el menú de los tres puntos de esa tarjeta
  const deleteMenuItem = page.getByRole('menuitem', { name: 'Eliminar' });
  await expect(deleteMenuItem).toBeVisible({ timeout: 10000 });
  await deleteMenuItem.click();

  // Esperar a que aparezca el modal de confirmación de eliminación
  const confirmButton = page.getByTestId('undefined-confirmation-modal-confirm-button');
  await expect(confirmButton).toBeVisible({ timeout: 10000 });
  await confirmButton.click();

  // Esperar a que se procese la eliminación y recargue la vista
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
});