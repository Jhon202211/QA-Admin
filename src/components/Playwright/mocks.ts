export const mockScripts = [
  {
    id: '1',
    name: 'Login básico',
    steps: [
      { action: 'goto', target: 'https://miapp.com/login' },
      { action: 'fill', target: 'input#usuario', value: 'admin' },
      { action: 'fill', target: 'input#password', value: '1234' },
      { action: 'click', target: 'button#login' }
    ],
    createdAt: '2024-06-10T10:00:00Z'
  },
  {
    id: '2',
    name: 'Crear usuario',
    steps: [
      { action: 'goto', target: 'https://miapp.com/users' },
      { action: 'click', target: 'button#add-user' },
      { action: 'fill', target: 'input#name', value: 'Juan' },
      { action: 'click', target: 'button#save' }
    ],
    createdAt: '2024-06-11T12:00:00Z'
  }
];

export const mockResults = {
  '1': { status: 'success', logs: 'Test ejecutado correctamente.' },
  '2': { status: 'failed', logs: 'Error al guardar el usuario.' }
}; 