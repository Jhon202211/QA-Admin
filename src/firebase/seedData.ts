import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './config';

const testResults = [
  {
    name: 'Login Test',
    date: Timestamp.fromDate(new Date()),
    status: 'passed',
    duration: 1.5,
    error: null,
  },
  {
    name: 'Registration Test',
    date: Timestamp.fromDate(new Date()),
    status: 'failed',
    duration: 2.3,
    error: 'Validation error: Email already exists',
  },
  {
    name: 'Profile Update Test',
    date: Timestamp.fromDate(new Date()),
    status: 'passed',
    duration: 0.8,
    error: null,
  }
];

export const seedTestResults = async () => {
  const collectionRef = collection(db, 'test_results');
  
  for (const result of testResults) {
    try {
      await addDoc(collectionRef, {
        ...result,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
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
  const collectionRef = collection(db, 'automation');
  
  // Verificar si ya existen casos
  const snapshot = await getDocs(collectionRef);
  if (snapshot.docs.length > 0) {
    console.log('Los casos automatizados ya existen, no se inicializarán');
    return;
  }
  
  // Crear los casos por defecto
  for (const automationCase of defaultAutomationCases) {
    try {
      await addDoc(collectionRef, {
        ...automationCase,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log('Added automation case:', automationCase.name);
    } catch (error) {
      console.error('Error adding automation case:', error);
    }
  }
  
  console.log('Finished seeding automation cases');
}; 