export class PlaywrightInjection {
  private static instance: PlaywrightInjection;

  static getInstance(): PlaywrightInjection {
    if (!PlaywrightInjection.instance) {
      PlaywrightInjection.instance = new PlaywrightInjection();
    }
    return PlaywrightInjection.instance;
  }

  // Inyectar script de manejo de CORS en la ventana de destino
  injectCORSHandler(targetWindow: Window): void {
    try {
      const script = `
        // Script de inyección para manejo de CORS
        (function() {
          console.log('🔧 Inyectando manejador de CORS...');
          
          // Escuchar mensajes de Playwright
          window.addEventListener('message', function(event) {
            if (event.data.type === 'PLAYWRIGHT_EXECUTE') {
              console.log('📝 Ejecutando paso:', event.data.stepNumber);
              
              try {
                // Ejecutar el código de Playwright
                const result = eval(event.data.code);
                
                // Responder con éxito
                window.parent.postMessage({
                  type: 'PLAYWRIGHT_RESPONSE',
                  stepNumber: event.data.stepNumber,
                  success: true,
                  result: result
                }, '*');
                
                console.log('✅ Paso ejecutado exitosamente');
              } catch (error) {
                console.error('❌ Error ejecutando paso:', error);
                
                // Responder con error
                window.parent.postMessage({
                  type: 'PLAYWRIGHT_RESPONSE',
                  stepNumber: event.data.stepNumber,
                  success: false,
                  error: error.message
                }, '*');
              }
            }
          });
          
          // Función para ejecutar acciones de Playwright de forma segura
          window.playwrightExecute = function(action, selector, value) {
            try {
              switch (action) {
                case 'goto':
                  window.location.href = selector;
                  return { success: true, message: 'Navegación exitosa' };
                  
                case 'click':
                  const clickElement = document.querySelector(selector);
                  if (clickElement) {
                    clickElement.click();
                    return { success: true, message: 'Clic exitoso' };
                  } else {
                    throw new Error('Elemento no encontrado: ' + selector);
                  }
                  
                case 'fill':
                  const fillElement = document.querySelector(selector);
                  if (fillElement) {
                    fillElement.value = value || '';
                    fillElement.dispatchEvent(new Event('input', { bubbles: true }));
                    fillElement.dispatchEvent(new Event('change', { bubbles: true }));
                    return { success: true, message: 'Campo llenado exitosamente' };
                  } else {
                    throw new Error('Elemento no encontrado: ' + selector);
                  }
                  
                case 'type':
                  const typeElement = document.querySelector(selector);
                  if (typeElement) {
                    typeElement.focus();
                    typeElement.value = value || '';
                    typeElement.dispatchEvent(new Event('input', { bubbles: true }));
                    typeElement.dispatchEvent(new Event('change', { bubbles: true }));
                    return { success: true, message: 'Texto escrito exitosamente' };
                  } else {
                    throw new Error('Elemento no encontrado: ' + selector);
                  }
                  
                case 'select':
                  const selectElement = document.querySelector(selector);
                  if (selectElement) {
                    selectElement.value = value || '';
                    selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                    return { success: true, message: 'Opción seleccionada exitosamente' };
                  } else {
                    throw new Error('Elemento no encontrado: ' + selector);
                  }
                  
                case 'wait':
                  return new Promise(resolve => {
                    setTimeout(() => {
                      resolve({ success: true, message: 'Espera completada' });
                    }, parseInt(value) || 1000);
                  });
                  
                case 'screenshot':
                  // Simular captura de pantalla
                  return { success: true, message: 'Captura de pantalla simulada' };
                  
                case 'hover':
                  const hoverElement = document.querySelector(selector);
                  if (hoverElement) {
                    hoverElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                    return { success: true, message: 'Hover exitoso' };
                  } else {
                    throw new Error('Elemento no encontrado: ' + selector);
                  }
                  
                default:
                  throw new Error('Acción no reconocida: ' + action);
              }
            } catch (error) {
              return { success: false, error: error.message };
            }
          };
          
          console.log('✅ Manejador de CORS inyectado exitosamente');
        })();
      `;

      // Intentar inyectar el script
      try {
        (targetWindow as any).eval(script);
        console.log('✅ Script de CORS inyectado exitosamente');
      } catch (error) {
        console.error('❌ Error inyectando script de CORS:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Error en inyección de CORS:', error);
    }
  }

  // Ejecutar acción de Playwright de forma segura
  async executeAction(targetWindow: Window, action: string, selector: string, value?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // Verificar si la ventana está disponible
        if (!targetWindow || targetWindow.closed) {
          reject(new Error('Ventana de destino no disponible'));
          return;
        }

        // Enviar mensaje para ejecutar acción
        targetWindow.postMessage({
          type: 'PLAYWRIGHT_ACTION',
          action,
          selector,
          value
        }, '*');

        // Escuchar respuesta
        const timeout = setTimeout(() => {
          reject(new Error('Timeout ejecutando acción'));
        }, 10000);

        const listener = (event: MessageEvent) => {
          if (event.data.type === 'PLAYWRIGHT_ACTION_RESPONSE') {
            clearTimeout(timeout);
            window.removeEventListener('message', listener);
            
            if (event.data.success) {
              resolve(event.data.result);
            } else {
              reject(new Error(event.data.error || 'Error ejecutando acción'));
            }
          }
        };

        window.addEventListener('message', listener);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Verificar si la inyección fue exitosa
  checkInjection(targetWindow: Window): boolean {
    try {
      return !!(targetWindow as any).playwrightExecute;
    } catch (error) {
      return false;
    }
  }
}

export default PlaywrightInjection.getInstance(); 