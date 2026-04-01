import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '.env.automation') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 9000;

app.use(cors());
app.use(bodyParser.json());

app.get('/api/tests/files', (req, res) => {
  const testsDir = path.join(__dirname, 'automation', 'tests');
  
  if (!fs.existsSync(testsDir)) {
    return res.status(404).json({ error: 'La carpeta de tests no existe' });
  }

  try {
    const files = fs.readdirSync(testsDir)
      .filter(file => file.endsWith('.spec.ts'))
      .map(file => ({ id: file, name: file }));
    
    res.json(files);
  } catch (error) {
    console.error('Error al listar archivos de test:', error);
    res.status(500).json({ error: 'Error al listar archivos de test' });
  }
});

app.post('/api/tests/execute', (req, res) => {
  const { test_file, executionType } = req.body;

  if (!test_file) {
    return res.status(400).json({ error: 'Falta el nombre del archivo de test' });
  }

  const testPath = path.join(__dirname, 'automation', 'tests', test_file);

  if (!fs.existsSync(testPath)) {
    return res.status(404).json({ error: `El archivo de test no existe: ${test_file}` });
  }

  console.log(`Ejecutando test: ${test_file}`);

  const command = `npx playwright test ${test_file} --project=chromium -c playwright.config.ts`;

  res.json({ status: 'started', message: `Ejecución de ${test_file} iniciada` });

  const startTime = Date.now();
  const childProcess = exec(command);

  childProcess.stdout.on('data', (data) => {
    console.log(data);
    io.emit('test-log', { type: 'stdout', data: data.toString() });
  });

  childProcess.stderr.on('data', (data) => {
    console.error(data);
    io.emit('test-log', { type: 'stderr', data: data.toString() });
  });

  childProcess.on('close', (code) => {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const status = code === 0 ? 'passed' : 'failed';
    console.log(`Test finalizado: ${test_file} con código ${code} (${duration}s)`);
    io.emit('test-finished', { test_file, status, duration, code });
  });
});

server.listen(PORT, () => {
  console.log(`Servidor de ejecución local con WebSockets corriendo en http://localhost:${PORT}`);
  console.log(`Ruta de tests: ${path.join(__dirname, 'automation', 'tests')}`);
});
