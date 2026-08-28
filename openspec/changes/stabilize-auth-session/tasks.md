## 1. Persistencia de Auth

- [x] 1.1 Inicializar Auth con `initializeAuth` e `indexedDBLocalPersistence` (fallback a `browserLocalPersistence`) en `src/firebase/config.ts` en lugar de `getAuth()`
- [x] 1.2 Quitar `setPersistence` de `setupAuthSessionMaintenance` y de `authProvider.login` en `src/firebase/auth.ts`

## 2. Recuperación de sesión

- [x] 2.1 Extraer `ensureCurrentUser` (usuario actual o espera a `onAuthStateChanged` con timeout ~5 s) y usarlo en `checkAuth` y `checkError`
- [x] 2.2 En `checkAuth`, no rechazar en el primer `currentUser` nulo; rechazar solo si tras la gracia no hay usuario
- [x] 2.3 En `checkError`, no expulsar por el primer `unauthenticated`/401: esperar usuario, refrescar token y resolver si la sesión sigue recuperable; `reject` solo si es irrecuperable (`user-disabled`, refresh revocado) o no hay usuario tras la gracia
- [x] 2.4 Conservar que 403 / `permission-denied` no cierren la sesión; no rechazar por fallos de red o timeout al verificar el token

## 3. Foco, visibilidad y datos

- [x] 3.1 En visibilidad/online, no llamar `getIdToken(true)`; esperar usuario y usar `getIdToken(false)`
- [x] 3.2 Retrasar ~300–500 ms el refetch al foco (QueryClient en `App.tsx` o equivalente) para no consultar Firestore con Auth/conexión aún inestables
- [x] 3.3 En el data provider, reintentar una vez las operaciones que fallen con `unauthenticated` si hay usuario (tras refrescar token)
- [x] 3.4 Envolver errores de Firestore en todos los métodos del data provider conservando `code`/`status`, sin tratar timeouts genéricos como sesión caducada

## 4. Verificación

- [ ] 4.1 Comprobar recarga con sesión vigente: no redirige a login
- [ ] 4.2 Comprobar ir a otra pestaña unos minutos y volver (sin recargar): no redirige a login; los listados se recuperan
- [ ] 4.3 Comprobar navegar entre módulos / pestañas internas tras volver: no redirige a login
- [ ] 4.4 Comprobar primera visita y logout explícito: sí muestran login
