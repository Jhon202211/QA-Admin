import crypto from 'crypto';
import { promisify } from 'util';
import { db, FieldValue, Timestamp } from './firebaseAdmin.js';

const scrypt = promisify(crypto.scrypt);

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'qa_session';
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const PASSWORD_KEY_LENGTH = 64;
const COOKIE_SAME_SITE = process.env.SESSION_COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'None' : 'Lax');
const COOKIE_SECURE =
  process.env.SESSION_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production' || COOKIE_SAME_SITE.toLowerCase() === 'none';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const parseCookies = (cookieHeader = '') =>
  cookieHeader.split(';').reduce((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join('=') || '');
    return cookies;
  }, {});

const buildCookie = (token, maxAgeMs = SESSION_TTL_MS) => {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `SameSite=${COOKIE_SAME_SITE}`,
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];

  if (COOKIE_SECURE) {
    parts.push('Secure');
  }

  return parts.join('; ');
};

const clearCookie = () =>
  [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    `SameSite=${COOKIE_SAME_SITE}`,
    'Max-Age=0',
    COOKIE_SECURE ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

export const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
};

export const verifyPassword = async (password, storedHash) => {
  const [scheme, salt, storedKey] = String(storedHash || '').split('$');
  if (scheme !== 'scrypt' || !salt || !storedKey) return false;

  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  const storedBuffer = Buffer.from(storedKey, 'hex');

  if (storedBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedBuffer, derivedKey);
};

const publicUser = (id, data) => ({
  id,
  email: data.email,
  fullName: data.name || data.fullName || data.email,
  role: data.role || 'user',
});

const findUserByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const directDoc = await db.collection('users').doc(normalizedEmail).get();

  if (directDoc.exists) {
    return { id: directDoc.id, data: directDoc.data() };
  }

  const snapshot = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
  if (snapshot.empty) return null;

  const userDoc = snapshot.docs[0];
  return { id: userDoc.id, data: userDoc.data() };
};

const createSession = async (user, req) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256(token);
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + SESSION_TTL_MS));

  await db.collection('sessions').doc(tokenHash).set({
    tokenHash,
    userId: user.id,
    userEmail: user.data.email,
    role: user.data.role || 'user',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
    expiresAt,
    userAgent: req.get('user-agent') || null,
    ip: req.ip || null,
  });

  return token;
};

export const getSessionFromRequest = async (req) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;

  const tokenHash = sha256(token);
  const sessionRef = db.collection('sessions').doc(tokenHash);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) return null;

  const session = sessionDoc.data();
  const expiresAt = session.expiresAt?.toDate?.() || new Date(0);
  if (expiresAt.getTime() <= Date.now()) {
    await sessionRef.delete();
    return null;
  }

  const userDoc = await db.collection('users').doc(session.userId).get();
  if (!userDoc.exists) {
    await sessionRef.delete();
    return null;
  }

  const user = userDoc.data();
  if (user.active === false) {
    await sessionRef.delete();
    return null;
  }

  await sessionRef.update({ lastSeenAt: FieldValue.serverTimestamp() }).catch(() => {});

  return {
    tokenHash,
    session,
    user: publicUser(userDoc.id, user),
  };
};

export const requireSession = async (req, res, next) => {
  try {
    const sessionContext = await getSessionFromRequest(req);
    if (!sessionContext) {
      return res.status(401).json({ message: 'Sesión inválida o expirada' });
    }

    req.sessionContext = sessionContext;
    req.user = sessionContext.user;
    return next();
  } catch (error) {
    console.error('Error validando sesión:', error);
    return res.status(500).json({ message: 'Error validando la sesión' });
  }
};

export const registerAuthRoutes = (app) => {
  app.post('/auth/login', async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.username || req.body?.email);
      const password = String(req.body?.password || '');

      if (!email || !password) {
        return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
      }

      const user = await findUserByEmail(email);
      if (!user || user.data.active === false) {
        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
      }

      const passwordMatches = await verifyPassword(password, user.data.passwordHash);
      if (!passwordMatches) {
        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
      }

      const token = await createSession(user, req);
      await db.collection('users').doc(user.id).update({
        lastLoginAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.setHeader('Set-Cookie', buildCookie(token));
      return res.json({ user: publicUser(user.id, user.data) });
    } catch (error) {
      console.error('Error en login:', error);
      return res.status(500).json({ message: 'Error iniciando sesión' });
    }
  });

  app.post('/auth/logout', requireSession, async (req, res) => {
    try {
      await db.collection('sessions').doc(req.sessionContext.tokenHash).delete();
      res.setHeader('Set-Cookie', clearCookie());
      return res.json({ ok: true });
    } catch (error) {
      console.error('Error en logout:', error);
      return res.status(500).json({ message: 'Error cerrando sesión' });
    }
  });

  app.get('/auth/me', requireSession, (req, res) => {
    res.json({ user: req.user });
  });
};
