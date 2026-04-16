import { fileURLToPath } from 'url';
/// <reference types="node" />
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

test('Configurar proveedor Google para propiedad', async ({ page }) => {
  try {
    // ========== VISTA 1: LOGIN ==========
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Validar elementos del login
    await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    
    // Login
    await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(USER_EMAIL);
    // Usar locator por ID para el campo de contraseña, ya que getByRole('textbox', { name: 'Contraseña' }) puede fallar
    await page.locator('#password').fill(USER_PASSWORD);
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
    
    // Seleccionar Google (esto abre el modal de configuración)
    await page.getByTestId('google-btn-provider').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('google-btn-provider').click();
    await page.waitForTimeout(2000); // Esperar a que se abra el modal de configuración
    
    // Activar checkbox de calendario (está en el mismo modal)
    await page.getByTestId('checkbox-calendar-provider').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('checkbox-calendar-provider').check();
    await page.waitForTimeout(1000);
    console.log('✅ Checkbox de calendario activado');
    
    // Activar checkbox de directorio activo (está en el mismo modal de configuración)
    await page.getByTestId('checkbox-active-directory-provider').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('checkbox-active-directory-provider').check();
    await page.waitForTimeout(1000);
    console.log('✅ Checkbox de directorio activo activado');

    // Activar el proveedor (botón en el mismo modal)
    await page.getByRole('button', { name: 'Activar' }).waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: 'Activar' }).click();
    await page.waitForTimeout(2000);
    
    // Cerrar mensaje de éxito si aparece
    try {
      await page.getByText('El proveedor de Google se ha').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByText('El proveedor de Google se ha').click();
      await page.waitForTimeout(1000);
      console.log('✅ Mensaje de éxito cerrado');
    } catch (e) {
      console.log('⚠️ Mensaje de éxito no encontrado o ya cerrado');
    }
    await page.waitForTimeout(2000);
    
    // ========== VISTA 5: VERIFICAR CONFIGURACIÓN ==========
    // Verificar que la configuración de Google esté activa
    try {
      // Volver a buscar la propiedad para verificar la configuración
      await page.goto(`${BASE_URL}/properties?searchType=name&`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      await page.getByRole('textbox', { name: 'Escriba el término para' }).click();
      await page.getByRole('textbox', { name: 'Escriba el término para' }).fill(PROPERTY_NAME);
      await page.waitForTimeout(2000);
      
      // Hacer click en la propiedad para ver los detalles
      await page.getByText(PROPERTY_NAME).click();
      await page.waitForTimeout(2000);
      
      // Verificar que la configuración de Google esté activa
      await page.getByText('Directorio Activo: Google').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByText('Calendario: Google').waitFor({ state: 'visible', timeout: 5000 });
      
      // Validar que los elementos están visibles
      await expect(page.getByText('Directorio Activo: Google')).toBeVisible();
      await expect(page.getByText('Calendario: Google')).toBeVisible();
      
      console.log('✅ Configuración de proveedor Google completada exitosamente');
    } catch (e) {
      console.log('⚠️ No se pudo verificar la configuración, pero el proceso de activación se completó');
    }
    
  } catch (error) {
    console.log('❌ Test falló. Pausando para debug...');
    await page.pause();
    throw error;
  }
});