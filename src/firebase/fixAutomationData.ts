const apiJson = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, {
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

// Función para formatear el nombre del archivo a un nombre legible
const formatTestName = (fileName: string) => {
  return fileName
    .replace('.spec.ts', '')
    .split(/[_-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const cleanAndSeedAutomation = async (realFiles: string[]) => {
  console.log('--- Iniciando sincronización total con archivos locales ---');
  
  try {
    // 1. Obtener y eliminar todos los documentos actuales
    const existing = await apiJson<{ data: Array<{ id: string }> }>('/api/data/automation');
    if (existing.data.length > 0) {
      await apiJson('/api/data/automation/deleteMany', {
        method: 'POST',
        body: JSON.stringify({ ids: existing.data.map((doc) => doc.id) }),
      });
    }
    console.log('Base de datos limpiada.');

    // 2. Insertar UN registro por cada archivo REAL encontrado en la carpeta
    console.log(`Insertando ${realFiles.length} casos encontrados...`);
    for (const file of realFiles) {
      const automationCase = {
        name: formatTestName(file),
        description: `Prueba automatizada para ${formatTestName(file)}.`,
        test_file: file,
        prompts: 'Configuración: Playwright',
        status: 'active',
        last_status: 'none',
      };
      await apiJson('/api/data/automation', {
        method: 'POST',
        body: JSON.stringify(automationCase),
      });
      console.log(`Sincronizado: ${file}`);
    }
    
    console.log('--- Sincronización finalizada ---');
    return true;
  } catch (error) {
    console.error('Error durante la sincronización:', error);
    return false;
  }
};
