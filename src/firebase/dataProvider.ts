import { db } from './config';
import { collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';

interface DataItem {
  id: string;
  [key: string]: any;
}

export const dataProvider = {
  getList: async (resource: string, params: any = {}) => {
    const collectionRef = collection(db, resource);
    const snapshot = await getDocs(collectionRef);
    let data: DataItem[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DataItem));

    // Filtrado
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        if (value) {
          data = data.filter(item =>
            (item[key] as any)?.toString().toLowerCase().includes(value.toString().toLowerCase())
          );
        }
      });
    }

    // Ordenamiento
    if (params.sort && params.sort.field) {
      const { field, order } = params.sort;
      data = data.sort((a, b) => {
        const aValue = a[field] as any;
        const bValue = b[field] as any;
        if (aValue === undefined || bValue === undefined) return 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return order === 'ASC' ? aValue - bValue : bValue - aValue;
        }
        // Para fechas
        if (field === 'date') {
          return order === 'ASC'
            ? new Date(aValue).getTime() - new Date(bValue).getTime()
            : new Date(bValue).getTime() - new Date(aValue).getTime();
        }
        // Para strings
        return order === 'ASC'
          ? aValue.toString().localeCompare(bValue.toString())
          : bValue.toString().localeCompare(aValue.toString());
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
  },

  updateMany: async (resource: string, params: { ids: string[]; data: any }) => {
    const batch = writeBatch(db);
    params.ids.forEach(id => {
      const docRef = doc(db, resource, id);
      batch.update(docRef, params.data);
    });
    await batch.commit();
    return {
      data: params.ids.map(id => ({ id, ...params.data }))
    };
  },

  deleteMany: async (resource: string, params: { ids: string[] }) => {
    const batch = writeBatch(db);
    params.ids.forEach(id => {
      const docRef = doc(db, resource, id);
      batch.delete(docRef);
    });
    await batch.commit();
    return {
      data: params.ids.map(id => ({ id }))
    };
  }
}; 