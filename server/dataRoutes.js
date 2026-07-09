import { db, FieldValue, Timestamp } from './firebaseAdmin.js';
import { requireSession } from './auth.js';

const isValidResource = (resource) => /^[A-Za-z0-9_-]+$/.test(resource);

const requireValidResource = (req, res, next) => {
  if (!isValidResource(req.params.resource)) {
    return res.status(400).json({ message: 'Recurso inválido' });
  }
  return next();
};

const parseJsonParam = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const serializeFirestoreValue = (value) => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeFirestoreValue(nestedValue)])
    );
  }

  return value;
};

const serializeDoc = (snapshot) => ({
  id: snapshot.id,
  ...serializeFirestoreValue(snapshot.data() || {}),
});

const applyFilter = (items, filter) => {
  if (!filter) return items;

  return Object.entries(filter).reduce((currentItems, [key, value]) => {
    if (value === undefined || value === null || value === '') return currentItems;

    return currentItems.filter((item) =>
      String(item[key] ?? '').toLowerCase().includes(String(value).toLowerCase())
    );
  }, items);
};

const applySort = (items, sort) => {
  if (!sort?.field) return items;

  const direction = sort.order === 'DESC' ? -1 : 1;
  return [...items].sort((a, b) => {
    const aValue = a[sort.field];
    const bValue = b[sort.field];

    if (aValue === undefined || bValue === undefined) return 0;
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * direction;
    }

    if (sort.field === 'date') {
      return (new Date(aValue).getTime() - new Date(bValue).getTime()) * direction;
    }

    return String(aValue).localeCompare(String(bValue)) * direction;
  });
};

const applyPagination = (items, pagination) => {
  if (!pagination) return items;

  const page = Number(pagination.page || 1);
  const perPage = Number(pagination.perPage || items.length);
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
};

const generateCaseKey = async (collectionRef) => {
  const counterRef = db.collection('_counters').doc('caseKey');
  const counterDoc = await counterRef.get();

  if (!counterDoc.exists) {
    const snapshot = await collectionRef.get();
    const existing = snapshot.docs
      .map((doc) => doc.data()?.caseKey)
      .filter((key) => typeof key === 'string' && /^CP\d+$/.test(key))
      .map((key) => Number.parseInt(key.replace('CP', ''), 10));
    const maxExisting = existing.length > 0 ? Math.max(...existing) : 0;
    await counterRef.set({ value: maxExisting });
  }

  const nextNum = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const current = snapshot.exists ? snapshot.data()?.value || 0 : 0;
    const next = current + 1;
    transaction.set(counterRef, { value: next });
    return next;
  });

  return `CP${String(nextNum).padStart(3, '0')}`;
};

