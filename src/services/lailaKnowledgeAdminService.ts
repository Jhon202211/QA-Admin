import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../firebase/config';
import { getPresignedUrl, getS3Config } from './evidenceService';
import { loadKnowledgeFromUrl } from './knowledgeFileLoader';

export const LAILA_KNOWLEDGE_COLLECTION = 'laila_knowledge_docs';
const S3_PREFIX = 'knowledge';

export type KnowledgeCategory = 'plataforma' | 'historial_reglas';
export type KnowledgeSource = 's3' | 'firestore';

export const KNOWLEDGE_CATEGORY_META: Record<
  KnowledgeCategory,
  { id: KnowledgeCategory; label: string; description: string; expectedCount: number }
> = {
  plataforma: {
    id: 'plataforma',
    label: 'Conocimiento de plataforma',
    description: 'Manuales, FAQs y diccionarios de la aplicación.',
    expectedCount: 8,
  },
  historial_reglas: {
    id: 'historial_reglas',
    label: 'Historial y reglas',
    description: 'Bugs históricos, features/mejoras y reglas de negocio.',
    expectedCount: 3,
  },
};

const HISTORIAL_FILE_HINTS = new Set([
  'bugs_historicos.md',
  'features_mejoras.md',
  'reglas_negocio.md',
]);

export const ALLOWED_KNOWLEDGE_EXTENSIONS = ['.md', '.txt', '.pdf'];
export const MAX_KNOWLEDGE_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_INLINE_CONTENT_SIZE = 750 * 1024;

export interface LailaKnowledgeDoc {
  id: string;
  name: string;
  storagePath: string;
  url: string;
  mimeType: string;
  size: number;
  enabled: boolean;
  source: KnowledgeSource;
  category: KnowledgeCategory;
  inlineContent?: string;
  updatedAt: Date | null;
}

export interface LailaInstructions {
  content: string;
  updatedAt: Date | null;
  source: 'firestore' | 'fallback';
}

const getExtension = (filename: string) => {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
};

const docIdFromName = (name: string) => name.toLowerCase().replace(/[^a-z0-9._-]+/g, '_');

export const inferKnowledgeCategory = (name: string): KnowledgeCategory =>
  HISTORIAL_FILE_HINTS.has(name) ? 'historial_reglas' : 'plataforma';

export const validateKnowledgeFile = (file: File): string | null => {
  const ext = getExtension(file.name);
  if (!ALLOWED_KNOWLEDGE_EXTENSIONS.includes(ext)) {
    return 'Formato no permitido. Solo se aceptan MD, TXT y PDF.';
  }
  if (file.size > MAX_KNOWLEDGE_FILE_SIZE) {
    return `El archivo "${file.name}" supera el límite de 25 MB.`;
  }
  return null;
};

const createS3Client = () => {
  const s3 = getS3Config();
  if (!s3) {
    throw new Error(
      'AWS S3 no está configurado. Ve a Configuración → Integraciones → AWS S3.'
    );
  }
  return {
    s3,
    client: new S3Client({
      region: s3.region,
      credentials: {
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKey,
      },
    }),
  };
};

const mapDoc = (id: string, data: Record<string, unknown>): LailaKnowledgeDoc => {
  const name = String(data.name || '');
  const rawCategory = data.category;
  const category: KnowledgeCategory =
    rawCategory === 'plataforma' || rawCategory === 'historial_reglas'
      ? rawCategory
      : inferKnowledgeCategory(name);

  // Legacy "static" (assets en public/) se trata como firestore si hay inlineContent.
  const rawSource = data.source;
  const hasInline = typeof data.inlineContent === 'string' && data.inlineContent.length > 0;
  const source: KnowledgeSource =
    rawSource === 's3' || (Boolean(data.storagePath) && !hasInline)
      ? 's3'
      : 'firestore';

  return {
    id,
    name,
    storagePath: String(data.storagePath || ''),
    url: String(data.url || ''),
    mimeType: String(data.mimeType || 'text/plain'),
    size: Number(data.size) || 0,
    enabled: data.enabled !== false,
    source,
    category,
    inlineContent: hasInline ? String(data.inlineContent) : undefined,
    updatedAt:
      data.updatedAt && typeof (data.updatedAt as { toDate?: () => Date }).toDate === 'function'
        ? (data.updatedAt as { toDate: () => Date }).toDate()
        : null,
  };
};

export const listKnowledgeDocs = async (): Promise<LailaKnowledgeDoc[]> => {
  const q = query(collection(db, LAILA_KNOWLEDGE_COLLECTION), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
};

export const uploadKnowledgeDoc = async (
  file: File,
  category: KnowledgeCategory,
  onProgress?: (percent: number) => void
): Promise<LailaKnowledgeDoc> => {
  const validationError = validateKnowledgeFile(file);
  if (validationError) throw new Error(validationError);

  const { s3, client } = createS3Client();
  const safeName = file.name.replace(/[/\\]/g, '_').trim();
  const storagePath = `${S3_PREFIX}/${category}/${safeName}`;
  onProgress?.(10);

  const body = new Uint8Array(await file.arrayBuffer());
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: storagePath,
        Body: body,
        ContentType: file.type || 'application/octet-stream',
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Failed to fetch') || message.includes('CORS')) {
      throw new Error(
        'Error CORS: el bucket S3 no permite peticiones desde el navegador. Revisa la política CORS en Configuración → AWS S3.'
      );
    }
    throw err;
  }
  onProgress?.(90);

  const url = `https://${s3.bucket}.s3.${s3.region}.amazonaws.com/${storagePath}`;
  const id = docIdFromName(safeName);
  await setDoc(doc(db, LAILA_KNOWLEDGE_COLLECTION, id), {
    name: safeName,
    storagePath,
    url,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    enabled: true,
    source: 's3',
    category,
    inlineContent: null,
    updatedAt: serverTimestamp(),
  });
  onProgress?.(100);

  return {
    id,
    name: safeName,
    storagePath,
    url,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    enabled: true,
    source: 's3',
    category,
    updatedAt: new Date(),
  };
};

