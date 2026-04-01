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

// Clase CompanyPage para encapsular la lógica de interacción con la página de compañías
class CompanyPage {
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

  async createCompany(uniqueId: string): Promise<void> {
    // Ir a Empresas por el menú → Nueva empresa (nueva interfaz)
    await this.page.getByRole('button', { name: 'Organización' }).click();
    await this.page.waitForTimeout(500);
    await expect(this.page.getByRole('link', { name: 'Empresas' })).toBeVisible({ timeout: 10000 });
    await this.page.getByRole('link', { name: 'Empresas' }).click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
    await this.page.getByRole('link', { name: 'Nueva empresa' }).click();
    await this.page.waitForTimeout(1500);

    // DATOS DE LA EMPRESA
    await this.page.getByRole('textbox', { name: 'NIT (*)' }).click();
    await this.page.getByRole('textbox', { name: 'NIT (*)' }).fill(`112134567${uniqueId.slice(-4)}`);
    await this.page.waitForTimeout(300);
    await this.page.getByRole('textbox', { name: 'Nombre de la empresa (*)' }).click();
    await this.page.getByRole('textbox', { name: 'Nombre de la empresa (*)' }).fill(`Empresa Test ${uniqueId}`);
    await this.page.waitForTimeout(300);
    await this.page.getByRole('textbox', { name: 'Número de teléfono' }).click();
    await this.page.getByRole('textbox', { name: 'Número de teléfono' }).fill(`3254646${uniqueId.slice(-4)}`);
    await this.page.waitForTimeout(300);
    await this.page.getByRole('textbox', { name: 'Sitio web' }).click();
    await this.page.getByRole('textbox', { name: 'Sitio web' }).fill(`midominio${uniqueId.slice(-4)}.com`);
    await this.page.waitForTimeout(500);
    console.log('✅ Datos de la empresa llenados');

    // HORARIO DE ACCESO: marcar todos los días
    for (let i = 1; i <= 7; i++) {
      await this.page.getByTestId(`checkbox-day-${i}`).check();
      await this.page.waitForTimeout(100);
    }
    await this.page.locator('#initial_time').fill('08:00');
    await this.page.locator('#final_time').fill('23:59');
    await this.page.waitForTimeout(300);
    console.log('✅ Horario de acceso configurado');

    // COPROPIEDADES Y EMPRESA PRINCIPAL (buscador dinámico: escribir y Enter para confirmar)
    const reactSelectInput = this.page.locator('input[id*="react-select"]');

    // --- Copropiedades: abrir, escribir en el buscador, Enter para seleccionar
    await this.page.locator('div').filter({ hasText: /^Seleccionar copropiedades$/ }).nth(2).click();
    await this.page.waitForTimeout(400);
    await reactSelectInput.first().fill('Queo Q&A (Staging)');
    await this.page.waitForTimeout(1000);
    await reactSelectInput.first().press('Enter');
    await this.page.waitForTimeout(800);

    // --- Empresa principal: abrir, esperar lista y seleccionar primera opción con ArrowDown + Enter
    await this.page.locator('div').filter({ hasText: /^Seleccionar empresa principal$/ }).nth(2).click();
    await this.page.waitForTimeout(800);
    await this.page.keyboard.press('ArrowDown');
    await this.page.waitForTimeout(300);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(800);
    console.log('✅ Copropiedades y empresa principal seleccionadas');

    // Guardar
    await this.page.getByRole('button', { name: 'Guardar' }).click();
    await this.page.waitForTimeout(2000);
    console.log('✅ Botón Guardar clickeado');
  }

  async isCompanyCreated(): Promise<boolean> {
    const message = this.page.getByText('Empresa creada');
    await expect(message).toBeVisible({ timeout: 15000 });
    console.log('✅ Mensaje "Empresa creada" visible');
    return true;
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

test('test_create_company', async ({ page }) => {
  // Aumentar el timeout del test a 60 segundos
  test.setTimeout(60000);
  
  const startTime = Date.now();
  let errorMsg = '';
  let status = 'passed';

  try {
    // Configurar timeout de la página
    page.setDefaultTimeout(50000);
    
    const companyPage = new CompanyPage(page);
    await companyPage.login(USER_EMAIL, USER_PASSWORD);
    
    // Esperar a que se cargue el dashboard
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    
    const uniqueId = Date.now().toString();
    await companyPage.createCompany(uniqueId);
    
    // Validar que la compañía fue creada correctamente
    const isCreated = await companyPage.isCompanyCreated();
    expect(isCreated).toBe(true);
    
    // Esperar un momento antes de finalizar
    await page.waitForTimeout(2000);

  } catch (error) {
    status = 'failed';
    errorMsg = error instanceof Error ? error.message : String(error);
    
    // Tomar screenshot del error en la carpeta screenshot_error_
    const timestamp = Date.now();
    await page.screenshot({ path: `screenshot_error_/screenshot_error_${timestamp}.png` });
    
    throw error;
  } finally {
    const duration = (Date.now() - startTime) / 1000; // Convertir a segundos
    const dateIso = new Date().toISOString();
    
    await sendTestResultsToFirebase({
      name: 'test_create_company',
      status: status,
      duration: Math.round(duration * 100) / 100, // Redondear a 2 decimales
      date: dateIso,
      error: errorMsg,
      executionType: EXECUTION_TYPE
    });
  }
});
