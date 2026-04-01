import { test, expect, Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') });

const USER_EMAIL = process.env.USER_EMAIL || '';
const USER_PASSWORD = process.env.USER_PASSWORD || '';
const BASE_URL = process.env.BASE_URL;
const EXECUTION_TYPE = process.env.EXECUTION_TYPE || 'plan';

// Clase UserPage para encapsular la lógica de interacción con la página de usuarios
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

  async createUser(uniqueId: string): Promise<void> {
    await this.page.goto(`${BASE_URL}/users/create`);
    
    const fillField = async (selector: string, inputText: string, byName: boolean = true): Promise<void> => {
      const field = byName 
        ? this.page.locator(`input[name='${selector}']`)
        : this.page.locator(selector);
      await field.waitFor({ state: 'visible', timeout: this.timeout });
      await field.clear();
      await field.fill(inputText);
      await this.page.waitForTimeout(500);
    };

    // Campo DNI
    const dniField = this.page.locator("input[data-testid='input-dni']");
    await dniField.waitFor({ state: 'visible', timeout: this.timeout });
    await this.page.waitForTimeout(1000);
    await dniField.clear();
    await this.page.waitForTimeout(500);
    const dniValue = `1023${uniqueId.slice(-4)}`;
    await dniField.fill(dniValue);
    await this.page.waitForTimeout(500);
    console.log(`DNI llenado con: ${dniValue}, valor actual en input: ${await dniField.inputValue()}`);
    
    await fillField('first_name', 'UserTest');
    await fillField('last_name', 'testQa');
    await fillField('email', `testQA${uniqueId}@mail.com`);
    await fillField('birth_date', '2000-12-02'); // Formato YYYY-MM-DD para input type="date"
    await fillField('phone', '123456981');
    
    // Dropdowns
    const roleSelect = this.page.locator("select[name='role']");
    await roleSelect.waitFor({ state: 'visible', timeout: this.timeout });
    await roleSelect.selectOption('4');
    await this.page.waitForTimeout(500);
    
    const dniAccessSelect = this.page.locator("select[name='has_dni_access']");
    await dniAccessSelect.waitFor({ state: 'visible', timeout: this.timeout });
    await dniAccessSelect.selectOption({ index: 1 });
    await this.page.waitForTimeout(500);
    
    const tempSelect = this.page.locator("select[name='can_add_temperatures']");
    await tempSelect.waitFor({ state: 'visible', timeout: this.timeout });
    await tempSelect.selectOption({ index: 0 });
    await this.page.waitForTimeout(500);
    
    // Propiedades - Usar force click para evitar el placeholder
    const propertyAccess = this.page.locator('#react-select-2-input');
    await propertyAccess.waitFor({ state: 'visible', timeout: this.timeout });
    await propertyAccess.click({ force: true });
    await this.page.waitForTimeout(500);
    await propertyAccess.fill('Queo Q&A (Staging)');
    await this.page.waitForTimeout(1000);
    await propertyAccess.press('ArrowDown');
    await this.page.waitForTimeout(500);
    await propertyAccess.press('Enter');
    await this.page.waitForTimeout(1000);
    
    // Compañías - Usar force click para evitar el placeholder
    const companyAccess = this.page.locator('#react-select-3-input');
    await companyAccess.waitFor({ state: 'visible', timeout: this.timeout });
    await companyAccess.click({ force: true });
    await this.page.waitForTimeout(500);
    await companyAccess.fill('Queo Q&A (Staging)');
    await this.page.waitForTimeout(1000);
    await companyAccess.press('ArrowDown');
    await this.page.waitForTimeout(500);
    await companyAccess.press('Enter');
    await this.page.waitForTimeout(1000);
    
    // Expandir dropdown de grupos de puertas - usar selector más específico
    const dropdownArrow = this.page.locator('[id="door_groups[]"]').locator("//div[contains(@class, 'css-1wy0on6')]").first();
    await dropdownArrow.waitFor({ state: 'visible', timeout: this.timeout });
    await dropdownArrow.click();
    await this.page.waitForTimeout(1000);
    
    // Grupo de puertas - Usar force click para evitar el placeholder
    const doorGroupHave = this.page.locator('#react-select-4-input');
    await doorGroupHave.waitFor({ state: 'visible', timeout: this.timeout });
    await doorGroupHave.click({ force: true });
    await this.page.waitForTimeout(500);
    await doorGroupHave.fill('Todas las Puertas');
    await this.page.waitForTimeout(1000);
    await doorGroupHave.press('ArrowDown');
    await this.page.waitForTimeout(500);
    await doorGroupHave.press('Enter');
    await this.page.waitForTimeout(1000);
    
    // Enviar formulario
    const submitButton = this.page.locator("button[type='submit']");
    await submitButton.waitFor({ state: 'visible', timeout: this.timeout });
    await submitButton.click();
    await this.page.waitForTimeout(3000);
  }
}

// Función para enviar resultados a Firebase (opcional)
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

test('test_create_user', async ({ page }) => {
  const startTime = Date.now();
  let errorMsg = '';
  let status = 'passed';

  try {
    // Configurar timeout
    page.setDefaultTimeout(30000);
    
    const userPage = new UserPage(page);
    await userPage.login(USER_EMAIL, USER_PASSWORD);
    
    const uniqueId = Date.now().toString();
    await userPage.createUser(uniqueId);
    
    // Validar que el usuario fue creado correctamente buscando el mensaje en pantalla
    // Usar el selector específico del contenedor de SweetAlert
    const successMessage = page.locator('#swal2-html-container', { hasText: 'Usuario creado correctamente!' });
    await successMessage.waitFor({ state: 'visible', timeout: 10000 });
    await expect(successMessage).toBeVisible();

  } catch (error) {
    status = 'failed';
    errorMsg = error instanceof Error ? error.message : String(error);
    
    // Tomar screenshot del error
    const timestamp = Date.now();
    await page.screenshot({ path: `screenshot_error_${timestamp}.png` });
    
    throw error;
  } finally {
    const duration = (Date.now() - startTime) / 1000; // Convertir a segundos
    const dateIso = new Date().toISOString();
    
    await sendTestResultsToFirebase({
      name: 'test_create_user',
      status: status,
      duration: Math.round(duration * 100) / 100, // Redondear a 2 decimales
      date: dateIso,
      error: errorMsg,
      executionType: EXECUTION_TYPE
    });
  }
});
