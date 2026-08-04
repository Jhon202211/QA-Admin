import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { LailaMessage, LailaMessageRole, LailaConversation } from '../types/openLaila';

const MESSAGES_COLLECTION = 'openlaila_messages';
const CONVERSATIONS_COLLECTION = 'openlaila_conversations';

/**
 * Escucha las conversaciones de un usuario (activas o archivadas).
 */
export const subscribeToLailaConversations = (
  userId: string,
  archived: boolean,
  onChange: (conversations: LailaConversation[]) => void,
  onError?: (error: unknown) => void
): (() => void) => {
  // Eliminamos orderBy para evitar la necesidad de índices compuestos
  const q = query(collection(db, CONVERSATIONS_COLLECTION), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const conversations = snapshot.docs
        .filter((d) => Boolean(d.data().archived) === archived)
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            title: data.title,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            archived: data.archived,
            lastMessageAt: (data.lastMessageAt as Timestamp)?.toDate() || new Date(),
          } as LailaConversation;
        })
        .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
      onChange(conversations);
    },
    (error) => {
      console.error('[LailaConversationService] Error escuchando conversaciones:', error);
      onError?.(error);
    }
  );
};

/**
 * Escucha los mensajes de una conversación real.
 */
export const subscribeToLailaMessages = (
  userId: string,
  conversationId: string,
  onChange: (messages: LailaMessage[]) => void,
  onError?: (error: unknown) => void
): (() => void) => {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('conversationId', '==', conversationId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs
        .map((d) => {
          const data = d.data();
          if (data.userId !== userId) return null;
          
          return {
            id: d.id,
            userId: data.userId,
            conversationId: data.conversationId,
            role: data.role as LailaMessageRole,
            content: data.content as string,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            sources: data.sources as string[] | undefined,
          } as LailaMessage;
        })
        .filter((m): m is LailaMessage => m !== null)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      onChange(messages);
    },
    (error) => {
      console.error('[LailaConversationService] Error escuchando mensajes:', error);
      onError?.(error);
    }
  );
};

/**
 * Asigna los mensajes del formato antiguo a una conversación real.
 * Si el usuario ya archivó un "Chat recuperado", se reutiliza ese documento
 * para que el historial no vuelva a aparecer como conversación activa.
 */
export const migrateLegacyLailaMessages = async (
  userId: string
): Promise<{ id: string; archived: boolean } | null> => {
  const messagesSnapshot = await getDocs(
    query(collection(db, MESSAGES_COLLECTION), where('userId', '==', userId))
  );
  const legacyMessages = messagesSnapshot.docs.filter((messageDoc) => {
    const conversationId = messageDoc.data().conversationId;
    return !conversationId || conversationId === 'legacy';
  });

  if (legacyMessages.length === 0) return null;

  const conversationsSnapshot = await getDocs(
    query(collection(db, CONVERSATIONS_COLLECTION), where('userId', '==', userId))
  );
  const recoveredConversation = conversationsSnapshot.docs.find((conversationDoc) => {
    const data = conversationDoc.data();
    return data.legacyMigrated === true || (data.title === 'Chat recuperado' && data.archived === true);
  });

  let conversationId: string;
  let archived: boolean;

  if (recoveredConversation) {
    conversationId = recoveredConversation.id;
    archived = Boolean(recoveredConversation.data().archived);
  } else {
    conversationId = await createLailaConversation(userId, 'Chat recuperado');
    archived = false;
  }

  // Firestore admite como máximo 500 operaciones por lote.
  for (let index = 0; index < legacyMessages.length; index += 450) {
    const batch = writeBatch(db);
    legacyMessages.slice(index, index + 450).forEach((messageDoc) => {
      batch.update(messageDoc.ref, { conversationId });
    });
    await batch.commit();
  }

  await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
    legacyMigrated: true,
    lastMessageAt: serverTimestamp(),
  });

  return { id: conversationId, archived };
};

/**
 * Crea una nueva conversación para un usuario.
 */
export const createLailaConversation = async (
  userId: string,
  title: string = 'Nueva conversación'
): Promise<string> => {
  const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), {
    userId,
    title,
    archived: false,
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Archiva o desarchiva una conversación.
 */
export const archiveLailaConversation = async (
  conversationId: string,
  archived: boolean = true
): Promise<void> => {
  await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
    archived,
    lastMessageAt: serverTimestamp(),
  });
};

/**
 * Agrega un mensaje a una conversación.
 */
export const addLailaMessage = async (
  userId: string,
  conversationId: string,
  role: LailaMessageRole,
  content: string,
  sources?: string[]
): Promise<void> => {
  const batch = writeBatch(db);
  const messageRef = doc(collection(db, MESSAGES_COLLECTION));

  batch.set(messageRef, {
    userId,
    conversationId,
    role,
    content,
    sources: sources ?? [],
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
    lastMessageAt: serverTimestamp(),
  });

  await batch.commit();
};

/** 
 * Actualiza el título de una conversación.
 */
export const updateLailaConversationTitle = async (
  conversationId: string,
  title: string
): Promise<void> => {
  await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
    title,
  });
};

/** 
 * Elimina (o limpia) mensajes. Nota: En este nuevo modelo, 
 * preferimos archivar o crear nuevos chats. 
 */
export const clearLailaConversation = async (_messages: LailaMessage[]): Promise<void> => {
  // Mantengo la función por compatibilidad, pero su uso cambiará
  // ... implementar si es necesario borrar realmente ...
};
