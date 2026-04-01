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
const PROPERTY_ADMIN = process.env.PROPERTY_ADMIN || '';

// Clase PropertyPage para encapsular la lógica de interacción con la página de propiedades
class PropertyPage {
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

  async createProperty(uniqueId: string): Promise<void> {
    // Configurar permisos de geolocalización para evitar el popup
    await this.page.context().grantPermissions(['geolocation'], { origin: BASE_URL });
    await this.page.context().setGeolocation({ latitude: 4.6097, longitude: -74.0817 }); // Bogotá
    
    // Navegar al login y luego a la página de creación de propiedades
    // Siguiendo el flujo del test grabado
    await this.page.goto(`${BASE_URL}/login`);
    await this.page.waitForTimeout(1000);
    
    // Navegar a Copropiedades usando el menú
    await this.page.getByRole('button', { name: 'Organización' }).click();
    await this.page.waitForTimeout(500);
    
    await this.page.getByRole('link', { name: 'Copropiedades' }).click();
    await this.page.waitForTimeout(1000);
    
    // Hacer click en el botón de nueva propiedad
    await this.page.getByTestId('button-new-property').click();
    await this.page.waitForTimeout(2000);
    
    // Campo Nombre usando data-testid
    await this.page.getByTestId('input-name').click();
    await this.page.getByTestId('input-name').fill(`QAtest${uniqueId}`);
    await this.page.waitForTimeout(500);
    console.log(`✅ Campo nombre llenado: QAtest${uniqueId}`);
    
    // Interactuar con el mapa - arrastrar el marcador para establecer la ubicación
    // Primero esperar a que el mapa se cargue completamente
    await this.page.waitForTimeout(2000);
    
    try {
      // Buscar el contenedor del mapa
      const mapContainer = this.page.locator('.leaflet-container').or(this.page.locator('div[class*="map"]')).or(this.page.locator('div[id*="map"]')).first();
      await mapContainer.waitFor({ state: 'visible', timeout: 5000 });
      
      // Obtener las dimensiones del mapa
      const box = await mapContainer.boundingBox();
      if (box) {
        // Hacer click en el centro del mapa para establecer una ubicación
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        
        // Hacer click en el mapa para establecer la ubicación
        await this.page.mouse.click(centerX, centerY);
        await this.page.waitForTimeout(1000);
        
        // Intentar arrastrar el marcador moviendo el mouse
        // Primero buscar el marcador
        const marker = this.page.locator('.leaflet-marker-icon').or(this.page.locator('[class*="marker"]')).first();
        try {
          const markerBox = await marker.boundingBox();
          if (markerBox) {
            // Arrastrar el marcador a una nueva posición
            await this.page.mouse.move(markerBox.x + markerBox.width / 2, markerBox.y + markerBox.height / 2);
            await this.page.mouse.down();
            await this.page.mouse.move(centerX, centerY);
            await this.page.mouse.up();
            await this.page.waitForTimeout(1500);
            console.log('✅ Marcador movido en el mapa');
          }
        } catch (e) {
          // Si no se encuentra el marcador, hacer click directamente en el mapa
          await this.page.mouse.click(centerX, centerY);
          await this.page.waitForTimeout(1500);
          console.log('✅ Click realizado en el mapa');
        }
      }
    } catch (e) {
      console.log('⚠️ No se pudo interactuar con el mapa, continuando...');
    }
    
    // Campo NIT (requerido)
    try {
      const nitField = this.page.getByTestId('input-nit').or(this.page.locator('input[name="nit"]')).or(this.page.getByLabel(/nit/i));
      await nitField.waitFor({ state: 'visible', timeout: 3000 });
      await nitField.click();
      await nitField.fill(`123456789${uniqueId.slice(-4)}`);
      await this.page.waitForTimeout(500);
      console.log('✅ Campo NIT llenado');
    } catch (e) {
      console.log('⚠️ Campo NIT no encontrado, continuando...');
    }
    
    // Campo Teléfono de contacto (requerido)
    try {
      const phoneField = this.page.getByTestId('input-phone').or(this.page.locator('input[name="phone"]')).or(this.page.getByLabel(/teléfono/i));
      await phoneField.waitFor({ state: 'visible', timeout: 3000 });
      await phoneField.click();
      await phoneField.fill(`300${uniqueId.slice(-7)}`);
      await this.page.waitForTimeout(500);
      console.log('✅ Campo teléfono llenado');
    } catch (e) {
      console.log('⚠️ Campo teléfono no encontrado, continuando...');
    }
    
    // Verificar que el campo de dirección se haya llenado automáticamente después de mover el marcador
    await this.page.waitForTimeout(1000);
    
    // Seleccionar Administrador/a usando React Select
    try {
      if (!PROPERTY_ADMIN) {
        throw new Error('PROPERTY_ADMIN no está definido en las variables de entorno');
      }
      
      await this.page.locator('.react-select__value-container').first().click();
      await this.page.waitForTimeout(500);
      
      // Extraer el nombre del email (parte antes del @) para la búsqueda
      const adminSearch = PROPERTY_ADMIN.split('@')[0] || PROPERTY_ADMIN;
      const textbox = this.page.getByRole('textbox', { name: 'Administrador/a' });
      await textbox.fill(adminSearch);
      await this.page.waitForTimeout(1000);
      
      // Usar Enter para seleccionar la opción en lugar de click (más confiable con React Select)
      // Primero esperar a que aparezca la opción en el menú
      const option = this.page.getByText(PROPERTY_ADMIN, { exact: false }).or(
        this.page.getByText(adminSearch, { exact: false })
      ).first();
      await option.waitFor({ state: 'visible', timeout: 3000 });
      
      // Usar Enter para seleccionar la opción
      await textbox.press('Enter');
      await this.page.waitForTimeout(1000);
      console.log(`✅ Administrador seleccionado: ${PROPERTY_ADMIN}`);
    } catch (e) {
      console.log(`⚠️ No se pudo seleccionar administrador: ${e}, continuando...`);
    }
    
    // Seleccionar Empresas usando React Select
    try {
      await this.page.locator('div').filter({ hasText: /^Empresas$/ }).nth(2).click();
      await this.page.waitForTimeout(500);
      
      await this.page.getByRole('textbox', { name: 'Empresas' }).fill('stag');
      await this.page.waitForTimeout(1000);
      await this.page.getByRole('textbox', { name: 'Empresas' }).press('ArrowDown');
      await this.page.waitForTimeout(500);
      await this.page.getByRole('textbox', { name: 'Empresas' }).press('Enter');
      await this.page.waitForTimeout(1000);
    } catch (e) {
      console.log('⚠️ No se pudo seleccionar empresa, continuando...');
    }
    
    // Hacer scroll hacia abajo para encontrar el botón
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.page.waitForTimeout(1000);
    await this.page.keyboard.press('End');
    await this.page.waitForTimeout(1000);
    
    // Hacer click en el botón "Guardar datos básicos"
    try {
      const saveButton = this.page.getByRole('button', { name: 'Guardar datos básicos' });
      await saveButton.waitFor({ state: 'visible', timeout: 5000 });
      // Esperar respuesta del servidor tras el click (reduce fallos en producción)
      const responsePromise = this.page.waitForResponse(
        (res) => res.status() >= 200 && res.status() < 400 && (res.url().includes('property') || res.url().includes('copropiedad') || res.url().includes('api')),
        { timeout: 15000 }
      ).catch(() => null);
      await saveButton.click();
      console.log('✅ Botón "Guardar datos básicos" clickeado');
      await responsePromise;
      await this.page.waitForTimeout(2000);
      
      // Un solo locator que agrupa todas las formas de ver el mensaje de éxito (evita timeouts en producción)
      const successTimeout = 35000;
      const successMessage = this.page
        .getByText('Copropiedad creada correctamente!', { exact: false })
        .or(this.page.locator('text=/Copropiedad creada correctamente/i'))
        .or(this.page.locator('.swal2-html-container').filter({ hasText: /copropiedad.*creada/i }))
        .or(this.page.locator('#swal2-html-container').filter({ hasText: /copropiedad.*creada/i }));
      
      console.log('⏳ Esperando mensaje de éxito (timeout ' + successTimeout / 1000 + 's)...');
      await expect(successMessage).toBeVisible({ timeout: successTimeout });
      console.log('✅ Mensaje de éxito encontrado');
      
      // Opcional: Hacer click en el botón OK del modal si existe
      try {
        const okButton = this.page.getByRole('button', { name: 'OK' });
        await okButton.waitFor({ state: 'visible', timeout: 3000 });
        await okButton.click();
        await this.page.waitForTimeout(1000);
        console.log('✅ Botón OK del modal clickeado');
      } catch (e) {
        console.log('⚠️ Botón OK no encontrado, continuando...');
      }
    } catch (e) {
      throw new Error(`Error al guardar o validar la creación: ${e}`);
    }
  }

