export interface CorsExtensionStatus {
  isInstalled: boolean;
  isEnabled: boolean;
  canAccess: boolean;
}

export interface CorsExtensionConfig {
  whitelist: string[];
  enabled: boolean;
}

export class CorsExtensionService {
  private static instance: CorsExtensionService;
  private extensionId = 'cors-extension-id'; // ID de la extensión de CORS
  private isInitialized = false;

  static getInstance(): CorsExtensionService {
    if (!CorsExtensionService.instance) {
      CorsExtensionService.instance = new CorsExtensionService();
    }
    return CorsExtensionService.instance;
  }

  // Detectar si la extensión está instalada
  async detectExtension(): Promise<CorsExtensionStatus> {
    try {
      // Intentar comunicarse con la extensión
      const response = await this.sendMessageToExtension({ action: 'ping' });
      
      return {
        isInstalled: true,
        isEnabled: response?.enabled || false,
        canAccess: true
      };
    } catch (error) {
      console.log('Extensión de CORS no detectada:', error);
      return {
        isInstalled: false,
        isEnabled: false,
        canAccess: false
      };
    }
  }

  // Activar la extensión para grabación
  async enableForRecording(): Promise<boolean> {
    try {
      const status = await this.detectExtension();
      
      if (!status.isInstalled) {
        throw new Error('La extensión de CORS no está instalada');
      }

      // Configurar para grabación
      await this.sendMessageToExtension({
        action: 'enable',
        mode: 'recording',
        config: {
          allowCrossOrigin: true,
          allowMultipleTabs: true,
          captureEvents: true
        }
      });

      console.log('✅ Extensión de CORS activada para grabación');
      return true;
    } catch (error) {
      console.error('❌ Error activando extensión para grabación:', error);
      return false;
    }
  }

  // Activar la extensión para ejecución
  async enableForExecution(): Promise<boolean> {
    try {
      const status = await this.detectExtension();
      
      if (!status.isInstalled) {
        throw new Error('La extensión de CORS no está instalada');
      }

      // Configurar para ejecución
      await this.sendMessageToExtension({
        action: 'enable',
        mode: 'execution',
        config: {
          allowCrossOrigin: true,
          allowMultipleTabs: true,
          executeScripts: true
        }
      });

      console.log('✅ Extensión de CORS activada para ejecución');
      return true;
    } catch (error) {
      console.error('❌ Error activando extensión para ejecución:', error);
      return false;
    }
  }

  // Desactivar la extensión
  async disable(): Promise<boolean> {
    try {
      await this.sendMessageToExtension({
        action: 'disable'
      });

      console.log('✅ Extensión de CORS desactivada');
      return true;
    } catch (error) {
      console.error('❌ Error desactivando extensión:', error);
      return false;
    }
  }

  // Agregar sitio a la lista blanca
  async addToWhitelist(url: string): Promise<boolean> {
    try {
      await this.sendMessageToExtension({
        action: 'addToWhitelist',
        url: url
      });

      console.log(`✅ ${url} agregado a la lista blanca`);
      return true;
    } catch (error) {
      console.error('❌ Error agregando a lista blanca:', error);
      return false;
    }
  }

  // Remover sitio de la lista blanca
  async removeFromWhitelist(url: string): Promise<boolean> {
    try {
      await this.sendMessageToExtension({
        action: 'removeFromWhitelist',
        url: url
      });

      console.log(`✅ ${url} removido de la lista blanca`);
      return true;
    } catch (error) {
      console.error('❌ Error removiendo de lista blanca:', error);
      return false;
    }
  }

  // Obtener configuración actual
  async getConfig(): Promise<CorsExtensionConfig | null> {
    try {
      const response = await this.sendMessageToExtension({
        action: 'getConfig'
      });

      return response?.config || null;
    } catch (error) {
      console.error('❌ Error obteniendo configuración:', error);
      return null;
    }
  }

  // Comunicarse con la extensión
  private async sendMessageToExtension(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // Intentar comunicarse con la extensión usando chrome.runtime
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage(this.extensionId, message, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        } else {
          // Fallback: intentar usar postMessage
          window.postMessage({
            type: 'CORS_EXTENSION_MESSAGE',
            data: message
          }, '*');
          
          // Escuchar respuesta
          const timeout = setTimeout(() => {
            reject(new Error('Timeout esperando respuesta de extensión'));
          }, 5000);

          const listener = (event: MessageEvent) => {
            if (event.data.type === 'CORS_EXTENSION_RESPONSE') {
              clearTimeout(timeout);
              window.removeEventListener('message', listener);
              resolve(event.data.data);
            }
          };

          window.addEventListener('message', listener);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // Verificar si podemos grabar eventos en otras pestañas
  async canRecordCrossTab(): Promise<boolean> {
    try {
      const status = await this.detectExtension();
      return status.isInstalled && status.isEnabled;
    } catch (error) {
      return false;
    }
  }

  // Verificar si podemos ejecutar scripts en otras pestañas
  async canExecuteCrossTab(): Promise<boolean> {
    try {
      const status = await this.detectExtension();
      return status.isInstalled && status.isEnabled;
    } catch (error) {
      return false;
    }
  }

  // Mostrar instrucciones de instalación
  showInstallInstructions(): void {
    const instructions = `
🔧 Instalación de Extensión de CORS

Para habilitar la grabación y ejecución real de pruebas:

1. Instala la extensión "Test CORS" desde Chrome Web Store
2. Activa la extensión haciendo clic en el icono "C:"
3. Configura la lista blanca con los sitios que quieres probar
4. Recarga esta página

Una vez instalada, podrás:
- Grabar eventos en múltiples pestañas
- Ejecutar scripts que interactúen con otros sitios
- Automatizar flujos complejos

¿Quieres continuar sin la extensión? (funcionalidad limitada)
    `;

    if (confirm(instructions)) {
      console.log('Usuario continuará sin extensión de CORS');
    } else {
      // Abrir Chrome Web Store
      window.open('https://chrome.google.com/webstore/detail/test-cors/...', '_blank');
    }
  }
}

export default CorsExtensionService.getInstance(); 