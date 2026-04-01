import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const BASE_URL = process.env.BASE_URL;

test('Eliminación permanente de usuario', async ({ page }) => {
  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill('userrfid2109@refactor.com');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('userrfid2109');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  
  // Validar que carga la página del dashboard después del login
  await expect(page).toHaveURL(/.*\/dashboard.*/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  
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
  
  // Esperar a que cargue la vista de usuarios
  await expect(page).toHaveURL(/.*users.*/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('textbox', { name: /Buscar/i }).first()).toBeVisible({ timeout: 5000 });
  
  // Buscar usuario
  const searchInput = page.getByRole('textbox', { name: 'Buscar por nombre, apellido,' });
  await searchInput.click();
  await searchInput.fill('usuario225@prueba.com');
  
  // Esperar a que se complete la búsqueda y la lista se estabilice
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Buscar la fila que contiene el DNI del usuario
  const userRow = page.getByRole('row').filter({ hasText: 'usuario225@prueba.com' });
  await expect(userRow).toBeVisible({ timeout: 10000 });
  
  // Esperar a que la fila esté completamente estable (sin recargas)
  await userRow.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  // Esperar a que el botón menu dentro de la fila esté visible y listo
  const menuButton = userRow.getByRole('button', { name: 'menu' });
  await expect(menuButton).toBeVisible({ timeout: 10000 });
  await expect(menuButton).toBeEnabled({ timeout: 5000 });
  
  // Esperar un momento adicional para asegurar que no hay recargas pendientes
  await page.waitForTimeout(500);
  
  // Funcionalidad de eliminación permanente
  await menuButton.click();
  
  // Esperar a que aparezca el menú desplegable
  await page.waitForTimeout(1000);
  
  // Buscar "Eliminar permanentemente" por texto (solución sencilla y robusta)
  const deletePermanentLink = page.getByText('Eliminar permanentemente', { exact: true }).first();
  await expect(deletePermanentLink).toBeVisible({ timeout: 10000 });
  await deletePermanentLink.click();
  
  // Esperar a que aparezca el modal de confirmación
  await expect(page.getByRole('button', { name: 'Eliminar permanentemente' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Eliminar permanentemente' }).click();
  
  // Esperar a que se complete la eliminación y navegar a Usuarios
  await page.waitForLoadState('networkidle');
  // Navegar directamente a la URL de usuarios para evitar ambigüedad
  await page.goto(`${BASE_URL}/users`);
  
  // Esperar a que cargue la lista de usuarios nuevamente
  await expect(page).toHaveURL(/.*users.*/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('textbox', { name: /Buscar/i }).first()).toBeVisible({ timeout: 5000 });
  
  // Buscar el usuario para verificar que fue eliminado
  await page.getByRole('textbox', { name: 'Buscar por nombre, apellido,' }).click();
  await page.getByRole('textbox', { name: 'Buscar por nombre, apellido,' }).fill('usuario225@prueba.com');
  
  // Esperar a que se complete la búsqueda
  await page.waitForLoadState('networkidle');
});
