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
  await expect(page.getByRole('button', { name: 'Organización' })).toBeVisible();
  
  // Esperar a que la página esté completamente cargada antes de interactuar con el sidebar
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  
  // Buscar el botón "Organización" en el sidebar
  const organizacionButton = page.getByRole('button', { name: 'Organización' });
  await expect(organizacionButton).toBeVisible({ timeout: 10000 });
  await organizacionButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await organizacionButton.click();
  
  // Esperar a que aparezca el menú desplegable y validar que "Empresas" esté en la lista
  await expect(page.getByRole('link', { name: 'Empresas' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('link', { name: 'Empresas' }).click();
  
  // Esperar a que cargue la vista de empresas
  await expect(page).toHaveURL(/.*companies.*/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('searchbox', { name: 'Buscar:' })).toBeVisible({ timeout: 5000 });
  
  // Buscar empresa
  const searchBox = page.getByRole('searchbox', { name: 'Buscar:' });
  await searchBox.click();
  await searchBox.fill('Empresa Yanine');
  await searchBox.press('Enter');
  
  // Esperar a que se complete el filtrado
  await page.waitForLoadState('networkidle');
  
  // Esperar a que el botón del menú esté visible y hacer click
  const menuButton = page.locator('#dropdownMenuButton');
  await expect(menuButton).toBeVisible({ timeout: 10000 });
  await menuButton.click();
  
  await page.getByRole('link', { name: 'Editar' }).click();
  await page.locator('#name2736').click();
  await page.locator('#name2736').fill('Empresa Yan I editado editado');
  await page.locator('#dni2736').click();
  await page.locator('#dni2736').fill('432450001');
  await page.locator('#phone2736').click();
  await page.locator('#phone2736').fill('432450001');
  await page.getByRole('button', { name: 'Editar Empresa' }).click();
  await page.getByRole('button', { name: 'Cerrar' }).click();
});