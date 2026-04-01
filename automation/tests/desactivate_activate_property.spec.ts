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
const USER_FOR_DEACTIVATION = process.env.USER_FOR_DEACTIVATION || '395844565';
const BASE_URL = process.env.BASE_URL;
const EXECUTION_TYPE = process.env.EXECUTION_TYPE || 'plan';

test('Desactivar y reactivar copropiedades de usuarios', async ({ page }) => {
  // Navegar al login
  await page.goto(`${BASE_URL}/login`);
  
  // Iniciar sesión
  await page.getByRole('textbox', { name: 'Correo electrónico' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña' }).click();
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  
  // Pausa de 5 segundos antes de buscar usuario para desactivar
  await page.waitForTimeout(5000);
  
  // Buscar usuario por documento
  await page.getByRole('button', { name: 'Control de acceso' }).click();
  await page.getByRole('link', { name: 'Usuarios' }).click();
  await page.getByRole('textbox', { name: 'Buscar por nombre, apellido,' }).click();
  await page.getByRole('textbox', { name: 'Buscar por nombre, apellido,' }).fill(USER_FOR_DEACTIVATION);
  
  // Desactivar copropiedad
  await page.getByRole('button', { name: 'menu' }).click();
  await page.getByRole('button', { name: 'Desactivar Copropiedad' }).click();
  await page.getByTestId('toggle-notify_user').click();
  await page.getByRole('button', { name: 'Desactivar' }).click();
  // Verificar mensaje de desactivación
  await page.getByText('Eliminación de copropiedades del usuarioSe eliminaron las copropiedades del').nth(1).click();
  
  
  // Pausa de 10 segundos antes de buscar usuario para reactivar
  await page.waitForTimeout(10000);
  
  // Refrescar la página para asegurar estado limpio
  await page.reload();
  
  // Buscar usuario nuevamente para reactivar
  
  await page.getByRole('textbox', { name: 'Buscar por nombre, apellido,' }).click();
  await page.getByRole('textbox', { name: 'Buscar por nombre, apellido,' }).fill(USER_FOR_DEACTIVATION);
  
  // Reactivar copropiedad
  await page.getByRole('button', { name: 'menu' }).click();
  await page.getByRole('button', { name: 'Restaurar' }).click();
  await page.locator('div').filter({ hasText: /^Copropiedad$/ }).click();
  await page.locator('[id="headlessui-dialog-:r0:"]').getByText('Copropiedades', { exact: true }).click();
  await page.getByText('Queo Q&A (Staging)', { exact: true }).click();
  await page.getByRole('button', { name: 'Restaurar' }).click();
  
  // Esperar a que el proceso de restauración se complete
  await page.waitForTimeout(2000);
  
  // Verificar mensaje de restauración - esperar a que aparezca
  const restorationMessage = page.getByText('Restauración de copropiedades').nth(1);
  await restorationMessage.waitFor({ state: 'visible', timeout: 10000 });
  await restorationMessage.click();
  
  // Esperar un poco más antes de cerrar para asegurar que el proceso se complete
  await page.waitForTimeout(1500);
  
  // Hacer clic en el botón Cerrar
  const closeButton = page.getByRole('button', { name: 'Cerrar' });
  await closeButton.waitFor({ state: 'visible', timeout: 5000 });
  await closeButton.click();
});
