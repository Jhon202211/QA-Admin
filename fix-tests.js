import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testsDir = path.join(__dirname, 'automation', 'tests');

const fixFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Añadir import de url si no existe
  if (!content.includes("from 'url'")) {
    content = "import { fileURLToPath } from 'url';\n" + content;
    changed = true;
  }

  // 2. Añadir definiciones de __filename y __dirname si no existen
  if (!content.includes('const __filename = fileURLToPath')) {
    const definitions = `
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
`;
    // Insertar después de los imports (aproximadamente)
    const lines = content.split('\n');
    let lastImportIndex = -1;
    lines.forEach((line, index) => {
      if (line.trim().startsWith('import ')) {
        lastImportIndex = index;
      }
    });
    
    lines.splice(lastImportIndex + 1, 0, definitions);
    content = lines.join('\n');
    changed = true;
  }

  // 3. Corregir la ruta de dotenv.config
  const dotenvRegex = /dotenv\.config\s*\(\s*{\s*path\s*:\s*path\.resolve\s*\(\s*__dirname\s*,\s*['"][^'"]+['"]\s*\)\s*}\s*\)/g;
  if (dotenvRegex.test(content)) {
    content = content.replace(dotenvRegex, "dotenv.config({ path: path.resolve(__dirname, '../../.env.automation') })");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fijado: ${path.basename(filePath)}`);
  }
};

const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.ts'));
console.log(`Escaneando ${files.length} archivos...`);

files.forEach(file => {
  fixFile(path.join(testsDir, file));
});

console.log('--- Proceso completado ---');
