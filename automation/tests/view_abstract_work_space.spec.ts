import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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
  
  // ========== NAVEGAR A ESPACIOS DE TRABAJO ==========
  const espaciosTrabajoButton = page.getByRole('button', { name: 'Espacios de trabajo' });
  await expect(espaciosTrabajoButton).toBeVisible({ timeout: 10000 });
  await espaciosTrabajoButton.scrollIntoViewIfNeeded();
  await espaciosTrabajoButton.click();
  // Esperar a que se expanda el menú del sidebar y aparezca la opción "Resumen"
  await page.waitForTimeout(500);
  await expect(page.getByRole('link', { name: 'Resumen' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('link', { name: 'Resumen' }).click();
  // Esperar a que cargue la página de Resumen
  await page.waitForLoadState('networkidle');
});