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
    test_file: 'test_create_user.py',
    prompts: 'Endpoint: POST /api/users\nDatos requeridos: email, password, name\nConfiguración: requiere autenticación Bearer token',
    status: 'active'
  },
  { 
    name: 'Crear visitante', 
    description: 'Prueba de creación de visitante.', 
    test_file: 'test_create_visitor.py',
    prompts: 'Endpoint: POST /api/visitors\nDatos requeridos: name, document, reason\nConfiguración: requiere autenticación Bearer token',
    status: 'active'
  },
  { 
    name: 'Crear empresa', 
    description: 'Prueba de creación de empresa.', 
    test_file: 'test_create_company.py',
    prompts: 'Endpoint: POST /api/companies\nDatos requeridos: name, nit, address\nConfiguración: requiere autenticación Bearer token',
    status: 'active'
  },
  { 
    name: 'Reservar sala', 
    description: 'Prueba de reserva de sala.', 
    test_file: 'test_create_room_reservation.py',
    prompts: 'Endpoint: POST /api/room-reservations\nDatos requeridos: roomId, date, time, duration\nConfiguración: requiere autenticación Bearer token',
    status: 'active'
  },
  { 
    name: 'Desactivar usuario/empresa', 
    description: 'Prueba de desactivación de usuario o empresa.', 
    test_file: 'test_deactivate_user_company.py',
    prompts: 'Endpoint: PUT /api/users/:id/deactivate o PUT /api/companies/:id/deactivate\nDatos requeridos: id\nConfiguración: requiere autenticación Bearer token',
    status: 'active'
  },
  { 
    name: 'Restaurar usuario/empresa', 
    description: 'Prueba de restauración de usuario o empresa.', 
    test_file: 'test_restore_user_company.py',
    prompts: 'Endpoint: PUT /api/users/:id/restore o PUT /api/companies/:id/restore\nDatos requeridos: id\nConfiguración: requiere autenticación Bearer token',
    status: 'active'
  },
  { 
    name: 'Crear Copropiedad', 
    description: 'Prueba de creación de copropiedad.', 
    test_file: 'test_create_property.py',
    prompts: 'Endpoint: POST /api/properties\nDatos requeridos: name, address, units\nConfiguración: requiere autenticación Bearer token',
    status: 'active'
  },
  { 
    name: 'Editar Copropiedad', 
    description: 'Prueba de edición de copropiedad.', 
    test_file: 'test_edit_property.py',
    prompts: 'Endpoint: PUT /api/properties/:id\nDatos requeridos: id, name, address, units\nConfiguración: requiere autenticación Bearer token',
    status: 'active'
  },
  { 
    name: 'Desactivar Copropiedad', 
    description: 'Prueba de desactivación de copropiedad.', 
    test_file: 'test_deactivate_property.py',
    prompts: 'Endpoint: PUT /api/properties/:id/deactivate\nDatos requeridos: id\nConfiguración: requiere autenticación Bearer token',
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