import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const BASE_URL = process.env.BASE_URL;

// slowMo se configura automáticamente desde playwright.config.ts
// cuando se ejecuta con la variable de entorno SLOW_MO

test('Buscar empresas', async ({ page }) => {
  try {
    // ========== VISTA 1: LOGIN ==========
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('textbox', { name: 'Correo electrónico' }).click();
    await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(process.env.USER_EMAIL || '');
    await page.getByRole('textbox', { name: '*********' }).click();
    await page.getByRole('textbox', { name: '*********' }).fill(process.env.USER_PASSWORD || '');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    
    // Esperar a que la página cargue después del login
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
    
    // ========== VISTA 2: DASHBOARD ==========
    try {
      // Esperar a que cargue la página del dashboard
      await expect(page).toHaveURL(/.*work-areas\/dashboard.*/, { timeout: 10000 });
      
      // Validar que el dashboard cargó correctamente
      await expect(page.getByRole('button', { name: 'Organización' })).toBeVisible();
    } catch (error) {
      console.log('❌ Error en VISTA 2: DASHBOARD. Pausando para debug...');
      await page.pause();
      throw error;
    }
    
    // ========== VISTA 3: NAVEGAR A EMPRESAS ==========
    try {
      // "Organización" está en un sidebar - esperar a que la página esté completamente cargada
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');
      
      // Esperar un momento para que el sidebar termine de renderizar
      await page.waitForTimeout(500);
      
      // Buscar el botón "Organización" - puede estar en el sidebar
      const organizacionButton = page.getByRole('button', { name: 'Organización' });
      
      // Esperar a que el botón esté visible (el sidebar puede tardar en cargar)
      await expect(organizacionButton).toBeVisible({ timeout: 10000 });
      
      // Hacer scroll si es necesario (importante en sidebars que pueden tener scroll)
      await organizacionButton.scrollIntoViewIfNeeded();
      
      // Esperar a que el botón esté estable (sin animaciones)
      await page.waitForTimeout(300);
      
      // Hacer click
      await organizacionButton.click();
      
      // Esperar a que aparezca el menú desplegable y seleccionar "Empresas"
      await expect(page.getByRole('link', { name: 'Empresas' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('link', { name: 'Empresas' }).click();
    } catch (error) {
      console.log('❌ Error en VISTA 3: NAVEGAR A EMPRESAS. Pausando para debug...');
      await page.pause();
      throw error;
    }
    
    // ========== VISTA 4: LISTA DE EMPRESAS ==========
    try {
      // Esperar a que cargue la página de empresas
      // La URL usa "companies" en inglés
      await expect(page).toHaveURL(/.*companies.*/, { timeout: 10000 });
      
      // Esperar a que la página termine de cargar completamente
      await page.waitForLoadState('networkidle');
      
      // Validar que el campo de búsqueda esté visible
      await expect(page.getByRole('searchbox', { name: 'Buscar:' })).toBeVisible({ timeout: 5000 });
    } catch (error) {
      console.log('❌ Error en VISTA 4: LISTA DE EMPRESAS. Pausando para debug...');
      await page.pause();
      throw error;
    }
    
    // ========== VISTA 5: BUSCAR EMPRESA ==========
    try {
      // Buscar empresa
      const searchBox = page.getByRole('searchbox', { name: 'Buscar:' });
      await searchBox.click();
      await searchBox.fill('yanine');
      await searchBox.press('Enter');
      
      // Esperar a que se complete la búsqueda
      await page.waitForLoadState('networkidle');
      
      // Validar que la búsqueda se completó (opcional - ajusta según tu aplicación)
      // Por ejemplo: await expect(page.locator('text=yanine').first()).toBeVisible();
    } catch (error) {
      console.log('❌ Error en VISTA 5: BUSCAR EMPRESA. Pausando para debug...');
      await page.pause();
      throw error;
    }
    
  } catch (error) {
    // Catch general por si algo falla fuera de los try-catch específicos
    console.log('❌ Test falló en un paso no cubierto. Pausando para debug...');
    await page.pause();
    throw error;
  }
});