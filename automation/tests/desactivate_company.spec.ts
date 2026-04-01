import { fileURLToPath } from 'url';
import { test, expect, Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const USER_EMAIL = process.env.USER_EMAIL || '';
const USER_PASSWORD = process.env.USER_PASSWORD || '';
const USER_DNI_TO_DEACTIVATE = process.env.USER_DNI_TO_DEACTIVATE || '';
const BASE_URL = process.env.BASE_URL;
const EXECUTION_TYPE = process.env.EXECUTION_TYPE || 'plan';

class UserPage {
  private page: Page;
  private timeout: number;

  constructor(page: Page) {
    this.page = page;
    this.timeout = 30000;
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.goto(`${BASE_URL}/login`);
    
    const emailField = this.page.locator("input[name='email']");
    await emailField.waitFor({ state: 'visible', timeout: this.timeout });
    await emailField.clear();
    await emailField.fill(email);
    await this.page.waitForTimeout(1000);
    
    const passwordField = this.page.locator("input[name='password']");
    await passwordField.waitFor({ state: 'visible', timeout: this.timeout });
    await passwordField.clear();
    await passwordField.fill(password);
    await this.page.waitForTimeout(1000);
    
    const submitButton = this.page.locator("button[type='submit']");
    await submitButton.waitFor({ state: 'visible', timeout: this.timeout });
    await submitButton.click();
    await this.page.waitForTimeout(2000);
  }

  async deactivateUserCompanyByDni(dni: string): Promise<void> {
    // Navegar a la página de usuarios
    console.log('🌐 Navegando a la página de usuarios...');
    await this.page.goto(`${BASE_URL}/users`);
    await this.page.waitForTimeout(3000);
    
    // Buscar por DNI
    console.log(`🔍 Buscando usuario con DNI: ${dni}`);
    const searchInput = this.page.locator("//input[@placeholder='Buscar'] | //input[@type='text']").first();
    await searchInput.waitFor({ state: 'visible', timeout: this.timeout });
    await searchInput.clear();
    await searchInput.fill(dni);
    await this.page.waitForTimeout(3000);
    
    // Buscar el <td> que contiene el DNI
    console.log('🔍 Buscando fila del usuario...');
    const tdDni = this.page.locator(`//td[contains(text(), '${dni}')] | //td[.//text()[contains(., '${dni}')]]`);
    await tdDni.waitFor({ state: 'visible', timeout: this.timeout });
    
    // Subir al <tr> ancestro
    const trUsuario = tdDni.locator('xpath=ancestor::tr');
    await trUsuario.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(1000);
    
    // Buscar el botón de menú de los tres puntos dentro del <tr>
    console.log('🔍 Buscando botón de menú...');
    const menuBtn = trUsuario.getByRole('button', { name: 'menu' });
    await menuBtn.waitFor({ state: 'visible', timeout: this.timeout });
    await menuBtn.click();
    await this.page.waitForTimeout(1000);
    
    // Seleccionar la opción 'Desactivar Empresa' del menú
    console.log('🔍 Seleccionando opción "Desactivar Empresa"...');
    const desactivarBtn = this.page.locator("//a[contains(@role, 'button') and contains(text(), 'Desactivar Empresa')]");
    await desactivarBtn.waitFor({ state: 'visible', timeout: this.timeout });
    await desactivarBtn.click();
    await this.page.waitForTimeout(1000);
    
    // Activar el toggle de notificación si existe
    try {
      console.log('🔍 Buscando toggle de notificación...');
      const toggle = this.page.locator("//label[contains(., 'Notificar al usuario sobre sus reservas canceladas')]/preceding-sibling::button");
      await toggle.waitFor({ state: 'visible', timeout: 5000 });
      await toggle.click();
      console.log('✅ Toggle de notificación activado');
      await this.page.waitForTimeout(1000);
    } catch (e) {
      console.log('⚠️ Toggle de notificación no encontrado, continuando...');
    }
    
    // Hacer clic en el botón naranja 'Desactivar' en el modal
    console.log('🔍 Buscando botón "Desactivar" en el modal...');
    const btnDesactivar = this.page.locator("//div[contains(@class, 'w-max') and contains(., 'Desactivar')] | //button[contains(., 'Desactivar') and @type='button']");
    await btnDesactivar.waitFor({ state: 'visible', timeout: this.timeout });
    await btnDesactivar.click();
    await this.page.waitForTimeout(2000);
    
    // Esperar el mensaje de éxito tipo toast
    console.log('⏳ Esperando mensaje de éxito...');
    try {
      const successMessage = this.page.locator("//*[contains(text(), 'Eliminación de empresas del usuario') or contains(text(), 'Se eliminaron las empresas del usuario de manera exitosa')]").first();
      await successMessage.waitFor({ state: 'visible', timeout: 25000 });
      console.log('✅ Mensaje de éxito encontrado');
    } catch (e) {
      console.log('⚠️ Mensaje de éxito no encontrado con el primer selector, intentando alternativo...');
      const successMessage2 = this.page.locator("text=/eliminación.*empresas|empresas.*eliminadas/i").first();
      await successMessage2.waitFor({ state: 'visible', timeout: 25000 });
      console.log('✅ Mensaje de éxito encontrado con selector alternativo');
    }
  }
}

async function sendTestResultsToFirebase(data: {
  name: string;
  status: string;
  duration: number;
  date: string;
  error: string;
  executionType: string;
}): Promise<void> {
  // TODO: Implementar integración con Firebase si es necesario
  // Por ahora solo logueamos los resultados
  console.log('Test Results:', JSON.stringify(data, null, 2));
  
  // Si tienes una función de Firebase, descomenta y ajusta:
  // await sendTestResultsToFirebase(data);
}

test('test_deactivate_user_company', async ({ page }) => {
  // Aumentar timeout si es necesario (60000 para tests complejos)
  test.setTimeout(60000);
  
  const startTime = Date.now();
  let errorMsg = '';
  let status = 'passed';

  try {
    // Configurar timeout de la página
    page.setDefaultTimeout(50000);
    
    // Instanciar Page Object
    const userPage = new UserPage(page);
    await userPage.login(USER_EMAIL, USER_PASSWORD);
    await page.waitForTimeout(2000);
    
    // Ejecutar acción principal
    await userPage.deactivateUserCompanyByDni(USER_DNI_TO_DEACTIVATE);
    
    // Si no lanza excepción, se considera exitoso
    expect(true).toBe(true);
    console.log('✅ Test completado exitosamente');

  } catch (error) {
    status = 'failed';
    errorMsg = error instanceof Error ? error.message : String(error);
    
    // Tomar screenshot del error
    const timestamp = Date.now();
    await page.screenshot({ path: `screenshot_error_${timestamp}.png` });
    
    console.log(`❌ Error en el test: ${errorMsg}`);
    throw error;
  } finally {
    const duration = (Date.now() - startTime) / 1000;
    const dateIso = new Date().toISOString();
    
    await sendTestResultsToFirebase({
      name: 'test_deactivate_user_company',
      status: status,
      duration: Math.round(duration * 100) / 100,
      date: dateIso,
      error: errorMsg,
      executionType: EXECUTION_TYPE
    });
  }
});