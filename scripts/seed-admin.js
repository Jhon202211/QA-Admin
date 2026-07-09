import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from '../server/auth.js';
import { db, FieldValue } from '../server/firebaseAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');
const name = String(process.env.ADMIN_NAME || 'Administrador');
const role = String(process.env.ADMIN_ROLE || 'admin');

if (!email || !password) {
  console.error('Debes definir ADMIN_EMAIL y ADMIN_PASSWORD para crear el usuario admin.');
  process.exit(1);
}

if (password.length < 8) {
  console.error('ADMIN_PASSWORD debe tener al menos 8 caracteres.');
  process.exit(1);
}

const userRef = db.collection('users').doc(email);
const existingUser = await userRef.get();

if (existingUser.exists) {
  await userRef.set(
    {
      email,
      name,
      role,
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`Usuario admin existente actualizado: ${email}`);
  process.exit(0);
}

const passwordHash = await hashPassword(password);
await userRef.set({
  email,
  name,
  role,
  active: true,
  passwordHash,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
});

console.log(`Usuario admin creado: ${email}`);
