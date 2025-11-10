export interface AutomationCase {
  id: string;
  name: string;
  description: string;
  test_file: string; // Nombre del archivo de test (ej: test_create_user.py)
  prompts: string; // Campo para parámetros/metadatos que Cursor leerá para enlazar con el backend
  status?: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

