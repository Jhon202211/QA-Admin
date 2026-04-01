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

  const areaName = `Prueba eliminar area ${Date.now()}`;

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

  // Esperar a que el sidebar se renderice y se vea el botón Espacios de trabajo
  const workSpacesButton = page.getByRole('button', { name: 'Espacios de trabajo' });
  await expect(workSpacesButton).toBeVisible({ timeout: 10000 });
  await workSpacesButton.scrollIntoViewIfNeeded();
  await workSpacesButton.click();

  // Esperar a que el menú del sidebar se abra y aparezca la opción "Áreas de trabajo"
  const areasTrabajoLink = page.getByRole('link', { name: 'Áreas de trabajo' });
  await expect(areasTrabajoLink).toBeVisible({ timeout: 10000 });
  await areasTrabajoLink.click();

  // Esperar a que cargue completamente la página de Áreas de trabajo
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  await page.getByRole('button', { name: 'Añadir área' }).click();

  // Esperar a que cargue la página/formulario de añadir área
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  await page.getByTestId('input-name').click();
  await page.getByTestId('input-name').fill(areaName);
  await page.locator('div').filter({ hasText: /^Ninguna$/ }).nth(2).click();
  await page.getByRole('textbox', { name: 'Copropiedad' }).fill('yanine');
  await page.getByText('Copropiedad Yanine', { exact: true }).click();

  // Crear el área y esperar explícitamente a estar en la vista de edición
  await Promise.all([
    page.waitForURL('**/work-areas/**/edit'),
    page.getByRole('button', { name: 'Crear área' }).click(),
  ]);
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  // Ahora estamos en /work-areas/{id}/edit: esperar al botón que abre el modal y hacer clic
  const createSpaceButton = page.locator('xpath=//*[@id="react-root"]/div/form/div/div/div/div[4]/div/div[1]/div/button');
  await expect(createSpaceButton).toBeVisible({ timeout: 10000 });
  await createSpaceButton.click();

  // Esperar a que se abra el modal (formulario de crear puesto)
  const modal = page.locator('body > div.fade.modal.show > div > div');
  await expect(modal).toBeVisible({ timeout: 10000 });

  const modalSpaceNameInput = modal.getByTestId('input-space_name');
  await expect(modalSpaceNameInput).toBeVisible({ timeout: 10000 });

  await modalSpaceNameInput.click();
  await modalSpaceNameInput.fill('prueba ');
  await modal.getByTestId('input-reservation_time_hours').click();
  await modal.getByTestId('input-reservation_time_hours').fill('200');
  await modal.getByRole('checkbox', { name: 'Crear múltiples' }).check();
  await modal.getByTestId('input-make_quantity').click();
  await modal.getByTestId('input-make_quantity').fill('10');
  await page.getByRole('button', { name: 'Crear puesto' }).click();

  // Esperar a que se abra el modal de confirmación de la creación
  const okButton = page.getByRole('button', { name: 'OK' });
  await expect(okButton).toBeVisible({ timeout: 10000 });
  await okButton.click();

  // Esperar a que cargue la vista después de cerrar el modal
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  await page.getByRole('link', { name: 'Volver a la lista' }).click();

  // Esperar a que cargue la página de la lista
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  const searchInput = page.getByRole('textbox', { name: 'Buscar por nombre de áreas de' });
  await searchInput.click();
  await searchInput.fill('eliminar area');

  // Esperar a que carguen los resultados de búsqueda y validar que se muestre lo buscado
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  const areaCard = page
    .getByTestId(/detailsWorkArea/)
    .filter({ hasText: areaName })
    .first();
  await expect(areaCard).toBeVisible({ timeout: 10000 });
});