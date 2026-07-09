import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { db, FieldValue } from './firebaseAdmin.js';
import { requireSession } from './auth.js';

const isSpecFile = (file) => /^[A-Za-z0-9_.-]+\.spec\.ts$/.test(file);

export const registerAutomationRoutes = (app, io, rootDir) => {
  app.get('/api/tests/files', requireSession, (_req, res) => {
    const testsDir = path.join(rootDir, 'automation', 'tests');

    if (!fs.existsSync(testsDir)) {
      return res.status(404).json({ error: 'La carpeta de tests no existe' });
    }

    try {
      const files = fs
        .readdirSync(testsDir)
        .filter((file) => file.endsWith('.spec.ts'))
        .map((file) => ({ id: file, name: file }));

      return res.json(files);
    } catch (error) {
      console.error('Error al listar archivos de test:', error);
      return res.status(500).json({ error: 'Error al listar archivos de test' });
    }
  });

  app.post('/api/tests/execute', requireSession, (req, res) => {
    const { test_file, planId, planName, caseId } = req.body;

    if (!test_file || !isSpecFile(test_file)) {
      return res.status(400).json({ error: 'Falta un archivo de test válido' });
    }

    const testPath = path.join(rootDir, 'automation', 'tests', test_file);

    if (!fs.existsSync(testPath)) {
      return res.status(404).json({ error: `El archivo de test no existe: ${test_file}` });
    }

    console.log(`Ejecutando test: ${test_file} (Plan: ${planName || 'Ninguno'})`);

    exec('npx playwright install --with-deps chromium --dry-run', { cwd: rootDir }, (err) => {
      if (err) {
        console.error('Chromium no está instalado o faltan dependencias');
        return res.status(400).json({
          status: 'error',
          error_type: 'browser_missing',
          message: 'Chromium no está instalado. Por favor, ejecuta: npx playwright install chromium',
          suggestion: 'npx playwright install chromium',
        });
      }

      res.json({ status: 'started', message: `Ejecución de ${test_file} iniciada` });

      const startTime = Date.now();
      const command = `npx playwright test automation/tests/${test_file} --project=chromium -c playwright.config.ts`;
      const childProcess = exec(command, { cwd: rootDir });

      childProcess.stdout?.on('data', (data) => {
        io.emit('test-log', { type: 'stdout', data: data.toString() });
      });

      childProcess.stderr?.on('data', (data) => {
        io.emit('test-log', { type: 'stderr', data: data.toString() });
      });

      childProcess.on('close', async (code) => {
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
          caseId: caseId || null,
        });

        let screenshotUrl = null;

        if (status === 'failed') {
          const testName = test_file.replace('.spec.ts', '');
          const screenshotPath = path.join(rootDir, 'test-results', `${testName}-chromium`, 'test-failed-1.png');

          try {
            if (fs.existsSync(screenshotPath)) {
              const screenshotBuffer = fs.readFileSync(screenshotPath);
              screenshotUrl = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
            }
          } catch (error) {
            console.error('Error al leer screenshot:', error);
          }
        }

        try {
          await db.collection('test_results').add({
            name: testNameClean,
            test_file,
            status,
            duration,
            date: new Date().toISOString(),
            executionType: 'automated',
            planId: planId || '-',
            planName: planName || (planId ? 'Cargando...' : 'Sin plan de pruebas'),
            createdAt: FieldValue.serverTimestamp(),
            screenshotUrl,
            error: status === 'failed' ? 'Fallo en la ejecución de Playwright. Revisa los logs.' : null,
            createdBy: req.user?.id || null,
          });
          console.log(`Resultado guardado en test_results para el plan: ${planName || 'Ninguno'}`);
        } catch (error) {
          console.error('Error al guardar en test_results:', error);
        }

        try {
          const snapshot = await db.collection('automation').where('test_file', '==', test_file).get();
          await Promise.all(
            snapshot.docs.map((docSnap) =>
              db.collection('automation').doc(docSnap.id).update({
                last_status: status,
                last_duration: duration,
                updatedAt: FieldValue.serverTimestamp(),
              })
            )
          );
          console.log('Caso de automatización actualizado');
        } catch (error) {
          console.error('Error al actualizar caso en automation:', error);
        }
      });
    });
  });
};
