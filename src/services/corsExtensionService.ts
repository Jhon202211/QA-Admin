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
  // IDs conocidos de extensiones de CORS
  private knownExtensionIds = [
    'cors-extension-id', // ID genérico
    'test-cors-extension', // Test CORS
    'cors-unblock', // CORS Unblock
    'allow-cors' // Allow CORS
  ];
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
      // Intentar múltiples métodos de detección
      const detectionMethods = [
        this.detectViaChromeRuntime(),
        this.detectViaPostMessage(),
        this.detectViaExtensionAPI()
      ];

      for (const method of detectionMethods) {
        try {
          const result = await method;
          if (result.isInstalled) {
            console.log('✅ Extensión de CORS detectada:', result);
            return result;
          }
        } catch (error) {
          console.log('Método de detección falló:', error);
        }
      }

      // Si ningún método funciona, intentar detección por presencia de elementos DOM
      const domDetection = this.detectViaDOM();
      if (domDetection.isInstalled) {
        console.log('✅ Extensión de CORS detectada via DOM:', domDetection);
        return domDetection;
      }

      throw new Error('No se pudo detectar ninguna extensión de CORS');
    } catch (error) {
      console.log('Extensión de CORS no detectada:', error);
      return {
        isInstalled: false,
        isEnabled: false,
        canAccess: false
      };
    }
  }

  // Detectar via Chrome Runtime API
  private async detectViaChromeRuntime(): Promise<CorsExtensionStatus> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof window.chrome === 'undefined' || !window.chrome?.runtime) {
          reject(new Error('Chrome runtime no disponible'));
          return;
        }

        let responsesReceived = 0;
        const totalExtensions = this.knownExtensionIds.length;

        // Intentar con diferentes IDs de extensión
        for (const extensionId of this.knownExtensionIds) {
          try {
            window.chrome.runtime.sendMessage(extensionId, { action: 'ping' }, (response: any) => {
              responsesReceived++;
              
              if (window.chrome?.runtime.lastError) {
                console.log(`Error con extensión ${extensionId}:`, window.chrome.runtime.lastError);
              } else if (response) {
                console.log(`✅ Extensión ${extensionId} respondió:`, response);
                resolve({
                  isInstalled: true,
                  isEnabled: response.enabled || true,
                  canAccess: true
                });
                return;
              }

              // Si todas las extensiones han respondido sin éxito
              if (responsesReceived === totalExtensions) {
                reject(new Error('Ninguna extensión respondió via Chrome Runtime'));
              }
            });
          } catch (error) {
            console.log(`Error probando extensión ${extensionId}:`, error);
            responsesReceived++;
            
            if (responsesReceived === totalExtensions) {
              reject(new Error('Error en todas las extensiones'));
            }
          }
        }

        // Timeout después de 3 segundos
        setTimeout(() => {
          reject(new Error('Timeout en detección via Chrome Runtime'));
        }, 3000);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Detectar via PostMessage
  private async detectViaPostMessage(): Promise<CorsExtensionStatus> {
    return new Promise((resolve, reject) => {
      try {
        window.postMessage({
          type: 'CORS_EXTENSION_DETECT',
          data: { action: 'ping' }
        }, '*');

        const timeout = setTimeout(() => {
          reject(new Error('Timeout en detección via PostMessage'));
        }, 2000);

        const listener = (event: MessageEvent) => {
          if (event.data.type === 'CORS_EXTENSION_RESPONSE') {
            clearTimeout(timeout);
            window.removeEventListener('message', listener);
            resolve({
              isInstalled: true,
              isEnabled: event.data.data?.enabled || true,
              canAccess: true
            });
          }
        };

        window.addEventListener('message', listener);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Detectar via Extension API
  private async detectViaExtensionAPI(): Promise<CorsExtensionStatus> {
    try {
      // Intentar acceder a APIs de extensiones conocidas
      const extensionAPIs = [
        'corsExtension',
        'testCorsExtension',
        'corsUnblockExtension'
      ];

      for (const apiName of extensionAPIs) {
        if ((window as any)[apiName]) {
          return {
            isInstalled: true,
            isEnabled: true,
            canAccess: true
          };
        }
      }

      throw new Error('No se encontraron APIs de extensión');
    } catch (error) {
      throw error;
    }
  }

  // Detectar via elementos DOM
  private detectViaDOM(): CorsExtensionStatus {
    try {
      // Buscar elementos que indiquen presencia de extensiones de CORS
      const corsIndicators = [
        '[data-cors-extension]',
        '.cors-extension-indicator',
        '[id*="cors"]',
        '[class*="cors"]'
      ];

      for (const selector of corsIndicators) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          return {
            isInstalled: true,
            isEnabled: true,
            canAccess: true
          };
        }
      }

      // Buscar en el título de la página o en meta tags
      const pageText = document.title + ' ' + document.body.innerText;
      if (pageText.toLowerCase().includes('cors') || pageText.toLowerCase().includes('test cors')) {
        return {
          isInstalled: true,
          isEnabled: true,
          canAccess: true
        };
      }

      return {
        isInstalled: false,
        isEnabled: false,
        canAccess: false
      };
    } catch (error) {
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
        console.log('⚠️ Extensión no detectada, continuando sin CORS');
        return false;
      }

      // Configurar para ejecución con timeout más largo
      const result = await Promise.race([
        this.sendMessageToExtension({
          action: 'enable',
          mode: 'execution',
          config: {
            allowCrossOrigin: true,
            allowMultipleTabs: true,
            executeScripts: true
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout activando extensión')), 10000)
        )
      ]);

      console.log('✅ Extensión de CORS activada para ejecución');
      return true;
    } catch (error) {
      console.error('❌ Error activando extensión para ejecución:', error);
      console.log('⚠️ Continuando sin extensión CORS');
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
        if (typeof window.chrome !== 'undefined' && window.chrome?.runtime) {
          let responsesReceived = 0;
          const totalExtensions = this.knownExtensionIds.length;
          let resolved = false;

          // Intentar con diferentes IDs de extensión
          for (const extensionId of this.knownExtensionIds) {
            try {
              window.chrome.runtime.sendMessage(extensionId, message, (response: any) => {
                responsesReceived++;
                
                if (window.chrome?.runtime.lastError) {
                  console.log(`Error con extensión ${extensionId}:`, window.chrome.runtime.lastError);
                } else if (response && !resolved) {
                  console.log(`✅ Extensión ${extensionId} respondió al mensaje:`, response);
                  resolved = true;
                  resolve(response);
                  return;
                }

                // Si todas las extensiones han respondido sin éxito
                if (responsesReceived === totalExtensions && !resolved) {
                  console.log('⚠️ Ninguna extensión respondió, usando fallback');
                  this.sendMessageViaPostMessage(message, resolve, reject);
                }
              });
            } catch (error) {
              console.log(`Error enviando mensaje a extensión ${extensionId}:`, error);
              responsesReceived++;
              
              if (responsesReceived === totalExtensions && !resolved) {
                console.log('⚠️ Todas las extensiones fallaron, usando fallback');
                this.sendMessageViaPostMessage(message, resolve, reject);
              }
            }
          }

          // Timeout después de 3 segundos
          setTimeout(() => {
            if (!resolved) {
              console.log('⚠️ Timeout en comunicación con extensiones, usando fallback');
              this.sendMessageViaPostMessage(message, resolve, reject);
            }
          }, 3000);
        } else {
          // Fallback: intentar usar postMessage
          console.log('⚠️ Chrome runtime no disponible, usando fallback');
          this.sendMessageViaPostMessage(message, resolve, reject);
        }
      } catch (error) {
        console.error('❌ Error en sendMessageToExtension:', error);
        reject(error);
      }
    });
  }

  // Enviar mensaje via PostMessage
  private sendMessageViaPostMessage(message: any, resolve: (value: any) => void, reject: (error: any) => void) {
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