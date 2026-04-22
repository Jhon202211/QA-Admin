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
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config(); // Carga .env para Firebase
dotenv.config({ path: path.resolve(__dirname, '.env.automation'), override: true }); // Carga variables de automatización

// Inicializar Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

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

// Endpoint para listar archivos de test
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
  const { test_file, planId, planName, caseId } = req.body;

  if (!test_file) {
    return res.status(400).json({ error: 'Falta el nombre del archivo de test' });
  }

  const testPath = path.join(__dirname, 'automation', 'tests', test_file);

  if (!fs.existsSync(testPath)) {
    return res.status(404).json({ error: `El archivo de test no existe: ${test_file}` });
  }

  console.log(`Ejecutando test: ${test_file} (Plan: ${planName || 'Ninguno'})`);

  // Comando para ejecutar Playwright
  const command = `npx playwright test automation/tests/${test_file} --project=chromium -c playwright.config.ts`;

  // Validar si Chromium está instalado antes de ejecutar
  exec('npx playwright install --with-deps chromium --dry-run', (err) => {
    if (err) {
      console.error('Chromium no está instalado o faltan dependencias');
      return res.status(400).json({ 
        status: 'error', 
        error_type: 'browser_missing',
        message: 'Chromium no está instalado. Por favor, ejecuta: npx playwright install chromium',
        suggestion: 'npx playwright install chromium'
      });
    }

    res.json({ status: 'started', message: `Ejecución de ${test_file} iniciada` });

    const startTime = Date.now();
    const process = exec(command);

    process.stdout.on('data', (data) => {
      io.emit('test-log', { type: 'stdout', data: data.toString() });
    });

    process.stderr.on('data', (data) => {
      io.emit('test-log', { type: 'stderr', data: data.toString() });
    });

    process.on('close', async (code) => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const status = code === 0 ? 'passed' : 'failed';
      const testNameClean = test_file.replace('.spec.ts', '').replace(/_/g, ' ');
      
      console.log(`Test ${test_file} finalizado con estado: ${status} en ${duration}s`);
      
      io.emit('test-finished', { 
        status, 
        duration, 
        test_file,
        name: testNameClean,
        planId: planId || null,
        caseId: caseId || null
      });

      // 1. Buscar screenshot si falló
      let screenshotUrl = null;
      
      if (status === 'failed') {
        const testName = test_file.replace('.spec.ts', '');
        const screenshotsDir = path.join(__dirname, 'test-results', `${testName}-chromium`, 'test-failed-1.png');
        try {
          if (fs.existsSync(screenshotsDir)) {
            const screenshotBuffer = fs.readFileSync(screenshotsDir);
            screenshotUrl = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
          }
        } catch (e) {
          console.error('Error al leer screenshot:', e);
        }
      }

      // 2. Guardar resultado en la colección 'test_results'
      try {
        const resultData = {
          name: testNameClean,
          test_file: test_file,
          status: status,
          duration: duration,
          date: new Date().toISOString(),
          executionType: 'automated',
          planId: planId || '-',
          planName: planName || (planId ? 'Cargando...' : 'Sin plan de pruebas'),
          createdAt: Timestamp.now(),
          screenshotUrl: screenshotUrl,
          error: status === 'failed' ? 'Fallo en la ejecución de Playwright. Revisa los logs.' : null
        };
        
        await addDoc(collection(db, 'test_results'), resultData);
        console.log(`Resultado guardado en test_results para el plan: ${planName || 'Ninguno'}`);
      } catch (e) {
        console.error('Error al guardar en test_results:', e);
      }

      // 2. Actualizar el caso en la colección 'automation'
      try {
        const q = query(collection(db, 'automation'), where('test_file', '==', test_file));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(async (docSnap) => {
          await updateDoc(doc(db, 'automation', docSnap.id), {
            last_status: status,
            last_duration: duration,
            updatedAt: Timestamp.now()
          });
        });
        console.log('Caso de automatización actualizado');
      } catch (e) {
        console.error('Error al actualizar caso en automation:', e);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Servidor de ejecución local con WebSockets corriendo en http://localhost:${PORT}`);
});
