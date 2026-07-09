import { apiUrl } from '../config/api';

const apiJson = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(apiUrl(url), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}`);
  }

  return response.json();
};

const testResults = [
  {
    name: 'Login Test',
    date: new Date().toISOString(),
    status: 'passed',
    duration: 1.5,
    error: null,
  },
  {
    name: 'Registration Test',
    date: new Date().toISOString(),
    status: 'failed',
    duration: 2.3,
    error: 'Validation error: Email already exists',
  },
  {
    name: 'Profile Update Test',
    date: new Date().toISOString(),
    status: 'passed',
    duration: 0.8,
    error: null,
  }
];

export const seedTestResults = async () => {
  for (const result of testResults) {
    try {
      await apiJson('/api/data/test_results', {
        method: 'POST',
        body: JSON.stringify(result),
      });
      console.log('Added test result:', result.name);
    } catch (error) {
      console.error('Error adding test result:', error);
    }
  }
  
  console.log('Finished seeding test results');
};

// Casos automatizados por defecto
const defaultAutomationCases = [
  { 
    name: 'Crear usuario', 
    description: 'Prueba de creación de usuario.', 
    test_file: 'create_user.spec.ts',
    prompts: 'Endpoint: /users/create\nDatos: UserTest, testQa\nConfiguración: Playwright',
    status: 'active'
  },
  { 
    name: 'Crear visitante', 
    description: 'Prueba de creación de visitante.', 
    test_file: 'create_visitor.spec.ts',
    prompts: 'Endpoint: /visitors/create\nConfiguración: Playwright',
    status: 'active'
  },
  { 
    name: 'Crear empresa', 
    description: 'Prueba de creación de empresa.', 
    test_file: 'create_company.spec.ts',
    prompts: 'Endpoint: /companies/create\nConfiguración: Playwright',
    status: 'active'
  },
  { 
    name: 'Reservar sala', 
    description: 'Prueba de reserva de sala.', 
    test_file: 'create_room_reservation.spec.ts',
    prompts: 'Endpoint: /reservations/create\nConfiguración: Playwright',
    status: 'active'
  },
  { 
    name: 'Desactivar usuario/empresa', 
    description: 'Prueba de desactivación de usuario o empresa.', 
    test_file: 'desactivate_company.spec.ts',
    prompts: 'Configuración: Playwright',
    status: 'active'
  },
  { 
    name: 'Restaurar usuario/empresa', 
    description: 'Prueba de restauración de usuario o empresa.', 
    test_file: 'restore_user_company.spec.ts',
    prompts: 'Configuración: Playwright',
    status: 'active'
  },
  { 
    name: 'Crear Copropiedad', 
    description: 'Prueba de creación de copropiedad.', 
    test_file: 'create_property.spec.ts',
    prompts: 'Configuración: Playwright',
    status: 'active'
  },
  { 
    name: 'Editar Copropiedad', 
    description: 'Prueba de edición de copropiedad.', 
    test_file: 'edit_property.spec.ts',
    prompts: 'Configuración: Playwright',
    status: 'active'
  },
  { 
    name: 'Desactivar Copropiedad', 
    description: 'Prueba de desactivación de copropiedad.', 
    test_file: 'desactivate_activate_property.spec.ts',
    prompts: 'Configuración: Playwright',
    status: 'active'
  },
];

export const seedAutomationCases = async () => {
  // Verificar si ya existen casos
  const existing = await apiJson<{ total: number }>('/api/data/automation');
  if (existing.total > 0) {
    console.log('Los casos automatizados ya existen, no se inicializarán');
    return;
  }
  
  // Crear los casos por defecto
  for (const automationCase of defaultAutomationCases) {
    try {
      await apiJson('/api/data/automation', {
        method: 'POST',
        body: JSON.stringify(automationCase),
      });
      console.log('Added automation case:', automationCase.name);
    } catch (error) {
      console.error('Error adding automation case:', error);
    }
  }
  
  console.log('Finished seeding automation cases');
}; 