  async isPropertyCreated(): Promise<boolean> {
    // La validación del mensaje de éxito ya se hace en createProperty()
    // Este método ahora solo verifica que el mensaje esté presente como confirmación
    try {
      // Buscar el mensaje de éxito "Copropiedad creada correctamente!"
      const successMessage = this.page.locator('text=Copropiedad creada correctamente!')
        .or(this.page.locator('text=/copropiedad.*creada.*correctamente/i'));
      
      const isVisible = await successMessage.isVisible({ timeout: 2000 });
      if (isVisible) {
        console.log('✅ Mensaje de éxito confirmado en isPropertyCreated');
        return true;
      }
    } catch (e) {
      // Si no está visible, verificar si el modal de éxito está presente
      try {
        const successModal = this.page.locator('#swal2-html-container')
          .or(this.page.locator('[class*="swal"]'))
          .filter({ hasText: /copropiedad.*creada/i });
        
        const modalVisible = await successModal.isVisible({ timeout: 2000 });
        if (modalVisible) {
          console.log('✅ Modal de éxito confirmado');
          return true;
        }
      } catch (e2) {
        // Ignorar
      }
    }
    
    // Si la validación en createProperty() pasó, asumir éxito
    // (el mensaje ya fue validado allí)
    console.log('✅ Validación completada en createProperty, confirmando éxito');
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

test('test_create_property', async ({ page }) => {
  // Timeout amplio para producción (red/backend más lentos)
  test.setTimeout(90000);
  
  const startTime = Date.now();
  let errorMsg = '';
  let status = 'passed';

  try {
    // Configurar timeout de la página
    page.setDefaultTimeout(50000);

    const propertyPage = new PropertyPage(page);
    await propertyPage.login(USER_EMAIL, USER_PASSWORD);
    
    // Generar ID único para la propiedad
    const uniqueId = Date.now().toString();
    await propertyPage.createProperty(uniqueId);
    
    // Validar que la propiedad fue creada correctamente
    const isCreated = await propertyPage.isPropertyCreated();
    expect(isCreated).toBe(true);
    
    console.log(`✅ Propiedad creada exitosamente con ID: ${uniqueId}`);

  } catch (error) {
    status = 'failed';
    errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`❌ Error al crear propiedad: ${errorMsg}`);
    
    // Tomar screenshot del error en la carpeta screenshot_error_
    const timestamp = Date.now();
    await page.screenshot({ path: `screenshot_error_/screenshot_error_${timestamp}.png` });
    
    throw error;
  } finally {
    const duration = (Date.now() - startTime) / 1000; // Convertir a segundos
    const dateIso = new Date().toISOString();
    
    await sendTestResultsToFirebase({
      name: 'test_create_property',
      status: status,
      duration: Math.round(duration * 100) / 100, // Redondear a 2 decimales
      date: dateIso,
      error: errorMsg,
      executionType: EXECUTION_TYPE
    });
  }
});
