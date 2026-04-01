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
const PROPERTY_NAME = process.env.PROPERTY_NAME || 'QA Prueba Auto (No tocar)';

test('Configurar proveedor Microsoft para propiedad', async ({ page }) => {
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
    
    // ========== VISTA 2: NAVEGAR A COPROPIEDADES ==========
    await page.getByRole('button', { name: 'Organización' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('link', { name: 'Copropiedades' }).click();
    await page.waitForLoadState('networkidle');
    
    // ========== VISTA 3: BUSCAR Y SELECCIONAR PROPIEDAD ==========
    await page.getByRole('textbox', { name: 'Escriba el término para' }).click();
    await page.getByRole('textbox', { name: 'Escriba el término para' }).fill(PROPERTY_NAME);
    await page.waitForTimeout(2000); // Esperar a que aparezcan los resultados
    
    // Hacer click en la propiedad encontrada
    await page.getByText(PROPERTY_NAME).click();
    await page.waitForTimeout(2000); // Esperar a que se cargue la vista de detalles
    
    // ========== VISTA 4: ABRIR MENÚ Y CONFIGURAR PROVEEDOR ==========
    // Abrir menú personalizado
    await page.getByTestId('customMenu').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('customMenu').click();
    await page.waitForTimeout(1000);
    
    // Click en botón de configuración de proveedores
    await page.getByTestId('button-config-providers').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('button-config-providers').click();
    await page.waitForTimeout(2000);
    
    // Seleccionar Microsoft
    await page.getByRole('button', { name: 'google icon Microsoft' }).waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: 'google icon Microsoft' }).click();
    await page.waitForTimeout(1000);
    
    // Activar el proveedor
    await page.getByRole('button', { name: 'Activar' }).waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: 'Activar' }).click();
    await page.waitForTimeout(2000);
    
    // ========== VISTA 5: VERIFICAR CONFIGURACIÓN ==========
    // Volver a buscar la propiedad para verificar la configuración
    await page.getByRole('textbox', { name: 'Escriba el término para' }).click();
    await page.getByRole('textbox', { name: 'Escriba el término para' }).fill(PROPERTY_NAME);
    await page.waitForTimeout(2000);
    
    // Verificar que la configuración de Microsoft esté activa
    await page.getByText('Directorio Activo: Microsoft').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByText('Calendario: Microsoft').waitFor({ state: 'visible', timeout: 5000 });
    
    // Validar que los elementos están visibles
    await expect(page.getByText('Directorio Activo: Microsoft')).toBeVisible();
    await expect(page.getByText('Calendario: Microsoft')).toBeVisible();
    
    console.log('✅ Configuración de proveedor Microsoft completada exitosamente');
    
  } catch (error) {
    console.log('❌ Test falló. Pausando para debug...');
    await page.pause();
    throw error;
  }
});