import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { registerAuthRoutes } from './auth.js';
import { registerAutomationRoutes } from './automationRoutes.js';
import { registerDataRoutes } from './dataRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.automation'), override: true });

const app = express();
const server = http.createServer(app);
const port = Number(process.env.AUTH_SERVER_PORT || process.env.PORT || 9000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin === frontendOrigin) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: frontendOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '15mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

registerAuthRoutes(app);
registerDataRoutes(app);
registerAutomationRoutes(app, io, rootDir);

app.use((err, _req, res, _next) => {
  console.error('Error inesperado del servidor:', err);
  res.status(500).json({ message: 'Error inesperado del servidor' });
});

server.listen(port, () => {
  console.log(`Servidor de QAScope corriendo en http://localhost:${port}`);
});
