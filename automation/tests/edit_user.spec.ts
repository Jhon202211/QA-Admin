import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const BASE_URL = process.env.BASE_URL || '';
const USER_EMAIL = process.env.USER_EMAIL || '';
const USER_PASSWORD = process.env.USER_PASSWORD || '';
const USER_TO_EDIT = process.env.USER_TO_EDIT || '';

test('Editar usuario', async ({ page }) => {
  test.skip(!USER_TO_EDIT, 'Define USER_TO_EDIT en .env con el correo del usuario a editar');
  try {
    // ========== VISTA 1: LOGIN ==========
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Validaciones login
    await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();

    // Login
    await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(USER_EMAIL);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill(USER_PASSWORD);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await page.waitForLoadState('networkidle');

    // ========== NAVEGAR A USUARIOS ==========
    const controlAccesoButton = page.getByRole('button', { name: 'Control de acceso' });
    await expect(controlAccesoButton).toBeVisible({ timeout: 10000 });
    await controlAccesoButton.click();

    await expect(page.getByRole('link', { name: 'Usuarios' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('link', { name: 'Usuarios' }).click();

    // ========== LISTA DE USUARIOS ==========
    await expect(page).toHaveURL(/.*users.*/, { timeout: 10000 });
    await expect(page.getByRole('textbox', { name: /Buscar/i })).toBeVisible();

    const searchInput = page.getByRole('textbox', { name: /Buscar/i });
    await searchInput.fill(USER_TO_EDIT);
    await page.waitForTimeout(1000);

    // ========== MENÚ Y EDICIÓN ==========
    const menuButton = page.getByRole('button', { name: 'menu' }).first();
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();

    await expect(page.getByRole('link', { name: 'Editar' })).toBeVisible({ timeout: 3000 });
    await page.getByRole('link', { name: 'Editar' }).click();

    // ========== FORMULARIO DE EDICIÓN ==========
    await expect(page.getByTestId('input-last_name')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Editar Usuario' })).toBeVisible();

    await page.getByTestId('input-last_name').fill('EDITADO_QA_AUTOMATIZACION');
    await page.getByTestId('input-phone').fill('9998887776');

    const commentInput = page.getByTestId('input-comment');
    await expect(commentInput).toBeVisible({ timeout: 3000 });
    await commentInput.clear();
    await commentInput.fill('EDITADO_POR_TEST_AUTOMATIZADO_PLAYWRIGHT');

    await page.getByRole('button', { name: 'Editar Usuario' }).click();

    // ========== MODAL DE CONFIRMACIÓN ==========
    await expect(page.getByRole('button', { name: 'Cerrar' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByRole('button', { name: 'Cerrar' })).not.toBeVisible({ timeout: 3000 });

  } catch (error) {
    console.log('❌ Test falló. Pausando para debug...');
    await page.pause();
    throw error;
  }
});