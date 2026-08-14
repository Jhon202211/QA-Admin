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
const S3_PREFIX = 'knowledge';
const STATIC_LAILA_DIR = '/knowledge/Laila';
const STATIC_ROOT_DIR = '/knowledge';

export type KnowledgeCategory = 'plataforma' | 'historial_reglas';

export const KNOWLEDGE_CATEGORY_META: Record<
  KnowledgeCategory,
  { id: KnowledgeCategory; label: string; description: string; expectedCount: number }
> = {
  plataforma: {
    id: 'plataforma',
    label: 'Conocimiento de plataforma',
    description: 'Manuales, FAQs y diccionarios de la aplicación (sin instructions.md).',
    expectedCount: 8,
  },
  historial_reglas: {
    id: 'historial_reglas',
    label: 'Historial y reglas',
    description: 'Bugs históricos, features/mejoras y reglas de negocio.',
    expectedCount: 3,
  },
};

/** Archivos estáticos del bloque Historial y reglas (sin criterios_acceso). */
export const HISTORIAL_STATIC_FILES = [
  'bugs_historicos.md',
  'features_mejoras.md',
  'reglas_negocio.md',
] as const;

const HISTORIAL_FILE_SET = new Set<string>(HISTORIAL_STATIC_FILES);

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
  category: KnowledgeCategory;
  inlineContent?: string;
  updatedAt: Date | null;
}

export interface LailaInstructions {
  content: string;
  updatedAt: Date | null;
  source: 'firestore' | 'static';
}

export interface ImportStaticResult {
  imported: number;
  updated: number;
  plataforma: number;
  historial: number;
}

const getExtension = (filename: string) => {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
};

const docIdFromName = (name: string) => name.toLowerCase().replace(/[^a-z0-9._-]+/g, '_');

export const inferKnowledgeCategory = (name: string): KnowledgeCategory =>
  HISTORIAL_FILE_SET.has(name) ? 'historial_reglas' : 'plataforma';

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

  return {
    id,
    name,
    storagePath: String(data.storagePath || ''),
    url: String(data.url || ''),
    mimeType: String(data.mimeType || 'text/plain'),
    size: Number(data.size) || 0,
    enabled: data.enabled !== false,
    source: data.source === 'static' ? 'static' : 's3',
    category,
    inlineContent: typeof data.inlineContent === 'string' ? data.inlineContent : undefined,
    updatedAt:
      data.updatedAt && typeof (data.updatedAt as { toDate?: () => Date }).toDate === 'function'
        ? (data.updatedAt as { toDate: () => Date }).toDate()
        : null,
  };
};

/** Lista documentos registrados en Firestore (catálogo editable). */
export const listKnowledgeDocs = async (): Promise<LailaKnowledgeDoc[]> => {
  const q = query(collection(db, LAILA_KNOWLEDGE_COLLECTION), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
};

/** Sube un archivo a S3 y registra metadatos en Firestore. */
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

/** Reemplaza un documento conservando su registro, categoría y estado. */
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

export const setKnowledgeDocCategory = async (
  id: string,
  category: KnowledgeCategory
): Promise<void> => {
  await updateDoc(doc(db, LAILA_KNOWLEDGE_COLLECTION, id), {
    category,
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

const upsertStaticDoc = async (
  name: string,
  baseUrl: string,
  category: KnowledgeCategory
): Promise<'imported' | 'updated' | 'skipped'> => {
  if (name.toLowerCase() === 'instructions.md' || name.toLowerCase() === 'criterios_acceso.md') {
    return 'skipped';
  }

  const id = docIdFromName(name);
  const ref = doc(db, LAILA_KNOWLEDGE_COLLECTION, id);
  const existing = await getDoc(ref);
  const payload = {
    name,
    storagePath: '',
    url: `${baseUrl}/${encodeURIComponent(name)}`,
    mimeType: name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/markdown',
    size: existing.exists() ? Number(existing.data()?.size) || 0 : 0,
    enabled: existing.exists() ? existing.data()?.enabled !== false : true,
    source: 'static' as const,
    category,
    updatedAt: serverTimestamp(),
  };

  if (!existing.exists()) {
    await setDoc(ref, payload);
    return 'imported';
  }

  const data = existing.data() || {};
  const needsUpdate =
    data.category !== category ||
    data.source === 's3' ||
    data.url !== payload.url ||
    data.name !== name;

  // No pisar documentos ya migrados a S3; solo corrige categoría si falta.
  if (data.source === 's3') {
    if (data.category !== category) {
      await updateDoc(ref, { category, updatedAt: serverTimestamp() });
      return 'updated';
    }
    return 'skipped';
  }

  if (needsUpdate) {
    await setDoc(ref, payload, { merge: true });
    return 'updated';
  }
  return 'skipped';
};

/**
 * Importa/sincroniza estáticos:
 * - Plataforma: manifiesto Laila (sin instructions.md)
 * - Historial y reglas: bugs, features y reglas_negocio (sin criterios_acceso)
 */
export const importStaticKnowledgeToCatalog = async (): Promise<ImportStaticResult> => {
  let imported = 0;
  let updated = 0;
  let plataforma = 0;
  let historial = 0;

  const lailaManifestRes = await fetch(`${STATIC_LAILA_DIR}/manifest.json`);
  if (lailaManifestRes.ok) {
    const files = (await lailaManifestRes.json()) as unknown;
    if (Array.isArray(files)) {
      for (const entry of files) {
        if (typeof entry !== 'string' || !entry.trim()) continue;
        const result = await upsertStaticDoc(entry.trim(), STATIC_LAILA_DIR, 'plataforma');
        if (result === 'imported') {
          imported += 1;
          plataforma += 1;
        } else if (result === 'updated') {
          updated += 1;
          plataforma += 1;
        }
      }
    }
  }

  for (const name of HISTORIAL_STATIC_FILES) {
    const result = await upsertStaticDoc(name, STATIC_ROOT_DIR, 'historial_reglas');
    if (result === 'imported') {
      imported += 1;
      historial += 1;
    } else if (result === 'updated') {
      updated += 1;
      historial += 1;
    }
  }

  // Elimina del catálogo el archivo deprecado criterios_acceso si aún aparece.
  const criteriosId = docIdFromName('criterios_acceso.md');
  const criteriosRef = doc(db, LAILA_KNOWLEDGE_COLLECTION, criteriosId);
  const criteriosSnap = await getDoc(criteriosRef);
  if (criteriosSnap.exists() && criteriosSnap.data()?.source === 'static') {
    await deleteDoc(criteriosRef);
  }

  return { imported, updated, plataforma, historial };
};

/** Obtiene URL de lectura (presignada si es S3). */
export const resolveKnowledgeReadUrl = async (docMeta: LailaKnowledgeDoc): Promise<string> => {
  if (docMeta.source === 's3' && docMeta.storagePath && getS3Config()) {
    return getPresignedUrl(docMeta.storagePath);
  }
  if (docMeta.url) return docMeta.url;
  const base =
    docMeta.category === 'historial_reglas' ? STATIC_ROOT_DIR : STATIC_LAILA_DIR;
  return `${base}/${encodeURIComponent(docMeta.name)}`;
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

  const res = await fetch(`${STATIC_LAILA_DIR}/instructions.md`);
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
