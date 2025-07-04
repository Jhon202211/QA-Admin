import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { TestCase } from '../types/testCase';
import type { TestPlan } from '../types/testPlanning';

const convertTimestampToDate = (data: any) => {
  if (!data) return data;
  
  const newData = { ...data };
  Object.keys(newData).forEach(key => {
    if (newData[key] instanceof Timestamp) {
      newData[key] = newData[key].toDate();
    }
    if (key === 'date' && typeof newData[key] === 'string') {
      newData[key] = new Date(newData[key]);
    }
  });
  return newData;
};

const convertDateToTimestamp = (data: any) => {
  if (!data) return data;
  
  const newData = { ...data };
  Object.keys(newData).forEach(key => {
    if (newData[key] instanceof Date) {
      newData[key] = Timestamp.fromDate(newData[key]);
    }
  });
  return newData;
};

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

    // Paginación
    let total = data.length;
    if (params.pagination) {
      const { page, perPage } = params.pagination;
      const start = (page - 1) * perPage;
      const end = start + perPage;
      data = data.slice(start, end);
    }

    return {
      data,
      total
    };
  },

  getOne: async (resource: string, params: any) => {
    const docRef = doc(db, resource, params.id.toString());
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Document not found');
    }

    return {
      data: {
        id: docSnap.id,
        ...convertTimestampToDate(docSnap.data())
      },
    };
  },

  getMany: async (resource: string, params: any) => {
    const data = await Promise.all(
      params.ids.map((id: string | number) => {
        const docRef = doc(db, resource, id.toString());
        return getDoc(docRef).then(doc => ({
          id: doc.id,
          ...convertTimestampToDate(doc.data())
        }));
      })
    );

    return { data };
  },

  create: async (resource: string, params: any) => {
    const collectionRef = collection(db, resource);
    let caseKey = params.data.caseKey;
    // Si el usuario no proporciona caseKey, generarlo automáticamente
    if (!caseKey) {
      const snapshot = await getDocs(collectionRef);
      // Filtrar solo los que tienen caseKey y extraer el número
      const keys = snapshot.docs
        .map(doc => (doc.data() as { caseKey?: string }).caseKey)
        .filter(key => typeof key === 'string' && /^CP\d{3,}$/.test(key as string))
        .map(key => parseInt((key as string).replace('CP', ''), 10));
      const max = keys.length > 0 ? Math.max(...keys) : 0;
      const next = (max + 1).toString().padStart(3, '0');
      caseKey = `CP${next}`;
    }
    const data = convertDateToTimestamp({ ...params.data, caseKey });
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      data: {
        id: docRef.id,
        ...params.data,
        caseKey,
      },
    };
  },

  update: async (resource: string, params: any) => {
    const { id, data } = params;
    const docRef = doc(db, resource, id.toString());
    const updateData = convertDateToTimestamp(data);
    
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Timestamp.now(),
    });

    return {
      data: {
        id,
        ...data,
      },
    };
  },

  delete: async (resource: string, params: any) => {
    const docRef = doc(db, resource, params.id.toString());
    await deleteDoc(docRef);

    return {
      data: params,
    };
  },

  deleteMany: async (resource: string, params: any) => {
    const { ids } = params;
    await Promise.all(
      ids.map((id: string | number) => deleteDoc(doc(db, resource, id.toString())))
    );

    return {
      data: ids,
    };
  },

  updateMany: async (resource: string, params: any) => {
    const { ids, data } = params;
    const updateData = convertDateToTimestamp(data);
    
    await Promise.all(
      ids.map((id: string | number) => 
        updateDoc(doc(db, resource, id.toString()), {
          ...updateData,
          updatedAt: Timestamp.now(),
        })
      )
    );

    return {
      data: ids,
    };
  },

  getManyReference: async (resource: string, params: any) => {
    const { target, id } = params;
    const collectionRef = collection(db, resource);
    const q = query(collectionRef, where(target, '==', id));
    const snapshot = await getDocs(q);

    return {
      data: snapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data())
      })),
      total: snapshot.size,
    };
  },
}; 