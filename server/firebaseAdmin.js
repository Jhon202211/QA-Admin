import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const initFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

  if (rawJson) {
    try {
      const serviceAccount = JSON.parse(rawJson);
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      });
    } catch (e) {
      console.error('Error fatal parseando FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
    }
  }

  // Fallback a ADC si no hay JSON
  return initializeApp({
    projectId: projectId,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  });
};

export const firebaseAdminApp = initFirebaseAdmin();
export const db = getFirestore(firebaseAdminApp);
export { FieldValue, Timestamp };
