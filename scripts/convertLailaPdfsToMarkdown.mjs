#!/usr/bin/env node
/**
 * Convierte los PDFs originales de knowledge-sources/Laila/ a Markdown (.md)
 * usando @opendocsg/pdf2md, y escribe el resultado en public/knowledge/Laila/
 * (carpeta servida como asset estático y consumida por
 * src/services/lailaKnowledgeService.ts).
 *
 * Los PDFs fuente NO se sirven al navegador (no viven bajo public/) para no
 * inflar el bundle: solo los .md resultantes forman parte del build.
 *
 * Uso: node scripts/convertLailaPdfsToMarkdown.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdf2md from '@opendocsg/pdf2md';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.resolve(__dirname, '../knowledge-sources/Laila');
const OUTPUT_DIR = path.resolve(__dirname, '../public/knowledge/Laila');

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`No existe la carpeta de PDFs fuente: ${SOURCE_DIR}`);
    process.exit(1);
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));

  if (files.length === 0) {
    console.log('No se encontraron archivos PDF en', SOURCE_DIR);
    return;
  }

  const generated = [];

  for (const filename of files) {
    const pdfPath = path.join(SOURCE_DIR, filename);
    const mdFilename = filename.replace(/\.pdf$/i, '.md');
    const mdPath = path.join(OUTPUT_DIR, mdFilename);

    console.log(`Convirtiendo: ${filename} → ${mdFilename}`);
    try {
      const buffer = fs.readFileSync(pdfPath);
      const markdown = await pdf2md(buffer);
      fs.writeFileSync(mdPath, markdown, 'utf-8');
      generated.push(mdFilename);
      console.log(`  ✓ ${mdFilename} (${(markdown.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`  ✗ Error al convertir ${filename}:`, err.message);
    }
  }

  console.log(`\nListo. ${generated.length}/${files.length} archivos convertidos en ${OUTPUT_DIR}.`);
  console.log('Recuerda actualizar public/knowledge/Laila/manifest.json con los nuevos .md si aplica.');
  console.log('Archivos .md generados:', generated);
}

main();
