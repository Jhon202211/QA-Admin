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
export const LAILA_AGENT_CONFIG_DOC = 'laila_agent_config/instructions';
const S3_PREFIX = 'knowledge/laila';
const STATIC_DIR = '/knowledge/Laila';

export const ALLOWED_KNOWLEDGE_EXTENSIONS = ['.md', '.txt', '.pdf'];
export const MAX_KNOWLEDGE_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_INLINE_CONTENT_SIZE = 750 * 1024; // margen bajo el límite de 1 MiB de Firestore

export interface LailaKnowledgeDoc {
  id: string;
  name: string;
  storagePath: string;
  url: string;
  mimeType: string;
  size: number;
  enabled: boolean;
  source: 's3' | 'static';
  inlineContent?: string;
  updatedAt: Date | null;
}

export interface LailaInstructions {
  content: string;
  updatedAt: Date | null;
  source: 'firestore' | 'static';
}

const getExtension = (filename: string) => {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
};

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

/** Lista documentos registrados en Firestore (catálogo editable). */
export const listKnowledgeDocs = async (): Promise<LailaKnowledgeDoc[]> => {
  const q = query(collection(db, LAILA_KNOWLEDGE_COLLECTION), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name as string,
      storagePath: (data.storagePath as string) || '',
      url: (data.url as string) || '',
      mimeType: (data.mimeType as string) || 'text/plain',
      size: Number(data.size) || 0,
      enabled: data.enabled !== false,
      source: (data.source as 's3' | 'static') || 's3',
      inlineContent:
        typeof data.inlineContent === 'string' ? data.inlineContent : undefined,
      updatedAt: data.updatedAt?.toDate?.() ?? null,
    };
  });
};

/** Sube un archivo a S3 y registra metadatos en Firestore. */
export const uploadKnowledgeDoc = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<LailaKnowledgeDoc> => {
  const validationError = validateKnowledgeFile(file);
  if (validationError) throw new Error(validationError);

  const { s3, client } = createS3Client();
  const safeName = file.name.replace(/[/\\]/g, '_').trim();
  const storagePath = `${S3_PREFIX}/${safeName}`;
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
  const id = safeName.toLowerCase().replace(/[^a-z0-9._-]+/g, '_');
  const ref = doc(db, LAILA_KNOWLEDGE_COLLECTION, id);
  await setDoc(ref, {
    name: safeName,
    storagePath,
    url,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    enabled: true,
    source: 's3',
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
    updatedAt: new Date(),
  };
};

/** Reemplaza un documento conservando su registro y estado en el catálogo. */
export const replaceKnowledgeDoc = async (
  docMeta: LailaKnowledgeDoc,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> => {
  const validationError = validateKnowledgeFile(file);
  if (validationError) throw new Error(validationError);

  const { s3, client } = createS3Client();
  const safeName = file.name.replace(/[/\\]/g, '_').trim();
  const storagePath = `${S3_PREFIX}/${safeName}`;
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
      inlineContent: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (
    docMeta.source === 's3' &&
    docMeta.storagePath &&
    docMeta.storagePath !== storagePath
  ) {
    await client.send(
      new DeleteObjectCommand({ Bucket: s3.bucket, Key: docMeta.storagePath })
    );
  }
  onProgress?.(100);
};

/**
 * Guarda texto editable. En documentos S3 actualiza el objeto; para documentos
 * estáticos guarda una sobrescritura en Firestore hasta que sean migrados a S3.
 */
export const saveKnowledgeDocText = async (
  docMeta: LailaKnowledgeDoc,
  content: string
): Promise<void> => {
  if (docMeta.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Los archivos PDF deben actualizarse reemplazando el archivo.');
  }

  const encoded = new TextEncoder().encode(content);
  if (docMeta.source === 's3') {
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
      updatedAt: serverTimestamp(),
    });
    return;
  }

  if (encoded.byteLength > MAX_INLINE_CONTENT_SIZE) {
    throw new Error(
      'El contenido editado supera 750 KB. Configura S3 y reemplaza el archivo.'
    );
  }
  await updateDoc(doc(db, LAILA_KNOWLEDGE_COLLECTION, docMeta.id), {
    inlineContent: content,
    size: encoded.byteLength,
    updatedAt: serverTimestamp(),
  });
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

/**
 * Importa los archivos estáticos de public/knowledge/Laila al catálogo Firestore
 * (sin subir a S3). Útil como puente hasta migrar todo a S3.
 */
export const importStaticKnowledgeToCatalog = async (): Promise<number> => {
  const manifestRes = await fetch(`${STATIC_DIR}/manifest.json`);
  if (!manifestRes.ok) return 0;
  const files = (await manifestRes.json()) as string[];
  if (!Array.isArray(files)) return 0;

  let imported = 0;
  for (const name of files) {
    if (typeof name !== 'string' || !name.trim()) continue;
    const id = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '_');
    const existing = await getDoc(doc(db, LAILA_KNOWLEDGE_COLLECTION, id));
    if (existing.exists()) continue;

    await setDoc(doc(db, LAILA_KNOWLEDGE_COLLECTION, id), {
      name,
      storagePath: '',
      url: `${STATIC_DIR}/${encodeURIComponent(name)}`,
      mimeType: name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/markdown',
      size: 0,
      enabled: true,
      source: 'static',
      updatedAt: serverTimestamp(),
    });
    imported += 1;
  }
  return imported;
};

/** Obtiene URL de lectura (presignada si es S3). */
export const resolveKnowledgeReadUrl = async (docMeta: LailaKnowledgeDoc): Promise<string> => {
  if (docMeta.source === 's3' && docMeta.storagePath && getS3Config()) {
    return getPresignedUrl(docMeta.storagePath);
  }
  return docMeta.url || `${STATIC_DIR}/${encodeURIComponent(docMeta.name)}`;
};

/** Carga el texto de un documento del catálogo. */
export const fetchKnowledgeDocText = async (docMeta: LailaKnowledgeDoc): Promise<string> => {
  if (typeof docMeta.inlineContent === 'string') {
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

  const res = await fetch(`${STATIC_DIR}/instructions.md`);
  const content = res.ok
    ? await res.text()
    : 'Eres OpenLaila, el asistente virtual de soporte de QAScope.';
  return { content, updatedAt: null, source: 'static' };
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