export const registerDataRoutes = (app) => {
  app.use('/api/data/:resource', requireSession, requireValidResource);

  app.get('/api/data/:resource', async (req, res) => {
    try {
      const snapshot = await db.collection(req.params.resource).get();
      const filter = parseJsonParam(req.query.filter, {});
      const sort = parseJsonParam(req.query.sort, null);
      const pagination = parseJsonParam(req.query.pagination, null);

      const filtered = applyFilter(snapshot.docs.map(serializeDoc), filter);
      const sorted = applySort(filtered, sort);
      const paginated = applyPagination(sorted, pagination);

      return res.json({ data: paginated, total: filtered.length });
    } catch (error) {
      console.error(`Error listando ${req.params.resource}:`, error);
      return res.status(500).json({ message: `No se pudo cargar ${req.params.resource}` });
    }
  });

  app.get('/api/data/:resource/:id', async (req, res) => {
    try {
      const snapshot = await db.collection(req.params.resource).doc(String(req.params.id)).get();
      if (!snapshot.exists) {
        return res.status(404).json({ message: 'Documento no encontrado' });
      }

      return res.json({ data: serializeDoc(snapshot) });
    } catch (error) {
      console.error(`Error leyendo ${req.params.resource}:`, error);
      return res.status(500).json({ message: `No se pudo leer ${req.params.resource}` });
    }
  });

  app.post('/api/data/:resource', async (req, res) => {
    try {
      const collectionRef = db.collection(req.params.resource);
      const caseKey = req.body?.caseKey || (await generateCaseKey(collectionRef));
      const data = {
        ...req.body,
        caseKey,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      const docRef = await collectionRef.add(data);
      return res.status(201).json({ data: { id: docRef.id, ...req.body, caseKey } });
    } catch (error) {
      console.error(`Error creando ${req.params.resource}:`, error);
      return res.status(500).json({ message: `No se pudo crear ${req.params.resource}` });
    }
  });

  app.put('/api/data/:resource/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection(req.params.resource).doc(String(id)).update({
        ...req.body,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return res.json({ data: { id, ...req.body } });
    } catch (error) {
      console.error(`Error actualizando ${req.params.resource}:`, error);
      return res.status(500).json({ message: `No se pudo actualizar ${req.params.resource}` });
    }
  });

  app.patch('/api/data/:resource/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.collection(req.params.resource).doc(String(id)).set(
        {
          ...req.body,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: req.body?.createdAt || FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({ data: { id, ...req.body } });
    } catch (error) {
      console.error(`Error guardando ${req.params.resource}:`, error);
      return res.status(500).json({ message: `No se pudo guardar ${req.params.resource}` });
    }
  });

  app.delete('/api/data/:resource/:id', async (req, res) => {
    try {
      await db.collection(req.params.resource).doc(String(req.params.id)).delete();
      return res.json({ data: { id: req.params.id } });
    } catch (error) {
      console.error(`Error eliminando ${req.params.resource}:`, error);
      return res.status(500).json({ message: `No se pudo eliminar ${req.params.resource}` });
    }
  });

  app.post('/api/data/:resource/getMany', async (req, res) => {
    try {
      const ids = req.body?.ids || [];
      const snapshots = await Promise.all(
        ids.map((id) => db.collection(req.params.resource).doc(String(id)).get())
      );
      return res.json({ data: snapshots.filter((snapshot) => snapshot.exists).map(serializeDoc) });
    } catch (error) {
      console.error(`Error getMany ${req.params.resource}:`, error);
      return res.status(500).json({ message: `No se pudo cargar ${req.params.resource}` });
    }
  });

  app.post('/api/data/:resource/getManyReference', async (req, res) => {
    try {
      const { target, id } = req.body || {};
      const snapshot = await db.collection(req.params.resource).where(target, '==', id).get();
      const data = snapshot.docs.map(serializeDoc);
      return res.json({ data, total: data.length });
    } catch (error) {
      console.error(`Error getManyReference ${req.params.resource}:`, error);
      return res.status(500).json({ message: `No se pudo cargar ${req.params.resource}` });
    }
  });

  app.post('/api/data/:resource/updateMany', async (req, res) => {
    try {
      const { ids = [], data = {}, orderedUpdates = [] } = req.body || {};
      const batch = db.batch();

      if (Array.isArray(orderedUpdates) && orderedUpdates.length > 0) {
        orderedUpdates.forEach((update) => {
          batch.update(db.collection(req.params.resource).doc(String(update.id)), {
            ...(update.data || {}),
            updatedAt: FieldValue.serverTimestamp(),
          });
        });
      } else {
        ids.forEach((id) => {
          batch.update(db.collection(req.params.resource).doc(String(id)), {
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
          });
        });
      }

      await batch.commit();
      return res.json({ data: ids });
    } catch (error) {
      console.error(`Error updateMany ${req.params.resource}:`, error);
      return res.status(500).json({ message: `No se pudo actualizar ${req.params.resource}` });
    }
  });

  app.post('/api/data/:resource/deleteMany', async (req, res) => {
    try {
      const ids = req.body?.ids || [];
      const batch = db.batch();

      ids.forEach((id) => {
        batch.delete(db.collection(req.params.resource).doc(String(id)));
      });

      await batch.commit();
      return res.json({ data: ids });
    } catch (error) {
      console.error(`Error deleteMany ${req.params.resource}:`, error);
      return res.status(500).json({ message: `No se pudo eliminar ${req.params.resource}` });
    }
  });
};
