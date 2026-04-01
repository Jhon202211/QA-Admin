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
const USER_DNI_TO_RESTORE = process.env.USER_DNI_TO_DEACTIVATE || '';
const USER_COMPANY_TO_RESTORE = process.env.USER_COMPANY_TO_RESTORE || 'Queo Q&A (Staging)';
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

  async restoreUserCompanyByDni(dni: string, companyName: string): Promise<void> {
    // Navegar a la página de usuarios
    console.log('🌐 Navegando a la página de usuarios...');
    await this.page.goto(`${BASE_URL}/users`);
    await this.page.waitForTimeout(2000);
    
    // Buscar usuario por DNI
    console.log(`🔍 Buscando usuario con DNI: ${dni}`);
    const searchInput = this.page.locator("//input[@placeholder='Buscar'] | //input[@type='text']").first();
    await searchInput.waitFor({ state: 'visible', timeout: this.timeout });
    await searchInput.clear();
    await searchInput.fill(dni);
    await this.page.waitForTimeout(2000);
    
    // Buscar el <td> que contiene el DNI
    console.log('🔍 Buscando fila del usuario...');
    const tdDni = this.page.locator(`//td[contains(text(), '${dni}')] | //td[.//text()[contains(., '${dni}')]]`);
    await tdDni.waitFor({ state: 'visible', timeout: this.timeout });
    
    // Subir al <tr> ancestro
    const trUsuario = tdDni.locator('xpath=ancestor::tr');
    await trUsuario.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(1000);
    
    // Esperar a que desaparezca el overlay de carga
    try {
      console.log('⏳ Esperando que desaparezca el overlay de carga...');
      const loadingOverlay = this.page.locator('.loading-overlay');
      await loadingOverlay.waitFor({ state: 'hidden', timeout: 20000 });
      console.log('✅ Overlay de carga desapareció');
    } catch (e) {
      console.log('⚠️ Overlay de carga no encontrado o ya desapareció, continuando...');
    }
    
    // Abrir menú de los tres puntos
    console.log('🔍 Buscando botón de menú...');
    const menuBtn = trUsuario.getByRole('button', { name: 'menu' });
    await menuBtn.waitFor({ state: 'visible', timeout: this.timeout });
    await menuBtn.click();
    await this.page.waitForTimeout(1000);
    
    // Seleccionar opción Restaurar
    console.log('🔍 Seleccionando opción "Restaurar"...');
    const restaurarBtn = this.page.locator("//button[contains(@class, 'dropdown-item') and contains(., 'Restaurar')]");
    await restaurarBtn.waitFor({ state: 'visible', timeout: this.timeout });
    await restaurarBtn.click();
    await this.page.waitForTimeout(1000);
    
    // Seleccionar radio Empresa
    console.log('🔍 Seleccionando radio "Empresa"...');
    const radioEmpresa = this.page.locator("//input[@type='radio' and @value='Empresa']");
    await radioEmpresa.waitFor({ state: 'visible', timeout: this.timeout });
    await radioEmpresa.click();
    await this.page.waitForTimeout(1000);
    
    // Seleccionar la empresa en el selector
    console.log(`🔍 Seleccionando empresa: ${companyName}...`);
    const controlEmpresa = this.page.locator("//div[contains(@class, 'react-select__control')]").first();
    await controlEmpresa.waitFor({ state: 'visible', timeout: this.timeout });
    await controlEmpresa.click();
    await this.page.waitForTimeout(500);
    
    const selectorEmpresa = this.page.locator("//div[contains(@class, 'react-select__control')]//input").first();
    await selectorEmpresa.waitFor({ state: 'visible', timeout: this.timeout });
    await selectorEmpresa.fill(companyName);
    await this.page.waitForTimeout(1000);
    
    // Esperar a que aparezca la opción
    console.log('⏳ Esperando que aparezca la opción de empresa...');
    const opcionEmpresa = this.page.locator(`//div[contains(@class, 'react-select__option') and contains(., '${companyName}')]`);
    await opcionEmpresa.waitFor({ state: 'visible', timeout: 10000 });
    await selectorEmpresa.press('Enter');
    await this.page.waitForTimeout(1000);
    console.log(`✅ Empresa "${companyName}" seleccionada`);
    
    // Hacer clic en el botón Restaurar
    console.log('🔍 Buscando botón "Restaurar" en el modal...');
    const btnRestaurar = this.page.locator("//div[contains(@class, 'w-max') and contains(., 'Restaurar')] | //button[contains(., 'Restaurar') and @type='button']");
    await btnRestaurar.waitFor({ state: 'visible', timeout: this.timeout });
    await btnRestaurar.click();
    await this.page.waitForTimeout(2000);
    
    // Esperar mensaje de éxito (toast o modal)
    console.log('⏳ Esperando mensaje de éxito...');
    try {
      const successMessage = this.page.locator(
        "//*[contains(text(), 'Restauración de empresas del usuario') or contains(text(), 'Se restauraron las empresas del usuario de manera exitosa.') or contains(text(), 'Usuario activado con éxito')]"
      ).first();
      await successMessage.waitFor({ state: 'visible', timeout: 25000 });
      console.log('✅ Mensaje de éxito encontrado');
    } catch (e) {
      console.log('⚠️ Mensaje de éxito no encontrado con el primer selector, intentando alternativo...');
      const successMessage2 = this.page.locator("text=/restauración.*empresas|empresas.*restauradas|usuario.*activado/i").first();
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

test('test_restore_user_company', async ({ page }) => {
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
    await userPage.restoreUserCompanyByDni(USER_DNI_TO_RESTORE, USER_COMPANY_TO_RESTORE);
    
    // Si no lanza excepción, se considera exitoso
    expect(true).toBe(true);
    console.log('✅ Test completado exitosamente');

  } catch (error) {
    status = 'failed';
    errorMsg = error instanceof Error ? error.message : String(error);
    
    // Tomar screenshot del error
    const timestamp = Date.now();
    await page.screenshot({ path: `screenshot_error_/screenshot_error_${timestamp}.png` });
    
    console.log(`❌ Error en el test: ${errorMsg}`);
    throw error;
  } finally {
    const duration = (Date.now() - startTime) / 1000;
    const dateIso = new Date().toISOString();
    
    await sendTestResultsToFirebase({
      name: 'test_restore_user_company',
      status: status,
      duration: Math.round(duration * 100) / 100,
      date: dateIso,
      error: errorMsg,
      executionType: EXECUTION_TYPE
    });
  }
});