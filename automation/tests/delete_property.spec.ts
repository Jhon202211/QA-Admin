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
const PROPERTY_TO_DELETE = process.env.PROPERTY_TO_DELETE || 'Property to delete';

test('Eliminar propiedad', async ({ page }) => {
  try {
    // ========== VISTA 1: LOGIN ==========
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Validar elementos del login
    await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    
    // Login
    await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(USER_EMAIL);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill(USER_PASSWORD);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    
    // Esperar a que se complete el login
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // ========== VISTA 2: NAVEGAR A COPROPIEDADES ==========
    await page.getByRole('button', { name: 'Organización' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('link', { name: 'Copropiedades' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // ========== VISTA 3: BUSCAR Y ELIMINAR PROPIEDAD ==========
    // Buscar la propiedad
    await page.getByRole('textbox', { name: 'Escriba el término para' }).click();
    await page.getByRole('textbox', { name: 'Escriba el término para' }).fill(PROPERTY_TO_DELETE);
    await page.waitForTimeout(1000);
    
    // Hacer click en la propiedad encontrada
    await page.getByText(PROPERTY_TO_DELETE).click();
    await page.waitForTimeout(1000);
    
    // Abrir el menú de opciones
    await page.getByTestId('customMenu').click();
    await page.waitForTimeout(500);
    
    // Seleccionar la opción Eliminar
    await page.getByRole('menuitem', { name: 'Eliminar' }).click();
    await page.waitForTimeout(1000);
    
    // Confirmar la eliminación en el modal
    const confirmButton = page.getByTestId('undefined-confirmation-modal-confirm-button');
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await confirmButton.click();
    await page.waitForTimeout(2000);
    
    // Verificar mensaje de éxito
    const successMessage = page.getByText('Eliminación realizada');
    await successMessage.waitFor({ state: 'visible', timeout: 10000 });
    await expect(successMessage).toBeVisible();
    console.log('✅ Propiedad eliminada exitosamente');
    
    // Opcional: Cerrar el mensaje si hay un botón de cerrar
    try {
      const closeButton = page.getByRole('button', { name: /OK|Cerrar/i }).first();
      await closeButton.waitFor({ state: 'visible', timeout: 3000 });
      await closeButton.click();
      await page.waitForTimeout(1000);
    } catch (e) {
      // Si no hay botón de cerrar, continuar
      console.log('⚠️ No se encontró botón de cerrar, continuando...');
    }
    
  } catch (error) {
    console.log('❌ Test falló. Pausando para debug...');
    // Tomar screenshot del error
    const timestamp = Date.now();
    await page.screenshot({ path: `screenshot_error_/screenshot_error_${timestamp}.png` });
    await page.pause();
    throw error;
  }
});