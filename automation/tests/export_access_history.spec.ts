import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const BASE_URL = process.env.BASE_URL;
const MAILHOG_URL = process.env.MAILHOG_URL || 'https://qa.mailhog.queo.dev';

test('test', async ({ page, context }) => {
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

  const controlAccesoButton = page.getByRole('button', { name: 'Control de acceso' });
  await expect(controlAccesoButton).toBeVisible({ timeout: 10000 });
  await controlAccesoButton.scrollIntoViewIfNeeded();
  await controlAccesoButton.click();
  // Esperar a que se expanda el menú del sidebar y aparezca la opción "Historial de accesos"
  await page.waitForTimeout(500); // Pequeño delay para que se complete la animación del menú
  await expect(page.getByRole('link', { name: 'Historial de accesos' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('link', { name: 'Historial de accesos' }).click();
  // Esperar a que cargue la página de Historial de accesos
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="filterBtn"]', { timeout: 10000 });
  await page.getByTestId('filterBtn').click();
  // Esperar a que cargue el calendario después de hacer clic en el botón de filtros
  await expect(page.getByRole('textbox', { name: 'Filtrar por fecha' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('textbox', { name: 'Filtrar por fecha' }).click();
  await page.getByRole('option', { name: 'Choose jueves, 1 de enero de' }).click();
  await page.getByRole('option', { name: 'Choose miércoles, 7 de enero de' }).click();
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  // Esperar a que cargue la página con los resultados filtrados
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Exportar Datos' }).click();
  // Esperar a que cargue el recuadro para seleccionar confirmar
  await expect(page.getByRole('link', { name: 'Confirmar' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('link', { name: 'Confirmar' }).click();
  // Esperar a que cargue el siguiente recuadro para dar click en cerrar
  await expect(page.getByRole('button', { name: 'Cerrar' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Cerrar' }).click();
  
  // Abrir MailHog en una nueva página para validar el correo de confirmación
  const mailhogPage = await context.newPage();
  // Navegar a MailHog con timeout extendido y esperar solo a que el DOM esté listo (más rápido)
  await mailhogPage.goto(`${MAILHOG_URL}/`, { 
    waitUntil: 'domcontentloaded', 
    timeout: 60000 
  });
  // Esperar a que cargue completamente la página de MailHog
  await mailhogPage.waitForLoadState('networkidle', { timeout: 30000 });
  
  // Validar que existe un elemento con el texto del correo de confirmación
  // Usar .first() porque puede haber múltiples correos con el mismo asunto
  await expect(mailhogPage.getByText('Queo Access: Hemos culminado de exportar Historial de accesos').first()).toBeVisible({ timeout: 15000 });
  
  await mailhogPage.close();
});