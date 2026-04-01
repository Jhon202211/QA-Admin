export interface AutomationCase {
  id: string;
  name: string;
  description: string;
  test_file: string; // Nombre del archivo de test (ej: create_user.spec.ts)
  prompts: string; // Campo para parámetros/metadatos que Cursor leerá para enlazar con el backend
  status?: 'active' | 'inactive';
  last_status?: 'passed' | 'failed' | 'running' | 'none';
  last_duration?: number;
  last_execution?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

