import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const CONSECUTIVE_FILE = path.resolve(__dirname, '../../fixtures/last_consecutive.txt');
const EXCEL_FILE = path.resolve(__dirname, '../../fixtures/FormatoImportarUsuariosQueoAccess (11).xlsx');

/**
 * Obtiene el último consecutivo usado
 */
function getLastConsecutive(): number {
  try {
    if (fs.existsSync(CONSECUTIVE_FILE)) {
      const content = fs.readFileSync(CONSECUTIVE_FILE, 'utf-8').trim();
      return parseInt(content, 10) || 271;
    }
  } catch (error) {
    console.log('No se encontró archivo de consecutivo, empezando desde 272');
  }
  return 271; // Último registro conocido
}

/**
 * Guarda el último consecutivo usado
 */
function saveLastConsecutive(consecutive: number): void {
  try {
    const dir = path.dirname(CONSECUTIVE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONSECUTIVE_FILE, consecutive.toString(), 'utf-8');
  } catch (error) {
    console.error('Error guardando consecutivo:', error);
  }
}

/**
 * Genera el archivo Excel con los registros especificados
 */
export function generateExcelFile(recordsCount: number = 25): string {
  const startConsecutive = getLastConsecutive() + 1;
  const endConsecutive = startConsecutive + recordsCount - 1;

  // Definir las columnas según el formato requerido
  const headers = [
    'NOMBRES',
    'APELLIDOS',
    'EMAIL',
    'CELULAR',
    'CEDULA',
    'VEHICULO: PLACA',
    'VEHICULO: TIPO (BICICLETA|MOTO|CARRO)',
    'VEHICULO: COLOR',
    'VEHICULO: MARCA',
    'VEHICULO: MODELO',
    'RFID',
    'ACCESO POR FACIAL (SI/NO)',
    'ACCESO AL GRUPO DE PUERTAS (SI/NO): RFID test - 1135',
    'ACCESO A LA PUERTA (SI/NO): RFID test - 18940',
    'MENSAJE',
    'COMENTARIO'
  ];

  // Generar los datos
  const data = [headers];
  
  for (let i = startConsecutive; i <= endConsecutive; i++) {
    const row = [
      `Usuario${i}`,
      'Set Facial',
      `usuario${i}@prueba.com`,
      `456123011${i}`,
      `12311111${i}`,
      '', // VEHICULO: PLACA
      '', // VEHICULO: TIPO
      '', // VEHICULO: COLOR
      '', // VEHICULO: MARCA
      '', // VEHICULO: MODELO
      '', // RFID
      'SI', // ACCESO POR FACIAL
      '', // ACCESO AL GRUPO DE PUERTAS
      '', // ACCESO A LA PUERTA
      '', // MENSAJE
      ''  // COMENTARIO
    ];
    data.push(row);
  }

  // Crear el workbook y worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  // Asegurar que el directorio existe
  const dir = path.dirname(EXCEL_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Eliminar el archivo si existe para evitar errores de archivo bloqueado
  if (fs.existsSync(EXCEL_FILE)) {
    try {
      fs.unlinkSync(EXCEL_FILE);
    } catch (error) {
      throw new Error(`El archivo está abierto en otro programa. Cierra Excel o cualquier programa que tenga abierto: ${EXCEL_FILE}`);
    }
  }

  // Escribir el archivo
  XLSX.writeFile(wb, EXCEL_FILE);

  // Guardar el último consecutivo usado
  saveLastConsecutive(endConsecutive);

  console.log(`✅ Archivo Excel generado: ${recordsCount} registros (${startConsecutive} - ${endConsecutive})`);
  
  return EXCEL_FILE;
}

