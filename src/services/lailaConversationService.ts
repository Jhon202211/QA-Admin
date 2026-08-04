import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
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
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('userId', '==', userId),
    where('archived', '==', archived)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const conversations = snapshot.docs
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
 * Escucha los mensajes de una conversación específica.
 * Si conversationId es 'legacy', busca mensajes del usuario que NO tienen conversationId.
 */
export const subscribeToLailaMessages = (
  userId: string,
  conversationId: string | 'legacy',
  onChange: (messages: LailaMessage[]) => void,
  onError?: (error: unknown) => void
): (() => void) => {
  let q;
  if (conversationId === 'legacy') {
    // Para mensajes antiguos sin conversationId
    q = query(
      collection(db, MESSAGES_COLLECTION),
      where('userId', '==', userId)
    );
  } else {
    q = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', conversationId)
    );
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs
        .map((d) => {
          const data = d.data();
          // En modo legacy, permitimos mensajes sin conversationId O con el ID 'legacy'
          if (conversationId === 'legacy' && data.conversationId && data.conversationId !== 'legacy') return null;
          // En modo normal, el conversationId debe coincidir
          if (conversationId !== 'legacy' && data.conversationId !== conversationId) return null;
          
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
  userId: string,
  conversationId: string,
  archived: boolean = true
): Promise<void> => {
  if (conversationId === 'legacy') {
    // Si es el chat virtual 'legacy', creamos un documento real para poder archivarlo
    await addDoc(collection(db, CONVERSATIONS_COLLECTION), {
      userId,
      title: 'Chat recuperado',
      archived: true,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
    });
    // Nota: Los mensajes seguirán siendo accesibles vía 'userId' en modo legacy 
    // pero ahora aparecerá en la lista de archivados.
    return;
  }
  await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
    archived,
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
  const batch = [
    addDoc(collection(db, MESSAGES_COLLECTION), {
      userId,
      conversationId,
      role,
      content,
      sources: sources ?? [],
      createdAt: serverTimestamp(),
    }),
    updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
      lastMessageAt: serverTimestamp(),
      // Si es el primer mensaje del usuario, podríamos actualizar el título aquí
    }),
  ];

  if (role === 'user') {
    // Intenta actualizar el título si es el primer mensaje
    // Por simplicidad en este paso, no lo haremos, pero es una mejora posible
  }

  await Promise.all(batch);
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
