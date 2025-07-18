import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';
import type { PlaywrightScript, ScriptExecutionResult } from '../types/playwrightScript';

const SCRIPTS_COLLECTION = 'tests';
const EXECUTIONS_COLLECTION = 'script-executions';

export class PlaywrightScriptsService {
  
  // Obtener todos los scripts
  async getAllScripts(): Promise<PlaywrightScript[]> {
    try {
      const q = query(
        collection(db, SCRIPTS_COLLECTION),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs
        .filter(doc => doc.data().type === 'playwright')
        .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          url: data.url || '',
          steps: this.parseStepsFromContent(data.content),
          tags: data.tags || [],
          createdAt: data.created_at?.toDate?.()?.toISOString() || data.created_at,
          updatedAt: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
          createdBy: data.created_by || 'user',
          isPublic: data.is_public || false,
          executionCount: data.execution_count || 0,
          lastExecuted: data.last_executed,
          status: data.status || 'active'
        } as PlaywrightScript;
      });
    } catch (error) {
      console.error('Error obteniendo scripts:', error);
      return [];
    }
  }

  // Parsear pasos desde el contenido del script
  private parseStepsFromContent(content: string): any[] {
    try {
      const steps = [];
      const lines = content.split('\n');
      let order = 1;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.includes('page.goto(')) {
          const url = trimmedLine.match(/page\.goto\('([^']+)'\)/)?.[1] || '';
          steps.push({
            id: `step_${order}`,
            action: 'goto',
            target: url,
            order: order++
          });
        } else if (trimmedLine.includes('page.fill(')) {
          const match = trimmedLine.match(/page\.fill\('([^']+)',\s*'([^']+)'\)/);
          if (match) {
            steps.push({
              id: `step_${order}`,
              action: 'fill',
              target: match[1],
              value: match[2],
              order: order++
            });
          }
        } else if (trimmedLine.includes('page.click(')) {
          const selector = trimmedLine.match(/page\.click\('([^']+)'\)/)?.[1] || '';
          steps.push({
            id: `step_${order}`,
            action: 'click',
            target: selector,
            order: order++
          });
        } else if (trimmedLine.includes('page.getByRole(')) {
          const roleMatch = trimmedLine.match(/page\.getByRole\('([^']+)',\s*{\s*name:\s*'([^']+)'\s*}\)/);
          if (roleMatch) {
            const action = trimmedLine.includes('.click()') ? 'click' : 
                          trimmedLine.includes('.fill(') ? 'fill' : 'click';
            steps.push({
              id: `step_${order}`,
              action: action,
              target: `${roleMatch[1]}[name="${roleMatch[2]}"]`,
              value: action === 'fill' ? 'valor' : undefined,
              order: order++
            });
          }
        }
      }

      return steps;
    } catch (error) {
      console.error('Error parseando pasos:', error);
      return [];
    }
  }

  // Obtener script por ID
  async getScriptById(id: string): Promise<PlaywrightScript | null> {
    try {
      const docRef = doc(db, SCRIPTS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          description: data.description,
          url: data.url || '',
          steps: this.parseStepsFromContent(data.content),
          tags: data.tags || [],
          createdAt: data.created_at?.toDate?.()?.toISOString() || data.created_at,
          updatedAt: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
          createdBy: data.created_by || 'user',
          isPublic: data.is_public || false,
          executionCount: data.execution_count || 0,
          lastExecuted: data.last_executed,
          status: data.status || 'active'
        } as PlaywrightScript;
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo script:', error);
      return null;
    }
  }

  // Crear nuevo script
  async createScript(script: { name: string; description: string; url: string; steps: any[]; tags: string[]; createdBy: string; isPublic: boolean }): Promise<string> {
    try {
      const content = this.generatePlaywrightContent(script as PlaywrightScript);
      
      const docRef = await addDoc(collection(db, SCRIPTS_COLLECTION), {
        name: script.name,
        description: script.description,
        content: content,
        type: 'playwright',
        tags: script.tags,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        created_by: script.createdBy,
        is_public: script.isPublic,
        execution_count: 0
      });
      
      console.log('✅ Script creado con ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creando script:', error);
      throw error;
    }
  }

  // Generar contenido de Playwright desde script
  private generatePlaywrightContent(script: PlaywrightScript): string {
    let content = `import {test, expect } from '@playwright/test';\n\n`;
    content += `test('${script.name}', async ({ page }) => {\n`;

    script.steps.forEach(step => {
      switch (step.action) {
        case 'goto':
          content += `  // Navegar a la página\n`;
          content += `  await page.goto('${step.target}');\n`;
          break;
        case 'click':
          content += `  // Hacer clic\n`;
          content += `  await page.click('${step.target}');\n`;
          break;
        case 'fill':
          content += `  // Llenar campo\n`;
          content += `  await page.fill('${step.target}', '${step.value || ''}');\n`;
          break;
        case 'type':
          content += `  // Escribir texto\n`;
          content += `  await page.type('${step.target}', '${step.value || ''}');\n`;
          break;
        case 'select':
          content += `  // Seleccionar opción\n`;
          content += `  await page.selectOption('${step.target}', '${step.value || ''}');\n`;
          break;
        case 'wait':
          content += `  // Esperar\n`;
          content += `  await page.waitForTimeout(${step.value || 1000});\n`;
          break;
        case 'screenshot':
          content += `  // Capturar pantalla\n`;
          content += `  await page.screenshot({ path: 'screenshot-${Date.now()}.png' });\n`;
          break;
        case 'hover':
          content += `  // Pasar mouse\n`;
          content += `  await page.hover('${step.target}');\n`;
          break;
      }
    });

    content += `});\n`;
    return content;
  }

  // Actualizar script
  async updateScript(id: string, updates: Partial<PlaywrightScript>): Promise<void> {
    try {
      const updateData: any = {
        updated_at: serverTimestamp()
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.description = updates.description;
      if (updates.tags) updateData.tags = updates.tags;
      if (updates.status) updateData.status = updates.status;

      if (updates.steps) {
        updateData.content = this.generatePlaywrightContent({
          ...updates,
          name: updates.name || '',
          url: updates.url || '',
          createdBy: updates.createdBy || 'user',
          isPublic: updates.isPublic || false,
          id: '',
          createdAt: '',
          updatedAt: '',
          executionCount: 0,
          lastExecuted: undefined,
          status: 'active'
        } as PlaywrightScript);
      }

      const docRef = doc(db, SCRIPTS_COLLECTION, id);
      await updateDoc(docRef, updateData);
      
      console.log('✅ Script actualizado:', id);
    } catch (error) {
      console.error('Error actualizando script:', error);
      throw error;
    }
  }

  // Eliminar script
  async deleteScript(id: string): Promise<void> {
    try {
      const docRef = doc(db, SCRIPTS_COLLECTION, id);
      await deleteDoc(docRef);
      
      console.log('✅ Script eliminado:', id);
    } catch (error) {
      console.error('Error eliminando script:', error);
      throw error;
    }
  }

  // Buscar scripts por tags
  async searchScriptsByTags(tags: string[]): Promise<PlaywrightScript[]> {
    try {
      const q = query(
        collection(db, SCRIPTS_COLLECTION),
        where('type', '==', 'playwright'),
        where('tags', 'array-contains-any', tags),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          url: data.url || '',
          steps: this.parseStepsFromContent(data.content),
          tags: data.tags || [],
          createdAt: data.created_at?.toDate?.()?.toISOString() || data.created_at,
          updatedAt: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
          createdBy: data.created_by || 'user',
          isPublic: data.is_public || false,
          executionCount: data.execution_count || 0,
          lastExecuted: data.last_executed,
          status: data.status || 'active'
        } as PlaywrightScript;
      });
    } catch (error) {
      console.error('Error buscando scripts por tags:', error);
      return [];
    }
  }

  // Obtener scripts por usuario
  async getScriptsByUser(userId: string): Promise<PlaywrightScript[]> {
    try {
      const q = query(
        collection(db, SCRIPTS_COLLECTION),
        where('type', '==', 'playwright'),
        where('created_by', '==', userId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          url: data.url || '',
          steps: this.parseStepsFromContent(data.content),
          tags: data.tags || [],
          createdAt: data.created_at?.toDate?.()?.toISOString() || data.created_at,
          updatedAt: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
          createdBy: data.created_by || 'user',
          isPublic: data.is_public || false,
          executionCount: data.execution_count || 0,
          lastExecuted: data.last_executed,
          status: data.status || 'active'
        } as PlaywrightScript;
      });
    } catch (error) {
      console.error('Error obteniendo scripts del usuario:', error);
      return [];
    }
  }

  // Guardar resultado de ejecución
  async saveExecutionResult(result: Omit<ScriptExecutionResult, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, EXECUTIONS_COLLECTION), {
        ...result,
        createdAt: serverTimestamp()
      });
      
      console.log('✅ Resultado de ejecución guardado:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error guardando resultado de ejecución:', error);
      throw error;
    }
  }

  // Obtener historial de ejecuciones
  async getExecutionHistory(scriptId: string): Promise<ScriptExecutionResult[]> {
    try {
      const q = query(
        collection(db, EXECUTIONS_COLLECTION),
        where('scriptId', '==', scriptId),
        orderBy('startTime', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScriptExecutionResult[];
    } catch (error) {
      console.error('Error obteniendo historial de ejecuciones:', error);
      return [];
    }
  }

  // Incrementar contador de ejecuciones
  async incrementExecutionCount(scriptId: string): Promise<void> {
    try {
      const script = await this.getScriptById(scriptId);
      if (script) {
        await this.updateScript(scriptId, {
          executionCount: script.executionCount + 1,
          lastExecuted: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error incrementando contador de ejecuciones:', error);
    }
  }

  // Generar código Playwright desde script
  generatePlaywrightCode(script: PlaywrightScript): string {
    return this.generatePlaywrightContent(script);
  }
}

export default new PlaywrightScriptsService(); 