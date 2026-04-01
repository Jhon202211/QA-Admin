import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const BASE_URL = process.env.BASE_URL || 'https://alex.queo.dev';
const USER_EMAIL = process.env.USER_EMAIL || '';
const USER_PASSWORD = process.env.USER_PASSWORD || '';
const VISITOR_DNI = process.env.VISITOR_TO_AUTORIZED || process.env.VISITOR_DNI || '10234284';

test('mostrar detalles del visitante', async ({ page }) => {
  // ========== LOGIN ==========
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: '*********' }).click();
  await page.getByRole('textbox', { name: '*********' }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  // ========== NAVEGAR A VISITANTES ==========
  const controlAccesoButton = page.getByRole('button', { name: 'Control de acceso' });
  await expect(controlAccesoButton).toBeVisible({ timeout: 10000 });
  await controlAccesoButton.scrollIntoViewIfNeeded();
  await controlAccesoButton.click();

  await page.waitForTimeout(500);
  await expect(page.getByRole('link', { name: 'Visitantes' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('link', { name: 'Visitantes' }).click();

  await page.waitForLoadState('networkidle');

  // ========== BUSCAR VISITANTE ==========
  const searchInput = page.getByRole('textbox', { name: 'Escriba el término para' });
  await expect(searchInput).toBeVisible({ timeout: 10000 });
  await searchInput.click();
  await searchInput.fill(VISITOR_DNI);

  await expect(page.getByText('Autorizar Visitante')).toBeVisible({ timeout: 10000 });
  await page.getByText('Autorizar Visitante').click();

  // ========== ABRIR DETALLES DEL VISITANTE ==========
  await page.getByText(VISITOR_DNI, { exact: true }).click();

  // ========== ESPERAR Y VERIFICAR MODAL DE DETALLES ==========
  // Esperar a que el modal/diálogo esté visible
  const modalTitle = page.getByText('Autorizar Visitante', { exact: true });
  await expect(modalTitle).toBeVisible({ timeout: 15000 });

  // Verificar que el modal muestra el DNI del visitante (exact: true evita el texto "RESULTADOS PARA ...")
  await expect(page.getByText(VISITOR_DNI, { exact: true })).toBeVisible({ timeout: 10000 });
});
