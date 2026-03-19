import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { storage } from '../firebase/config';
import type { EvidenceFile } from '../types/testCase';

export const MAX_EVIDENCE_SIZE = 200 * 1024 * 1024; // 200 MB
export const ALLOWED_EVIDENCE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4'];
export const ALLOWED_EVIDENCE_EXTENSIONS = '.jpg,.jpeg,.png,.mp4';

// ── Configuración AWS S3 ─────────────────────────────────────────────────────

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
}

export const getS3Config = (): S3Config | null => {
  try {
    const raw = localStorage.getItem('qaScopeConfig');
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (
      cfg.awsS3Enabled &&
      cfg.awsAccessKeyId &&
      cfg.awsSecretAccessKey &&
      cfg.awsS3Bucket
    ) {
      return {
        accessKeyId: cfg.awsAccessKeyId,
        secretAccessKey: cfg.awsSecretAccessKey,
        region: cfg.awsRegion || 'us-east-1',
        bucket: cfg.awsS3Bucket,
      };
    }
  } catch {
    // config no disponible
  }
  return null;
};

// ── Validación ───────────────────────────────────────────────────────────────

export const validateEvidence = (file: File): string | null => {
  if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
    return 'Formato no permitido. Solo se aceptan JPG, JPEG, PNG y MP4.';
  }
  if (file.size > MAX_EVIDENCE_SIZE) {
    return `El archivo "${file.name}" supera el límite de 200 MB.`;
  }
  return null;
};

// ── Upload ───────────────────────────────────────────────────────────────────

const uploadToS3 = async (
  file: File,
  s3: S3Config,
  key: string,
  onProgress: (percent: number) => void
): Promise<string> => {
  const client = new S3Client({
    region: s3.region,
    credentials: {
      accessKeyId: s3.accessKeyId,
      secretAccessKey: s3.secretAccessKey,
    },
  });

  const arrayBuffer = await file.arrayBuffer();

  // S3 SDK v3 no expone progreso nativo en PutObjectCommand para binarios pequeños;
  // simulamos progreso en la lectura del buffer antes del envío.
  onProgress(10);

  await client.send(
    new PutObjectCommand({
      Bucket: s3.bucket,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type,
    })
  );

  onProgress(100);

  return `https://${s3.bucket}.s3.${s3.region}.amazonaws.com/${key}`;
};

const uploadToFirebase = (
  file: File,
  path: string,
  onProgress: (percent: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
};

export const uploadEvidence = async (
  file: File,
  testCaseId: string,
  stepId: string,
  onProgress: (percent: number) => void
): Promise<EvidenceFile> => {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const relativePath = `evidence/${testCaseId}/${stepId}/${timestamp}_${safeName}`;

  const s3Config = getS3Config();

  if (s3Config) {
    const url = await uploadToS3(file, s3Config, relativePath, onProgress);
    return { url, path: relativePath, name: file.name, mimeType: file.type };
  }

  const url = await uploadToFirebase(file, relativePath, onProgress);
  return { url, path: relativePath, name: file.name, mimeType: file.type };
};

// ── Delete ───────────────────────────────────────────────────────────────────

export const deleteEvidence = async (evidence: EvidenceFile): Promise<void> => {
  const s3Config = getS3Config();

  if (s3Config) {
    const client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });
    await client.send(
      new DeleteObjectCommand({ Bucket: s3Config.bucket, Key: evidence.path })
    );
    return;
  }

  const storageRef = ref(storage, evidence.path);
  await deleteObject(storageRef);
};
