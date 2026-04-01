import { collection, getDocs, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';

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
  const collectionRef = collection(db, 'automation');
  
  try {
    // 1. Obtener y eliminar todos los documentos actuales
    const snapshot = await getDocs(collectionRef);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
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
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await addDoc(collectionRef, automationCase);
      console.log(`Sincronizado: ${file}`);
    }
    
    console.log('--- Sincronización finalizada ---');
    return true;
  } catch (error) {
    console.error('Error durante la sincronización:', error);
    return false;
  }
};
