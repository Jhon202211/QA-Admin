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

  // Esperar a que el sidebar se renderice y se vea el botón Espacios de trabajo
  const workSpacesButton = page.getByRole('button', { name: 'Espacios de trabajo' });
  await expect(workSpacesButton).toBeVisible({ timeout: 10000 });
  await workSpacesButton.scrollIntoViewIfNeeded();
  await workSpacesButton.click();

  // Esperar a que el menú del sidebar se abra y aparezca la opción "Áreas de trabajo"
  const areasTrabajoLink = page.getByRole('link', { name: 'Áreas de trabajo' });
  await expect(areasTrabajoLink).toBeVisible({ timeout: 10000 });
  await areasTrabajoLink.click();

  // Esperar a que cargue la página de Áreas de trabajo
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  await page.getByText('Copropiedad', { exact: true }).click();
  await page.locator('#react-select-2-input').fill('yanine');

  // Esperar a que carguen y se muestren los resultados del filtro de copropiedad
  const copropiedadOption = page.getByText('Copropiedad Yanine', { exact: true });
  await expect(copropiedadOption).toBeVisible({ timeout: 10000 });
  await copropiedadOption.click();

  // Seleccionar "Editar" desde el menú de los tres puntos
  const menuButton = page.locator('[id="headlessui-menu-button-:rh:"]');
  await expect(menuButton).toBeVisible({ timeout: 10000 });
  await menuButton.click();

  const editMenuItem = page.getByRole('menuitem', { name: 'Editar' });
  await expect(editMenuItem).toBeVisible({ timeout: 10000 });
  await editMenuItem.click();

  // Esperar a que cargue el formulario de edición de área de trabajo
  const areaNameInput = page.getByTestId('input-name');
  await expect(areaNameInput).toBeVisible({ timeout: 10000 });

  await areaNameInput.click();
  await areaNameInput.fill('Area Yanine I editado');

  const saveButton = page.getByRole('button', { name: 'Guardar cambios' });
  await expect(saveButton).toBeVisible({ timeout: 10000 });
  await saveButton.click();

  // Esperar a que se procese el guardado y recargue la página
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  const backToListLink = page.getByRole('link', { name: 'Volver a la lista' });
  await expect(backToListLink).toBeVisible({ timeout: 10000 });
  await backToListLink.click();
});