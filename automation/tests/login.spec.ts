import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const BASE_URL = process.env.BASE_URL || 'https://alex.queo.dev';
const USER_EMAIL = process.env.USER_EMAIL;
const USER_PASSWORD = process.env.USER_PASSWORD;

test('test', async ({ page }) => {
  test.skip(!USER_EMAIL || !USER_PASSWORD, 'Definir USER_EMAIL y USER_PASSWORD en .env');

  await page.goto(`${BASE_URL}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(USER_EMAIL!);
  // Campo contraseña: id="password" (visto en DevTools)
  await page.locator('#password').fill(USER_PASSWORD!);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  
  // Esperar a que la página cargue después del login
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
});