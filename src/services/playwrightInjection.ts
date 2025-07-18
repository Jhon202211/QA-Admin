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
            console.log('📨 Mensaje recibido en ventana de destino:', event.data);
            
            if (event.data.type === 'PLAYWRIGHT_EXECUTE') {
              console.log('📝 Ejecutando paso:', event.data.stepNumber, 'Código:', event.data.code);
              
              try {
                // Ejecutar el código de Playwright
                const result = eval(event.data.code);
                
                // Responder con éxito
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'PLAYWRIGHT_RESPONSE',
                    stepNumber: event.data.stepNumber,
                    success: true,
                    result: result
                  }, '*');
                } else if (window.parent) {
                  window.parent.postMessage({
                    type: 'PLAYWRIGHT_RESPONSE',
                    stepNumber: event.data.stepNumber,
                    success: true,
                    result: result
                  }, '*');
                }
                
                console.log('✅ Paso ejecutado exitosamente');
              } catch (error) {
                console.error('❌ Error ejecutando paso:', error);
                
                // Responder con error
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'PLAYWRIGHT_RESPONSE',
                    stepNumber: event.data.stepNumber,
                    success: false,
                    error: error.message
                  }, '*');
                } else if (window.parent) {
                  window.parent.postMessage({
                    type: 'PLAYWRIGHT_RESPONSE',
                    stepNumber: event.data.stepNumber,
                    success: false,
                    error: error.message
                  }, '*');
                }
              }
            }
          });

          // También escuchar en window.opener si existe
          if (window.opener) {
            window.opener.addEventListener('message', function(event) {
              console.log('📨 Mensaje recibido via opener:', event.data);
              
              if (event.data.type === 'PLAYWRIGHT_EXECUTE') {
                console.log('📝 Ejecutando paso via opener:', event.data.stepNumber);
                
                try {
                  const result = eval(event.data.code);
                  
                  window.opener.postMessage({
                    type: 'PLAYWRIGHT_RESPONSE',
                    stepNumber: event.data.stepNumber,
                    success: true,
                    result: result
                  }, '*');
                  
                  console.log('✅ Paso ejecutado exitosamente via opener');
                } catch (error) {
                  console.error('❌ Error ejecutando paso via opener:', error);
                  
                  window.opener.postMessage({
                    type: 'PLAYWRIGHT_RESPONSE',
                    stepNumber: event.data.stepNumber,
                    success: false,
                    error: error.message
                  }, '*');
                }
              }
            });
          }
          
          // Función para ejecutar acciones de Playwright de forma segura
          window.playwrightExecute = function(action, selector, value) {
            console.log('🎯 Ejecutando acción:', action, 'selector:', selector, 'value:', value);
            
            try {
              switch (action) {
                case 'goto':
                  console.log('🌐 Navegando a:', selector);
                  window.location.href = selector;
                  return { success: true, message: 'Navegación exitosa' };
                  
                case 'click':
                  console.log('🖱️ Buscando elemento para clic:', selector);
                  const clickElement = document.querySelector(selector);
                  if (clickElement) {
                    console.log('✅ Elemento encontrado, haciendo clic');
                    clickElement.click();
                    // Esperar un poco después del clic
                    setTimeout(() => {
                      console.log('✅ Clic completado');
                    }, 100);
                    return { success: true, message: 'Clic exitoso' };
                  } else {
                    console.error('❌ Elemento no encontrado:', selector);
                    // Intentar con diferentes selectores
                    const altSelectors = [
                      selector.replace('textbox[name="', 'input[name="'),
                      selector.replace('button[name="', 'button[name="'),
                      selector.replace('link[name="', 'a[name="'),
                      selector.replace('textbox[', 'input['),
                      selector.replace('button[', 'button['),
                      selector.replace('link[', 'a[')
                    ];
                    
                    for (const altSelector of altSelectors) {
                      const altElement = document.querySelector(altSelector);
                      if (altElement) {
                        console.log('✅ Elemento encontrado con selector alternativo:', altSelector);
                        altElement.click();
                        return { success: true, message: 'Clic exitoso con selector alternativo' };
                      }
                    }
                    
                    throw new Error('Elemento no encontrado: ' + selector);
                  }
                  
                case 'fill':
                  console.log('📝 Buscando elemento para llenar:', selector);
                  const fillElement = document.querySelector(selector);
                  if (fillElement) {
                    console.log('✅ Elemento encontrado, llenando con:', value);
                    fillElement.focus();
                    fillElement.value = value || '';
                    fillElement.dispatchEvent(new Event('input', { bubbles: true }));
                    fillElement.dispatchEvent(new Event('change', { bubbles: true }));
                    return { success: true, message: 'Campo llenado exitosamente' };
                  } else {
                    console.error('❌ Elemento no encontrado:', selector);
                    // Intentar con diferentes selectores
                    const altSelectors = [
                      selector.replace('textbox[name="', 'input[name="'),
                      selector.replace('textbox[', 'input[')
                    ];
                    
                    for (const altSelector of altSelectors) {
                      const altElement = document.querySelector(altSelector);
                      if (altElement) {
                        console.log('✅ Elemento encontrado con selector alternativo:', altSelector);
                        altElement.focus();
                        altElement.value = value || '';
                        altElement.dispatchEvent(new Event('input', { bubbles: true }));
                        altElement.dispatchEvent(new Event('change', { bubbles: true }));
                        return { success: true, message: 'Campo llenado exitosamente con selector alternativo' };
                      }
                    }
                    
                    throw new Error('Elemento no encontrado: ' + selector);
                  }
                  
                case 'type':
                  console.log('⌨️ Buscando elemento para escribir:', selector);
                  const typeElement = document.querySelector(selector);
                  if (typeElement) {
                    console.log('✅ Elemento encontrado, escribiendo:', value);
                    typeElement.focus();
                    typeElement.value = value || '';
                    typeElement.dispatchEvent(new Event('input', { bubbles: true }));
                    typeElement.dispatchEvent(new Event('change', { bubbles: true }));
                    return { success: true, message: 'Texto escrito exitosamente' };
                  } else {
                    console.error('❌ Elemento no encontrado:', selector);
                    throw new Error('Elemento no encontrado: ' + selector);
                  }
                  
                case 'select':
                  console.log('📋 Buscando elemento para seleccionar:', selector);
                  const selectElement = document.querySelector(selector);
                  if (selectElement) {
                    console.log('✅ Elemento encontrado, seleccionando:', value);
                    selectElement.value = value || '';
                    selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                    return { success: true, message: 'Opción seleccionada exitosamente' };
                  } else {
                    console.error('❌ Elemento no encontrado:', selector);
                    throw new Error('Elemento no encontrado: ' + selector);
                  }
                  
                case 'wait':
                  console.log('⏳ Esperando:', value, 'ms');
                  return new Promise(resolve => {
                    setTimeout(() => {
                      resolve({ success: true, message: 'Espera completada' });
                    }, parseInt(value) || 1000);
                  });
                  
                case 'screenshot':
                  console.log('📸 Capturando pantalla');
                  return { success: true, message: 'Captura de pantalla simulada' };
                  
                case 'hover':
                  console.log('🖱️ Buscando elemento para hover:', selector);
                  const hoverElement = document.querySelector(selector);
                  if (hoverElement) {
                    console.log('✅ Elemento encontrado, haciendo hover');
                    hoverElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                    return { success: true, message: 'Hover exitoso' };
                  } else {
                    console.error('❌ Elemento no encontrado:', selector);
                    throw new Error('Elemento no encontrado: ' + selector);
                  }
                  
                default:
                  console.error('❌ Acción no reconocida:', action);
                  throw new Error('Acción no reconocida: ' + action);
              }
            } catch (error) {
              console.error('❌ Error en acción:', error);
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