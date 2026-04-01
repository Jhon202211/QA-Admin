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

  // ========== NAVEGAR A CONTROL DE ACCESO ==========
  const controlAccesoButton = page.getByRole('button', { name: 'Control de acceso' });
  await expect(controlAccesoButton).toBeVisible({ timeout: 10000 });
  await controlAccesoButton.scrollIntoViewIfNeeded();
  await controlAccesoButton.click();

  // Esperar a que se expanda el menú del sidebar y aparezca la opción "Resumen"
  await page.waitForTimeout(500);
  await expect(page.getByRole('link', { name: 'Resumen' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('link', { name: 'Resumen' }).click();

  // Esperar a que cargue la página de Resumen
  await page.waitForLoadState('networkidle');

  //Filtro de Ocupación de zonas
  await page.locator('.css-19bqh2r').first().click();
  await page.getByText('Copropiedades').nth(2).click();
  await page.locator('#react-select-2-input').fill('stagin');
  await page.getByText('Queo Q&A (Staging)', { exact: true }).click();
  await page.getByText('Zonas').nth(1).click();
  await page.locator('#react-select-3-input').fill('sala de t');
  await page.getByText('Sala de Tecnología', { exact: true }).click();
  await page.getByText('Empresas').nth(2).click();
  await page.locator('#react-select-4-input').fill('stag');
  await page.locator('#react-select-4-option-0').click();
  await page.getByRole('textbox', { name: 'Rango de fecha Rango de fecha' }).click();
  await page.getByRole('button', { name: 'Previous Month' }).click();
  await page.getByRole('button', { name: 'Previous Month' }).click();
  await page.getByRole('listbox', { name: /month 2025/ }).getByRole('option', { name: /lunes, 1 de diciembre/ }).click();
  await page.getByRole('listbox', { name: /month 2025/ }).getByRole('option', { name: /miércoles, 31 de/ }).click();

  //Filtro de Promedio de entradas y salidas
  await page.locator('[id="headlessui-disclosure-panel-:r4:"] > .grid.grid-cols-10.gap-4.items-end.lg\\:divide-x > .grid.col-span-10.gap-4.md\\:ph-6 > div > .relative > .css-2b097c-container > .react-select__control > .react-select__value-container > .css-1rhbuit-multiValue > .css-xb97g8 > .css-19bqh2r').first().click();
  await page.locator('#react-select-5-input').fill('s');
  await page.getByText('Copropiedades').nth(3).click();
  await page.locator('div').filter({ hasText: /^Copropiedades$/ }).nth(5).click();
  await page.locator('#react-select-5-input').fill('stag');
  await page.locator('#react-select-5-option-0').click();
  await page.locator('[id="headlessui-disclosure-panel-:r4:"] #dateRange').click();
  await page.getByRole('button', { name: 'Previous Month' }).click();
  await page.getByRole('button', { name: 'Previous Month' }).click();
  await page.getByRole('listbox', { name: /month 2025/ }).getByRole('option', { name: /lunes, 1 de diciembre/ }).click();
  await page.getByRole('listbox', { name: /month 2025/ }).getByRole('option', { name: /miércoles, 31 de/ }).click();
  
  //Filtro de Accesos de usuarios y visitantes
  await page.locator('.grid.col-span-10.gap-4.md\\:ph-6.lg\\:pb-0.pb-6.xl\\:p-0.border-b-2.items-end.grid-cols-12.lg\\:col-span-5.lg\\:border-color-grayBlue-1000.lg\\:border-b-0.lg\\:col-span-7 > div > .relative > .css-2b097c-container > .react-select__control > .react-select__value-container > .css-1rhbuit-multiValue > .css-xb97g8 > .css-19bqh2r').first().click();
  await page.locator('div').filter({ hasText: /^Copropiedades$/ }).nth(4).click();
  await page.locator('#react-select-8-input').fill('stag');
  await page.locator('#react-select-8-option-0').click();
  await page.locator('[id="headlessui-disclosure-panel-:r7:"] #dateRange').click();
  await page.getByRole('button', { name: 'Previous Month' }).click();
  await page.getByRole('button', { name: 'Previous Month' }).click();
  await page.getByRole('listbox', { name: /month 2025/ }).getByRole('option', { name: /lunes, 1 de diciembre/ }).click();
  await page.getByRole('listbox', { name: /month 2025/ }).getByRole('option', { name: /miércoles, 31 de/ }).click();
});