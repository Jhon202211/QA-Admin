import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

const parseServiceAccount = () => {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (rawBase64) {
    return JSON.parse(Buffer.from(rawBase64, 'base64').toString('utf8'));
  }

  if (rawJson) {
    return JSON.parse(rawJson);
  }

  return null;
};

const initFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = parseServiceAccount();
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  });
};

export const firebaseAdminApp = initFirebaseAdmin();
export const db = getFirestore(firebaseAdminApp);
export { FieldValue, Timestamp };
