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

test('Listar empresas', async ({ page }) => {
  try {
    // ========== VISTA 1: LOGIN ==========
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Validar elementos del login
    await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    
    // Login
    await page.getByRole('textbox', { name: 'Correo electrónico' }).fill('usuarior15@simultaneo.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('usuarior15');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    
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
      
      // Validar que la vista de empresas cargó (opcional - ajusta según tu aplicación)
      // Puedes validar algún elemento característico de la vista de empresas
      // Por ejemplo, un botón de "Agregar" o un título
      // await expect(page.getByRole('button', { name: /Agregar|Nuevo/i })).toBeVisible({ timeout: 5000 });
    } catch (error) {
      console.log('❌ Error en VISTA 4: LISTA DE EMPRESAS. Pausando para debug...');
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