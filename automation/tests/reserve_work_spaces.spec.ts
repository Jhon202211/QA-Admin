import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const BASE_URL = process.env.BASE_URL;
const USER_EMAIL = process.env.USER_EMAIL || '';
const USER_PASSWORD = process.env.USER_PASSWORD || '';

/** Fecha N días después de hoy (1 = mañana). Formato para el date picker: "Choose jueves, 12 de febrero de". */
function getDateOptionLabel(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('es-ES', { month: 'long' });
  return `Choose ${weekday}, ${day} de ${month} de`;
}

test('test', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });

  // ========== LOGIN ==========
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico' }).click();
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: '*********' }).click();
  await page.getByRole('textbox', { name: '*********' }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  // Esperar a que la página cargue después del login
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  // Esperar a que el sidebar se renderice y se vea el botón Espacios de trabajo
  const workSpacesButton = page.getByRole('button', { name: 'Espacios de trabajo' });
  await expect(workSpacesButton).toBeVisible({ timeout: 10000 });
  await workSpacesButton.scrollIntoViewIfNeeded();
  await workSpacesButton.click();

  // Esperar a que el menú del sidebar se abra y aparezca la opción "Áreas de trabajo"
  const areasTrabajoLink = page.getByRole('link', { name: 'Áreas de trabajo' });
  await expect(areasTrabajoLink).toBeVisible({ timeout: 10000 });
  await areasTrabajoLink.click();

  // Esperar a que cargue la página de Áreas de trabajo
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  await page.getByRole('textbox', { name: 'Buscar por nombre de áreas de' }).click();
  await page.getByRole('textbox', { name: 'Buscar por nombre de áreas de' }).fill('Área Yanine Prueba I');
  await page.getByTestId('detailsWorkArea1050').getByRole('button', { name: 'Reservar puesto' }).click();
  
  // Seleccionar el día siguiente a la fecha actual
  const dateOptionLabel = getDateOptionLabel(1);
  await page.getByRole('option', { name: dateOptionLabel }).dblclick();
  await page.getByTestId('startTime').click();
  await page.getByTestId('startTime').fill('07:00');
  await page.getByTestId('endTime').click();
  await page.getByTestId('endTime').fill('11:00');
  await page.getByRole('button', { name: 'prueba 7' }).click();
  await page.getByRole('textbox', { name: 'Comentarios (opcional)' }).click();
  await page.getByRole('textbox', { name: 'Comentarios (opcional)' }).fill('reserva de prueba automatizada');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await page.goto('https://yanine.queo.dev/reservations?searchType=search&min_date=2026-02-11&max_date=2026-02-11&');
});