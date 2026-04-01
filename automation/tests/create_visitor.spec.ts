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
const BASE_URL = process.env.BASE_URL;
const EXECUTION_TYPE = process.env.EXECUTION_TYPE || 'plan';

class VisitorPage {
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

  async createVisitor(uniqueId: string): Promise<void> {
    console.log('🌐 Navegando a la página de creación de visitante...');
    await this.page.goto(`${BASE_URL}/visitors/create`);
    
    // Función auxiliar para llenar campos con validación
    const fillField = async (selector: string, inputText: string, byName: boolean = true): Promise<void> => {
      let field;
      if (byName) {
        field = this.page.locator(`input[name='${selector}']`);
      } else {
        field = this.page.locator(selector);
      }
      await field.waitFor({ state: 'visible', timeout: this.timeout });
      await field.clear();
      await field.fill(inputText);
      await this.page.waitForTimeout(500);
    };

    // Llenamos los campos básicos
    console.log('📝 Llenando campos del formulario...');
    await fillField('dni', `1023${uniqueId.slice(-4)}`);
    console.log(`✅ DNI llenado: 1023${uniqueId.slice(-4)}`);
    
    await fillField('first_name', 'VisitorTest');
    console.log('✅ Nombre llenado');
    
    await fillField('last_name', 'testQa');
    console.log('✅ Apellido llenado');
    
    await fillField('email', `testQA${uniqueId}@mail.com`);
    console.log(`✅ Email llenado: testQA${uniqueId}@mail.com`);
    
    await fillField('phone', '123456981');
    console.log('✅ Teléfono llenado');
    
    // Hacemos scroll y click en el botón Siguiente
    console.log('🔍 Buscando botón "Siguiente"...');
    const siguienteBtn = this.page.getByRole('button', { name: 'Siguiente' }).first();
    await siguienteBtn.waitFor({ state: 'visible', timeout: this.timeout });
    await siguienteBtn.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(1000);
    await siguienteBtn.click();
    console.log('✅ Botón "Siguiente" clickeado');
    await this.page.waitForTimeout(2000);
  }

  async isVisitorCreated(): Promise<boolean> {
    try {
      // Esperamos a que aparezca un mensaje de éxito o redirección
      console.log('⏳ Esperando mensaje de éxito...');
      const successMessage = this.page.locator(
        "//*[contains(text(), 'Visitante creado') or contains(text(), 'Visitor created')]"
      ).first();
      await successMessage.waitFor({ state: 'visible', timeout: 25000 });
      console.log('✅ Mensaje de éxito encontrado');
      return true;
    } catch (e) {
      // Si no encontramos el mensaje, verificamos si estamos en la página de visitantes
      console.log('⚠️ Mensaje de éxito no encontrado, verificando contenido de la página...');
      const pageContent = await this.page.content();
      const hasVisitor = pageContent.includes('Visitor') || pageContent.includes('Visitante');
      if (hasVisitor) {
        console.log('✅ Contenido de visitante encontrado en la página');
      }
      return hasVisitor;
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

test('test_create_visitor', async ({ page }) => {
  // Aumentar timeout si es necesario (60000 para tests complejos)
  test.setTimeout(60000);
  
  const startTime = Date.now();
  let errorMsg = '';
  let status = 'passed';

  try {
    // Configurar timeout de la página
    page.setDefaultTimeout(50000);
    
    // Instanciar Page Object
    const visitorPage = new VisitorPage(page);
    await visitorPage.login(USER_EMAIL, USER_PASSWORD);
    
    // Esperar a que la URL contenga "dashboard"
    console.log('⏳ Esperando redirección al dashboard...');
    await page.waitForURL('**/dashboard**', { timeout: 20000 });
    console.log('✅ Redirección al dashboard completada');
    
    // Generar ID único para el visitante
    const uniqueId = Date.now().toString();
    
    // Ejecutar acción principal
    await visitorPage.createVisitor(uniqueId);
    
    // Esperar explícitamente el mensaje de éxito
    console.log('⏳ Esperando mensaje de éxito de creación de visitante...');
    const successMessage = page.locator(
      "//*[contains(text(), 'El visitante ha sido guardado correctamente.') or contains(text(), 'Visitante guardado') or contains(text(), 'visitante ha sido guardado correctamente') or contains(text(), 'Visitante ha sido guardado correctamente')]"
    ).first();
    await successMessage.waitFor({ state: 'visible', timeout: 25000 });
    expect(successMessage).toBeVisible();
    console.log('✅ Mensaje de éxito encontrado');
    console.log('✅ Test completado exitosamente');

  } catch (error) {
    status = 'failed';
    errorMsg = error instanceof Error ? error.message : String(error);
    
    // Tomar screenshot del error en la carpeta screenshot_error_
    const timestamp = Date.now();
    await page.screenshot({ path: `screenshot_error_/screenshot_error_${timestamp}.png` });
    
    console.log(`❌ Error en el test: ${errorMsg}`);
    throw error;
  } finally {
    const duration = (Date.now() - startTime) / 1000;
    const dateIso = new Date().toISOString();
    
    await sendTestResultsToFirebase({
      name: 'test_create_visitor',
      status: status,
      duration: Math.round(duration * 100) / 100,
      date: dateIso,
      error: errorMsg,
      executionType: EXECUTION_TYPE
    });
  }
});