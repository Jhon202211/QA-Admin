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
    let q = query(collectionRef);

    // Aplicar filtros si existen
    if (params.filter) {
      Object.keys(params.filter).forEach(key => {
        q = query(q, where(key, '==', params.filter[key]));
      });
    }

    // Aplicar ordenamiento
    if (params.sort) {
      q = query(q, orderBy(params.sort.field, params.sort.order.toLowerCase()));
    }

    // Aplicar paginación
    if (params.pagination) {
      const { page, perPage } = params.pagination;
      q = query(q, limit(perPage));
      if (page > 1) {
        const lastDoc = await getDocs(query(collectionRef, limit((page - 1) * perPage)));
        q = query(q, startAfter(lastDoc.docs[lastDoc.docs.length - 1]));
      }
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestampToDate(doc.data())
    }));

    return {
      data,
      total: snapshot.size,
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
    const data = convertDateToTimestamp(params.data);
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      data: {
        id: docRef.id,
        ...params.data,
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