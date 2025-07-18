import type { PlaywrightScript } from '../types/playwrightScript';
import corsExtensionService from './corsExtensionService';

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
      
      // Abrir nueva pestaña con manejo de errores mejorado
      try {
        this.executionWindow = window.open('', '_blank');
        if (!this.executionWindow) {
          // Intentar con diferentes estrategias
          console.log('⚠️ Primera estrategia falló, intentando alternativa...');
          
          // Estrategia 1: Abrir con URL específica
          this.executionWindow = window.open('about:blank', '_blank');
          if (!this.executionWindow) {
            // Estrategia 2: Usar el mismo origen
            this.executionWindow = window.open(window.location.href, '_blank');
            if (!this.executionWindow) {
              // Estrategia 3: Crear un iframe oculto
              const iframe = document.createElement('iframe');
              iframe.style.display = 'none';
              iframe.src = 'about:blank';
              document.body.appendChild(iframe);
              this.executionWindow = iframe.contentWindow;
              
              if (!this.executionWindow) {
                throw new Error('No se pudo abrir nueva pestaña - bloqueado por el navegador');
              }
            }
          }
        }
        
        console.log('✅ Ventana de ejecución creada exitosamente');
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

    for (let i = 0; i < script.steps.length; i++) {
      const step = script.steps[i];
      this.currentStep = i + 1;
      
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
      // Ejecutar el código en la nueva pestaña
      await this.executeInWindow(stepCode);
      
    } catch (error) {
      throw new Error(`Error ejecutando paso ${stepNumber}: ${error}`);
    }
  }

  // Generar código para un paso específico
  private generateStepCode(step: any): string {
    switch (step.action) {
      case 'goto':
        return `
          try {
            window.location.href = '${step.target}';
            console.log('✅ Navegó a: ${step.target}');
          } catch (error) {
            console.error('Error navegando:', error);
            throw error;
          }
        `;
        
      case 'click':
        return `
          try {
            const element = document.querySelector('${step.target}');
            if (element) {
              element.click();
              console.log('✅ Hizo clic en: ${step.target}');
            } else {
              throw new Error('Elemento no encontrado: ${step.target}');
            }
          } catch (error) {
            console.error('Error haciendo clic:', error);
            throw error;
          }
        `;
        
      case 'fill':
        return `
          try {
            const element = document.querySelector('${step.target}');
            if (element) {
              element.value = '${step.value || ''}';
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('✅ Llenó campo: ${step.target}');
            } else {
              throw new Error('Elemento no encontrado: ${step.target}');
            }
          } catch (error) {
            console.error('Error llenando campo:', error);
            throw error;
          }
        `;
        
      case 'type':
        return `
          try {
            const element = document.querySelector('${step.target}');
            if (element) {
              element.focus();
              element.value = '${step.value || ''}';
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('✅ Escribió en: ${step.target}');
            } else {
              throw new Error('Elemento no encontrado: ${step.target}');
            }
          } catch (error) {
            console.error('Error escribiendo:', error);
            throw error;
          }
        `;
        
      case 'select':
        return `
          try {
            const element = document.querySelector('${step.target}');
            if (element) {
              element.value = '${step.value || ''}';
              element.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('✅ Seleccionó opción en: ${step.target}');
            } else {
              throw new Error('Elemento no encontrado: ${step.target}');
            }
          } catch (error) {
            console.error('Error seleccionando:', error);
            throw error;
          }
        `;
        
      case 'wait':
        return `
          console.log('⏱️ Esperando: ${step.value || 1000}ms');
          await new Promise(resolve => setTimeout(resolve, ${step.value || 1000}));
        `;
        
      case 'screenshot':
        return `
          try {
            // Simular captura de pantalla
            console.log('📸 Capturó pantalla');
            // En un entorno real, aquí se capturaría la pantalla
          } catch (error) {
            console.error('Error capturando pantalla:', error);
            throw error;
          }
        `;
        
      case 'hover':
        return `
          try {
            const element = document.querySelector('${step.target}');
            if (element) {
              element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
              console.log('🖱️ Pasó mouse sobre: ${step.target}');
            } else {
              throw new Error('Elemento no encontrado: ${step.target}');
            }
          } catch (error) {
            console.error('Error en hover:', error);
            throw error;
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