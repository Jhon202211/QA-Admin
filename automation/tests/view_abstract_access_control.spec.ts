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
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill('userrfid2109@refactor.com');
  await page.getByRole('textbox', { name: '*********' }).click();
  await page.getByRole('textbox', { name: '*********' }).fill('userrfid2109');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  
  // Esperar a que la página cargue después del login
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
  
  // ========== NAVEGAR A CONTROL DE ACCESO ==========
  // Esperar a que el botón "Control de acceso" esté visible en el sidebar
  const controlAccesoButton = page.getByRole('button', { name: 'Control de acceso' });
  await expect(controlAccesoButton).toBeVisible({ timeout: 10000 });
  await controlAccesoButton.scrollIntoViewIfNeeded();
  await controlAccesoButton.click();
  
  // Esperar a que se expanda el menú del sidebar y aparezcan las opciones
  await page.waitForTimeout(500); // Pequeño delay para que se complete la animación del menú
  await expect(page.getByRole('link', { name: 'Resumen' })).toBeVisible({ timeout: 10000 });
  
  // ========== NAVEGAR A RESUMEN ==========
  await page.getByRole('link', { name: 'Resumen' }).click();
  
  // Esperar a que cargue la página de Resumen
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
});