import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export interface ExecutionDraftRecord {
  id: string;
  testCaseId: string;
  userId: string;
  userEmail?: string | null;
  data: any;
  updatedAt?: any;
  createdAt?: any;
}

const COLLECTION = 'execution_drafts';

const requireUser = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No hay usuario autenticado para guardar el borrador');
  }
  return user;
};

const draftDocId = (userId: string, testCaseId: string) =>
  `${encodeURIComponent(userId)}_${encodeURIComponent(testCaseId)}`;

export const executionDraftService = {
  async save(testCaseId: string, data: any) {
    const user = requireUser();
    const id = draftDocId(user.uid, testCaseId);
    const ref = doc(db, COLLECTION, id);

    await setDoc(
      ref,
      {
        testCaseId,
        userId: user.uid,
        userEmail: user.email ?? null,
        data,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  async get(testCaseId: string): Promise<ExecutionDraftRecord | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const ref = doc(db, COLLECTION, draftDocId(user.uid, testCaseId));
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;

    return {
      id: snapshot.id,
      ...(snapshot.data() as Omit<ExecutionDraftRecord, 'id'>),
    };
  },

  async list(): Promise<ExecutionDraftRecord[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const q = query(collection(db, COLLECTION), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...(snapshotDoc.data() as Omit<ExecutionDraftRecord, 'id'>),
    }));
  },

  async remove(testCaseId: string) {
    const user = auth.currentUser;
    if (!user) return;

    await deleteDoc(doc(db, COLLECTION, draftDocId(user.uid, testCaseId)));
  },
};
