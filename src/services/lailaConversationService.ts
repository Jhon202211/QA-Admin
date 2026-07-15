import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { LailaMessage, LailaMessageRole } from '../types/openLaila';

const COLLECTION = 'openlaila_messages';

/**
 * Persistencia del historial de conversación de OpenLaila en Firestore.
 * Cada usuario tiene una única conversación continua identificada por su
 * `userId` (uid de Firebase Auth).
 */

export const subscribeToLailaMessages = (
  userId: string,
  onChange: (messages: LailaMessage[]) => void,
  onError?: (error: unknown) => void
): (() => void) => {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs
        .map((d) => {
          const data = d.data();
          const createdAt: Date =
            data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
          return {
            id: d.id,
            userId: data.userId,
            role: data.role as LailaMessageRole,
            content: data.content as string,
            createdAt,
            sources: data.sources as string[] | undefined,
          } as LailaMessage;
        })
        // Firestore no garantiza orden sin índice compuesto; ordenamos en cliente.
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      onChange(messages);
    },
    (error) => {
      console.error('[LailaConversationService] Error escuchando mensajes:', error);
      onError?.(error);
    }
  );
};

export const addLailaMessage = async (
  userId: string,
  role: LailaMessageRole,
  content: string,
  sources?: string[]
): Promise<void> => {
  await addDoc(collection(db, COLLECTION), {
    userId,
    role,
    content,
    sources: sources ?? [],
    createdAt: serverTimestamp(),
  });
};

/** Elimina todo el historial de conversación del usuario ("Nuevo chat"). */
export const clearLailaConversation = async (messages: LailaMessage[]): Promise<void> => {
  const batch = writeBatch(db);
  messages.forEach((m) => batch.delete(doc(db, COLLECTION, m.id)));
  await batch.commit();
};