export const replaceKnowledgeDoc = async (
  docMeta: LailaKnowledgeDoc,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> => {
  const validationError = validateKnowledgeFile(file);
  if (validationError) throw new Error(validationError);

  const { s3, client } = createS3Client();
  const safeName = file.name.replace(/[/\\]/g, '_').trim();
  const storagePath = `${S3_PREFIX}/${docMeta.category}/${safeName}`;
  onProgress?.(10);

  await client.send(
    new PutObjectCommand({
      Bucket: s3.bucket,
      Key: storagePath,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: file.type || 'application/octet-stream',
    })
  );
  onProgress?.(85);

  await setDoc(
    doc(db, LAILA_KNOWLEDGE_COLLECTION, docMeta.id),
    {
      name: safeName,
      storagePath,
      url: `https://${s3.bucket}.s3.${s3.region}.amazonaws.com/${storagePath}`,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      enabled: docMeta.enabled,
      source: 's3',
      category: docMeta.category,
      inlineContent: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (docMeta.source === 's3' && docMeta.storagePath && docMeta.storagePath !== storagePath) {
    await client.send(
      new DeleteObjectCommand({ Bucket: s3.bucket, Key: docMeta.storagePath })
    );
  }
  onProgress?.(100);
};

export const saveKnowledgeDocText = async (
  docMeta: LailaKnowledgeDoc,
  content: string
): Promise<void> => {
  if (docMeta.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Los archivos PDF deben actualizarse reemplazando el archivo.');
  }

  const encoded = new TextEncoder().encode(content);

  if (docMeta.source === 's3' && docMeta.storagePath && getS3Config()) {
    const { s3, client } = createS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: docMeta.storagePath,
        Body: encoded,
        ContentType: docMeta.mimeType || 'text/markdown; charset=utf-8',
      })
    );
    await updateDoc(doc(db, LAILA_KNOWLEDGE_COLLECTION, docMeta.id), {
      size: encoded.byteLength,
      inlineContent: null,
      source: 's3',
      updatedAt: serverTimestamp(),
    });
    return;
  }

  if (encoded.byteLength > MAX_INLINE_CONTENT_SIZE) {
    throw new Error(
      'El contenido supera 750 KB. Configura S3 y sube/reemplaza el archivo.'
    );
  }

  await setDoc(
    doc(db, LAILA_KNOWLEDGE_COLLECTION, docMeta.id),
    {
      name: docMeta.name,
      storagePath: '',
      url: '',
      mimeType: docMeta.mimeType || 'text/markdown',
      size: encoded.byteLength,
      enabled: docMeta.enabled,
      source: 'firestore',
      category: docMeta.category,
      inlineContent: content,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const setKnowledgeDocEnabled = async (id: string, enabled: boolean): Promise<void> => {
  await updateDoc(doc(db, LAILA_KNOWLEDGE_COLLECTION, id), {
    enabled,
    updatedAt: serverTimestamp(),
  });
};

export const deleteKnowledgeDoc = async (docMeta: LailaKnowledgeDoc): Promise<void> => {
  if (docMeta.source === 's3' && docMeta.storagePath) {
    const s3 = getS3Config();
    if (s3) {
      const client = new S3Client({
        region: s3.region,
        credentials: {
          accessKeyId: s3.accessKeyId,
          secretAccessKey: s3.secretAccessKey,
        },
      });
      await client.send(
        new DeleteObjectCommand({ Bucket: s3.bucket, Key: docMeta.storagePath })
      );
    }
  }
  await deleteDoc(doc(db, LAILA_KNOWLEDGE_COLLECTION, docMeta.id));
};

/** Obtiene URL de lectura (presignada si es S3). */
export const resolveKnowledgeReadUrl = async (docMeta: LailaKnowledgeDoc): Promise<string> => {
  if (docMeta.source === 's3' && docMeta.storagePath && getS3Config()) {
    return getPresignedUrl(docMeta.storagePath);
  }
  if (docMeta.url && !docMeta.url.startsWith('/knowledge')) {
    return docMeta.url;
  }
  throw new Error(
    `El documento "${docMeta.name}" no tiene archivo en S3 ni contenido guardado. Súbelo o edítalo y guárdalo.`
  );
};

/** Carga el texto de un documento del catálogo. */
export const fetchKnowledgeDocText = async (docMeta: LailaKnowledgeDoc): Promise<string> => {
  if (typeof docMeta.inlineContent === 'string' && docMeta.inlineContent.length > 0) {
    return docMeta.inlineContent;
  }
  const url = await resolveKnowledgeReadUrl(docMeta);
  return loadKnowledgeFromUrl(url, docMeta.name);
};

export const getAgentInstructions = async (): Promise<LailaInstructions> => {
  const snap = await getDoc(doc(db, 'laila_agent_config', 'instructions'));
  if (snap.exists()) {
    const data = snap.data();
    const content = typeof data.content === 'string' ? data.content : '';
    if (content.trim()) {
      return {
        content,
        updatedAt: data.updatedAt?.toDate?.() ?? null,
        source: 'firestore',
      };
    }
  }

  return {
    content: '',
    updatedAt: null,
    source: 'fallback',
  };
};

export const saveAgentInstructions = async (content: string): Promise<void> => {
  await setDoc(
    doc(db, 'laila_agent_config', 'instructions'),
    {
      content,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};
