import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const USER_EMAIL = process.env.USER_EMAIL || '';
const USER_PASSWORD = process.env.USER_PASSWORD || '';
const BASE_URL = process.env.BASE_URL;

test('test', async ({ page }) => {
  // ========== LOGIN ==========
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  // Validar elementos del login
  await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  
  // Realizar login
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  
  // Esperar a que se complete el login
  await page.waitForLoadState('networkidle');
  
  // ========== NAVEGAR A COPROPIEDADES ==========
  await page.getByRole('button', { name: 'Organización' }).click();
  await page.getByRole('link', { name: 'Copropiedades' }).click();
  await page.getByRole('textbox', { name: 'Escriba el término para' }).click();
  await page.getByRole('textbox', { name: 'Escriba el término para' }).fill('staging');
  await page.getByText('Queo Q&A (Staging)').click();
  await page.getByRole('textbox', { name: 'Escriba el término para' }).click();
  await page.getByRole('textbox', { name: 'Escriba el término para' }).fill('oficina queo');
  await page.goto(`${BASE_URL}/properties?search=oficina%20queo&searchType=name&`);
  await page.getByText('Oficina Queo').click();
  await page.getByText('NIT').click();
  await page.getByText('Directorio Activo: Google').click();
  await page.getByText('Calendario: Google').click();
//============Busqueda de otra property==============
  await page.getByRole('textbox', { name: 'Escriba el término para' }).click();
  await page.getByRole('textbox', { name: 'Escriba el término para' }).fill('staging');
  await page.getByText('NIT').click();
  await page.getByText('Directorio Activo: Microsoft').click();
  await page.getByText('Calendario: Microsoft').click();
  await page.getByRole('link', { name: 'Automatics QA Admin' }).click();
  await page.getByRole('button', { name: ' Salir' }).click();

  // ---------------------
  await page.close();
  await page.close();
});