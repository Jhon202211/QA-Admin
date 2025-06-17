import { db } from './config';
import { collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

export const dataProvider = {
  getList: async (resource: string, params: any = {}) => {
    const collectionRef = collection(db, resource);
    const snapshot = await getDocs(collectionRef);
    let data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filtrado
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        if (value) {
          data = data.filter(item =>
            item[key]?.toString().toLowerCase().includes(value.toString().toLowerCase())
          );
        }
      });
    }

    // Ordenamiento
    if (params.sort && params.sort.field) {
      const { field, order } = params.sort;
      data = data.sort((a, b) => {
        if (a[field] === undefined || b[field] === undefined) return 0;
        if (typeof a[field] === 'number' && typeof b[field] === 'number') {
          return order === 'ASC' ? a[field] - b[field] : b[field] - a[field];
        }
        // Para fechas
        if (field === 'date') {
          return order === 'ASC'
            ? new Date(a[field]).getTime() - new Date(b[field]).getTime()
            : new Date(b[field]).getTime() - new Date(a[field]).getTime();
        }
        // Para strings
        return order === 'ASC'
          ? a[field].toString().localeCompare(b[field].toString())
          : b[field].toString().localeCompare(a[field].toString());
      });
    }

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