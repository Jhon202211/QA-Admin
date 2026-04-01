import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { generateExcelFile } from './helpers/generateExcelFile';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const BASE_URL = process.env.BASE_URL;
const RECORDS_COUNT = 25; // Cantidad de registros a generar por ejecución

test('test', async ({ page }) => {
  // Generar archivo Excel con nuevos registros
  const filePath = generateExcelFile(RECORDS_COUNT);
  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(process.env.USER_EMAIL || '');
  await page.getByRole('textbox', { name: '*********' }).click();
  await page.getByRole('textbox', { name: '*********' }).fill(process.env.USER_PASSWORD || '');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  
  // Esperar a que la página cargue después del login
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
  
  // Esperar a que el sidebar se renderice completamente
  await page.waitForLoadState('domcontentloaded');
  const controlAccesoButton = page.getByRole('button', { name: 'Control de acceso' });
  await expect(controlAccesoButton).toBeVisible({ timeout: 10000 });
  
  // Hacer click en Control de acceso y esperar a que se vea el menú del sidebar
  await controlAccesoButton.scrollIntoViewIfNeeded();
  await controlAccesoButton.click();
  
  // Esperar a que aparezca el list del sidebar (menú desplegable)
  await expect(page.getByRole('link', { name: 'Usuarios' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('link', { name: 'Usuarios' }).click();

  await page.getByTestId('button-outline').nth(1).click();
  await page.getByRole('link', { name: 'Desde Excel' }).click();
  await page.locator('div').filter({ hasText: /^Ninguna$/ }).nth(3).click();
  await page.locator('#react-select-2-input').fill('yanine');
  await page.getByText('Copropiedad Yanine', { exact: true }).click();
  await page.getByText('Ninguna').click();
  await page.getByRole('textbox', { name: 'Asociar usuarios a las' }).fill('yan');
  await page.locator('#react-select-3-option-0').click();
  
  // Cargar archivo Excel generado dinámicamente
  const fileInput = page.locator('input[type="file"]').first();
  await expect(fileInput).toBeVisible({ timeout: 10000 });
  await fileInput.setInputFiles(filePath);
  
  // Esperar a que el archivo se procese y aparezca el botón de verificar
  await page.waitForTimeout(1000);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: 'Verificar archivo Excel' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Verificar archivo Excel' }).click();
  
  // Esperar a que se complete la verificación
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Continuar con los siguientes pasos
  await page.getByTestId('button-undefined').nth(1).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.getByTestId('button-undefined').first().click();
});