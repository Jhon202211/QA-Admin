import { db } from './config';
import { collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

export const dataProvider = {
  getList: async (resource: string) => {
    const collectionRef = collection(db, resource);
    const snapshot = await getDocs(collectionRef);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return {
      data,
      total: data.length
    };
  },

  getOne: async (resource: string, params: { id: string }) => {
    const docRef = doc(db, resource, params.id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Document not found');
    }
    return {
      data: {
        id: docSnap.id,
        ...docSnap.data()
      }
    };
  },

  create: async (resource: string, params: { data: any }) => {
    const collectionRef = collection(db, resource);
    const docRef = await addDoc(collectionRef, params.data);
    return {
      data: {
        id: docRef.id,
        ...params.data
      }
    };
  },

  update: async (resource: string, params: { id: string; data: any }) => {
    const docRef = doc(db, resource, params.id);
    await updateDoc(docRef, params.data);
    return {
      data: {
        id: params.id,
        ...params.data
      }
    };
  },

  delete: async (resource: string, params: { id: string }) => {
    const docRef = doc(db, resource, params.id);
    await deleteDoc(docRef);
    return {
      data: { id: params.id }
    };
  },

  getMany: async (resource: string, params: { ids: string[] }) => {
    const data = await Promise.all(
      params.ids.map(id => dataProvider.getOne(resource, { id }))
    );
    return {
      data: data.map(item => item.data)
    };
  },

  getManyReference: async (resource: string, params: { target: string; id: string }) => {
    const collectionRef = collection(db, resource);
    const q = query(collectionRef, where(params.target, '==', params.id));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return {
      data,
      total: data.length
    };
  }
}; 