import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const BASE_URL = process.env.BASE_URL;

test('test', async ({ page }) => {
  // ========== LOGIN ==========
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(process.env.USER_EMAIL || '');
  await page.getByRole('textbox', { name: '*********' }).click();
  await page.getByRole('textbox', { name: '*********' }).fill(process.env.USER_PASSWORD || '');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  
  // Esperar a que la página cargue después del login
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  const controlAccesoButton = page.getByRole('button', { name: 'Control de acceso' });
  await expect(controlAccesoButton).toBeVisible({ timeout: 10000 });
  await controlAccesoButton.scrollIntoViewIfNeeded();
  await controlAccesoButton.click();
  // Esperar a que se expanda el menú del sidebar y aparezca la opción "Historial de accesos"
  await page.waitForTimeout(500); // Pequeño delay para que se complete la animación del menú
  await expect(page.getByRole('link', { name: 'Historial de accesos' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('link', { name: 'Historial de accesos' }).click();
  // Esperar a que cargue la página de Historial de accesos
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="filterBtn"]', { timeout: 10000 });
  await page.getByTestId('filterBtn').click();
  // Esperar a que cargue el calendario después de hacer clic en el botón de filtros
  await expect(page.getByRole('textbox', { name: 'Filtrar por fecha' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('textbox', { name: 'Filtrar por fecha' }).click();
  await page.getByRole('option', { name: 'Choose jueves, 1 de enero de' }).click();
  await page.getByRole('option', { name: 'Choose miércoles, 14 de enero de' }).click();
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  // Esperar a que cargue la página con los resultados filtrados
  await page.waitForLoadState('networkidle');
  await page.getByRole('cell', { name: '-' }).nth(1).click({
    button: 'middle'
  });
  await page.getByRole('textbox', { name: 'Comentario Comentario' }).dblclick();
  await page.getByRole('textbox', { name: 'Comentario Comentario' }).fill('prueba para comentarios');
  await page.getByRole('row', { name: '13/01/26 11:54am Acceso' }).locator('button').click();
});