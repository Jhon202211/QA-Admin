import type { PlaywrightScript } from '../types/playwrightScript';
import corsExtensionService from './corsExtensionService';
import playwrightInjection from './playwrightInjection';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  screenshots?: string[];
  currentStep?: number;
  totalSteps?: number;
}

export class PlaywrightExecutor {
  private executionWindow: Window | null = null;
  private isExecuting = false;
  private currentStep = 0;
  private totalSteps = 0;
  private onProgress?: (step: number, total: number, message: string) => void;

  // Ejecutar script de Playwright en una nueva pestaña
  async executeScript(script: PlaywrightScript, onProgress?: (step: number, total: number, message: string) => void): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.onProgress = onProgress;
    this.currentStep = 0;
    this.totalSteps = script.steps.length;
    this.isExecuting = true;
    
    try {
      console.log(`🚀 Iniciando ejecución de: ${script.name}`);
      
      // Verificar y activar extensión de CORS si está disponible
      const corsStatus = await corsExtensionService.detectExtension();
      if (corsStatus.isInstalled) {
        console.log('🔧 Extensión de CORS detectada, activando para ejecución...');
        await corsExtensionService.enableForExecution();
      } else {
        console.log('⚠️ Extensión de CORS no disponible, ejecutando en modo limitado');
      }
      
      // Cerrar ventana anterior si existe
      if (this.executionWindow && !this.executionWindow.closed) {
        this.executionWindow.close();
        this.executionWindow = null;
      }

      // Abrir nueva pestaña con manejo de errores mejorado
      try {
        // Obtener la URL del primer paso si existe
        const firstStep = script.steps.find(step => step.action === 'goto');
        const initialUrl = firstStep ? firstStep.target : 'about:blank';
        
        console.log('🌐 Abriendo ventana con URL inicial:', initialUrl);
        
        this.executionWindow = window.open(initialUrl, '_blank');
        if (!this.executionWindow) {
          // Intentar con diferentes estrategias
          console.log('⚠️ Primera estrategia falló, intentando alternativa...');
          
          // Estrategia 1: Abrir con URL específica
          this.executionWindow = window.open(initialUrl, '_blank');
          if (!this.executionWindow) {
            // Estrategia 2: Usar el mismo origen
            this.executionWindow = window.open(window.location.href, '_blank');
            if (!this.executionWindow) {
              // Estrategia 3: Crear un iframe oculto
              const iframe = document.createElement('iframe');
              iframe.style.display = 'none';
              iframe.src = initialUrl;
              document.body.appendChild(iframe);
              this.executionWindow = iframe.contentWindow;
              
              if (!this.executionWindow) {
                throw new Error('No se pudo abrir nueva pestaña - bloqueado por el navegador');
              }
            }
          }
        }
        
        console.log('✅ Ventana de ejecución creada exitosamente');
        
        // Esperar a que la página se cargue completamente
        await this.waitForPageLoad();
        
        // Inyectar manejador de CORS en la ventana de destino
        try {
          playwrightInjection.injectCORSHandler(this.executionWindow);
          console.log('✅ Manejador de CORS inyectado');
          
          // Verificar que la inyección fue exitosa
          await this.verifyInjection();
        } catch (error) {
          console.log('⚠️ No se pudo inyectar manejador de CORS:', error);
        }
      } catch (error) {
        console.error('❌ Error creando ventana de ejecución:', error);
        throw new Error(`No se pudo abrir nueva pestaña: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Ejecutar los pasos uno por uno
      const result = await this.executeSteps(script);
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Script ejecutado exitosamente en ${duration}ms`);
      
      return {
        success: true,
        output: result.output,
        duration,
        screenshots: result.screenshots,
        currentStep: this.totalSteps,
        totalSteps: this.totalSteps
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Error ejecutando script: ${error}`);
      
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration,
        currentStep: this.currentStep,
        totalSteps: this.totalSteps
      };
    } finally {
      this.isExecuting = false;
      this.executionWindow = null;
      
      // Desactivar extensión de CORS al finalizar
      try {
        await corsExtensionService.disable();
      } catch (error) {
        console.log('⚠️ Error desactivando extensión de CORS:', error);
      }
    }
  }

  // Ejecutar pasos uno por uno
  private async executeSteps(script: PlaywrightScript): Promise<{ output: string; screenshots: string[] }> {
    const output: string[] = [];
    const screenshots: string[] = [];
    
    // Verificar si ya navegamos al abrir la ventana
    const firstStep = script.steps.find(step => step.action === 'goto');
    let skipFirstNavigation = false;
    
    if (firstStep && this.executionWindow) {
      try {
        const currentUrl = this.executionWindow.location.href;
        if (currentUrl.includes(firstStep.target) || currentUrl === firstStep.target) {
          console.log('✅ Ya estamos en la URL correcta, saltando primer paso de navegación');
          skipFirstNavigation = true;
        }
      } catch (error) {
        console.log('⚠️ No se pudo verificar URL actual:', error);
      }
    }

    for (let i = 0; i < script.steps.length; i++) {
      const step = script.steps[i];
      this.currentStep = i + 1;
      
      // Saltar el primer paso de navegación si ya navegamos
      if (i === 0 && step.action === 'goto' && skipFirstNavigation) {
        console.log('⏭️ Saltando paso de navegación inicial');
        output.push(`⏭️ Paso ${i + 1}: ${step.description || step.action} (saltado - ya navegado)`);
        continue;
      }
      
      if (this.onProgress) {
        this.onProgress(this.currentStep, this.totalSteps, `Ejecutando: ${step.description || step.action}`);
      }

      try {
        await this.executeStep(step, i + 1);
        output.push(`✅ Paso ${i + 1}: ${step.description || step.action}`);
        
        // Simular captura de pantalla
        if (step.action === 'screenshot') {
          screenshots.push(`screenshot-${Date.now()}.png`);
        }
        
        // Esperar entre pasos
        await this.delay(500);
        
      } catch (error) {
        output.push(`❌ Error en paso ${i + 1}: ${error}`);
        throw error;
      }
    }

    return {
      output: output.join('\n'),
      screenshots
    };
  }

  // Ejecutar un paso individual
  private async executeStep(step: any, stepNumber: number): Promise<void> {
    if (!this.executionWindow) {
      throw new Error('Ventana de ejecución no disponible');
    }

    const stepCode = this.generateStepCode(step);
    
    try {
      // Verificar si la ventana sigue disponible
      if (this.executionWindow.closed) {
        throw new Error('Ventana de ejecución fue cerrada');
      }

      // Ejecutar el código en la nueva pestaña con manejo de CORS
      await this.executeInWindowWithCORS(stepCode, stepNumber);
      
      // Esperar un poco entre pasos para que las acciones se ejecuten
      await this.delay(1000);
      
    } catch (error) {
      console.error(`❌ Error en paso ${stepNumber}:`, error);
      throw new Error(`Error ejecutando paso ${stepNumber}: ${error}`);
    }
  }

  // Ejecutar código con manejo de CORS
  private async executeInWindowWithCORS(code: string, stepNumber: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Verificar si la ventana sigue disponible
        if (!this.executionWindow || this.executionWindow.closed) {
          reject(new Error('Ventana de ejecución no disponible'));
          return;
        }

        console.log(`🔧 Ejecutando paso ${stepNumber} en ventana:`, code);

        // Usar postMessage directamente para evitar problemas de CORS
        try {
          console.log(`📤 Enviando paso ${stepNumber} via postMessage`);
          this.executionWindow.postMessage({
            type: 'PLAYWRIGHT_EXECUTE',
            stepNumber,
            code
          }, '*');

          // Escuchar respuesta con timeout
          const timeout = setTimeout(() => {
            console.error(`❌ Timeout en paso ${stepNumber}`);
            reject(new Error('Timeout en ejecución de paso'));
          }, 15000); // 15 segundos

          const listener = (event: MessageEvent) => {
            console.log(`📨 Mensaje recibido:`, event.data);
            
            if (event.data.type === 'PLAYWRIGHT_RESPONSE' && event.data.stepNumber === stepNumber) {
              clearTimeout(timeout);
              window.removeEventListener('message', listener);
              
              if (event.data.success) {
                console.log(`✅ Paso ${stepNumber} completado exitosamente`);
                resolve();
              } else {
                console.error(`❌ Error en paso ${stepNumber}:`, event.data.error);
                reject(new Error(event.data.error || 'Error en ejecución'));
              }
            }
          };

          window.addEventListener('message', listener);
        } catch (postMessageError) {
          console.error(`❌ Error enviando postMessage:`, postMessageError);
          reject(new Error(`No se pudo ejecutar paso ${stepNumber}: ${postMessageError}`));
        }
      } catch (error) {
        console.error(`❌ Error general en paso ${stepNumber}:`, error);
        reject(error);
      }
    });
  }

  // Generar código para un paso específico
  private generateStepCode(step: any): string {
    // Código simplificado y directo
    return `
      try {
        console.log('🎯 Ejecutando: ${step.action} en ${step.target}');
        ${this.generateDirectCode(step)}
        console.log('✅ Paso completado: ${step.action}');
      } catch (error) {
        console.error('❌ Error ejecutando paso:', error);
        throw error;
      }
    `;
  }

  // Generar código directo como fallback
  private generateDirectCode(step: any): string {
    switch (step.action) {
      case 'goto':
        return `
          window.location.href = '${step.target}';
          console.log('✅ Navegó a: ${step.target}');
        `;
        
      case 'click':
        return `
          let element = document.querySelector('${step.target}');
          if (!element) {
            // Intentar con selectores alternativos
            const altSelectors = [
              '${step.target}'.replace('textbox[name="', 'input[name="'),
              '${step.target}'.replace('button[name="', 'button[name="'),
              '${step.target}'.replace('link[name="', 'a[name="'),
              '${step.target}'.replace('textbox[', 'input['),
              '${step.target}'.replace('button[', 'button['),
              '${step.target}'.replace('link[', 'a[')
            ];
            
            for (const selector of altSelectors) {
              element = document.querySelector(selector);
              if (element) {
                console.log('✅ Elemento encontrado con selector alternativo:', selector);
                break;
              }
            }
          }
          
          if (element) {
            element.click();
            console.log('✅ Hizo clic en: ${step.target}');
          } else {
            throw new Error('Elemento no encontrado: ${step.target}');
          }
        `;
        
      case 'fill':
        return `
          let element = document.querySelector('${step.target}');
          if (!element) {
            // Intentar con selectores alternativos
            const altSelectors = [
              '${step.target}'.replace('textbox[name="', 'input[name="'),
              '${step.target}'.replace('textbox[', 'input[')
            ];
            
            for (const selector of altSelectors) {
              element = document.querySelector(selector);
              if (element) {
                console.log('✅ Elemento encontrado con selector alternativo:', selector);
                break;
              }
            }
          }
          
          if (element) {
            element.focus();
            element.value = '${step.value || ''}';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Llenó campo: ${step.target}');
          } else {
            throw new Error('Elemento no encontrado: ${step.target}');
          }
        `;
        
      case 'type':
        return `
          let element = document.querySelector('${step.target}');
          if (!element) {
            // Intentar con selectores alternativos
            const altSelectors = [
              '${step.target}'.replace('textbox[name="', 'input[name="'),
              '${step.target}'.replace('textbox[', 'input[')
            ];
            
            for (const selector of altSelectors) {
              element = document.querySelector(selector);
              if (element) {
                console.log('✅ Elemento encontrado con selector alternativo:', selector);
                break;
              }
            }
          }
          
          if (element) {
            element.focus();
            element.value = '${step.value || ''}';
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Escribió en: ${step.target}');
          } else {
            throw new Error('Elemento no encontrado: ${step.target}');
          }
        `;
        
      case 'select':
        return `
          let element = document.querySelector('${step.target}');
          if (element) {
            element.value = '${step.value || ''}';
            element.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Seleccionó opción en: ${step.target}');
          } else {
            throw new Error('Elemento no encontrado: ${step.target}');
          }
        `;
        
      case 'wait':
        return `
          console.log('⏱️ Esperando: ${step.value || 1000}ms');
          await new Promise(resolve => setTimeout(resolve, ${step.value || 1000}));
        `;
        
      case 'screenshot':
        return `
          console.log('📸 Capturó pantalla');
        `;
        
      case 'hover':
        return `
          let element = document.querySelector('${step.target}');
          if (element) {
            element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            console.log('🖱️ Pasó mouse sobre: ${step.target}');
          } else {
            throw new Error('Elemento no encontrado: ${step.target}');
          }
        `;
        
      default:
        return `console.log('⚠️ Acción no reconocida: ${step.action}');`;
    }
  }

  // Ejecutar código en la ventana de ejecución
  private async executeInWindow(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.executionWindow) {
        reject(new Error('Ventana de ejecución no disponible'));
        return;
      }

      try {
        // Crear un script element y ejecutarlo en la nueva pestaña
        const script = this.executionWindow.document.createElement('script');
        script.textContent = code;
        this.executionWindow.document.head.appendChild(script);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Función de delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Esperar a que la página se cargue completamente
  private async waitForPageLoad(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.executionWindow) {
        reject(new Error('Ventana de ejecución no disponible'));
        return;
      }

      console.log('⏳ Esperando a que la página se cargue...');
      
      const timeout = setTimeout(() => {
        console.log('⚠️ Timeout esperando carga de página, continuando...');
        resolve();
      }, 15000); // 15 segundos de timeout

      const checkReady = () => {
        try {
          if (this.executionWindow && !this.executionWindow.closed) {
            const readyState = this.executionWindow.document.readyState;
            console.log('📄 Estado de la página:', readyState);
            
            if (readyState === 'complete') {
              clearTimeout(timeout);
              console.log('✅ Página cargada completamente');
              resolve();
            } else {
              // Verificar cada 500ms
              setTimeout(checkReady, 500);
            }
          } else {
            clearTimeout(timeout);
            reject(new Error('Ventana cerrada durante la carga'));
          }
        } catch (error) {
          console.log('⚠️ Error verificando estado de página:', error);
          // Continuar intentando
          setTimeout(checkReady, 1000);
        }
      };

      // Comenzar verificación
      checkReady();
    });
  }

  // Verificar que la inyección fue exitosa
  private async verifyInjection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.executionWindow) {
        reject(new Error('Ventana de ejecución no disponible'));
        return;
      }

      console.log('🔍 Verificando inyección de script...');
      
      const timeout = setTimeout(() => {
        console.log('⚠️ Timeout verificando inyección, continuando...');
        resolve();
      }, 5000);

      const checkInjection = () => {
        try {
          if (this.executionWindow && !this.executionWindow.closed) {
            const hasInjection = playwrightInjection.checkInjection(this.executionWindow);
            console.log('🔍 Función inyectada disponible:', hasInjection);
            
            if (hasInjection) {
              clearTimeout(timeout);
              console.log('✅ Inyección verificada exitosamente');
              resolve();
            } else {
              // Verificar cada 500ms
              setTimeout(checkInjection, 500);
            }
          } else {
            clearTimeout(timeout);
            reject(new Error('Ventana cerrada durante verificación'));
          }
        } catch (error) {
          console.log('⚠️ Error verificando inyección:', error);
          // Continuar intentando
          setTimeout(checkInjection, 1000);
        }
      };

      // Comenzar verificación
      checkInjection();
    });
  }

  // Detener ejecución
  stopExecution(): void {
    this.isExecuting = false;
    if (this.executionWindow) {
      this.executionWindow.close();
      this.executionWindow = null;
    }
  }

  // Verificar si está ejecutando
  isCurrentlyExecuting(): boolean {
    return this.isExecuting;
  }

  // Obtener progreso actual
  getCurrentProgress(): { current: number; total: number } {
    return {
      current: this.currentStep,
      total: this.totalSteps
    };
  }
}

export default new PlaywrightExecutor(); 