## Context

See proposal.md — Why. El cliente usa Firebase Auth (email/password) + react-admin `authProvider` con `requireAuth`. Un `Promise.reject()` en `checkAuth` o `checkError` redirige a `/login`. Firebase ya emite ID token (~1 h) y refresh token (IndexedDB); no falta un refresh propio.

Hoy `getAuth()` inicializa persistencia IndexedDB y acto seguido `setPersistence(browserLocalPersistence)` en cada arranque y en el login, lo que puede desloguear y volver a entrar. Al volver a la pestaña, `visibilitychange` fuerza `getIdToken(true)` a la vez que react-admin (TanStack Query) refetch al foco. `authStateReady()` no espera una segunda hidratación. Un `currentUser === null` o un `unauthenticated` puntual expulsan.

Archivos núcleo: `src/firebase/config.ts`, `src/firebase/auth.ts`, `src/firebase/dataProvider.ts`, `src/main.tsx`, `src/App.tsx`.

## Goals / Non-Goals

**Goals:**
- Una sola estrategia de persistencia, fijada al crear Auth.
- Comprobar sesión con espera/reintento, no con el primer `null`.
- Tras foco/visibilidad: rehidratar Auth, luego datos; no forzar refresh en carrera con las queries.
- Reintentar una vez las lecturas Firestore que fallen como `unauthenticated` si Auth sigue vivo.
- Seguir expulsando solo si la sesión es irrecuperable.

**Non-Goals:**
- Refresh token o JWT propios, ni cambiar el proveedor de identidad.
- Idle timeout de seguridad, 2FA, ni cambiar “Recordar correo”.
- Reglas de Firestore ni backend.
- Rediseño de la pantalla de login.

## Decisions

### 1. Persistencia IndexedDB al crear Auth, sin `setPersistence` en cada boot

Usar `initializeAuth` con `indexedDBLocalPersistence` (y fallback a `browserLocalPersistence` si IndexedDB no está) en `config.ts`. Quitar `setPersistence` de `setupAuthSessionMaintenance` y del `login`.

Firebase documenta que cambiar el tipo de persistencia con un usuario ya restaurado lo desloguea y lo vuelve a entrar. Eso abre una ventana con `currentUser === null` que `checkAuth` interpreta como logout.

**Alternativa:** dejar `getAuth()` + `setPersistence` solo en login. Se rechaza: el daño está en el arranque, no solo en el login. `getAuth()` ya elige IndexedDB; volver a pedir localStorage es el cambio de tipo.

### 2. `ensureCurrentUser` con gracia, no `authStateReady` como única barrera

Extraer una espera compartida usada por `checkAuth` y `checkError`:

- Si `auth.currentUser` existe, devolverlo.
- Si no, suscribirse a `onAuthStateChanged` hasta usuario o timeout (~5 s).
- No tratar `authStateReady()` como “el usuario ya es el definitivo” tras un freeze de pestaña: esa promesa se resuelve una vez al inicio.

**Alternativa:** timeout largo (minutos) como en un parche anterior. Se rechaza: bloquea la UI de login en la primera visita. Cinco segundos cubren rehidratación IndexedDB; la primera visita sin sesión sigue yendo a login al vencer.

### 3. `checkError` no expulsa en el primer `unauthenticated`

Tras `unauthenticated` / 401 / códigos de token caducado:

1. `ensureCurrentUser`.
2. Si hay usuario, `getIdToken(true)` con reintento de errores transitorios.
3. Resolver (no `reject`) si el usuario sigue ahí o el error es transitorio; react-admin no redirige.
4. `reject` solo si no hay usuario tras la gracia, o el código es irrecuperable (`auth/user-disabled`, `auth/user-token-expired` / `auth/invalid-user-token` tras el refresh forzado, logout explícito).

Mantener: 403 / `permission-denied` no son sesión caducada.

**Alternativa:** implementar refresh token propio. Se rechaza: duplica Firebase y no evita el `reject()` prematuro.

### 4. Al volver a la pestaña: no `getIdToken(true)` en carrera con las queries

`visibilitychange` / `online` no deben forzar refresh de red al instante. Orden:

1. Esperar `ensureCurrentUser` (sin expulsar).
2. `getIdToken(false)` — el SDK refresca si el ID token está vencido o a punto.
3. Dejar que el refetch al foco use ya un Auth estable.

Opcional: retraso breve (~300–500 ms) antes del refetch al foco, o `refetchOnWindowFocus` con ese delay en el `QueryClient` de react-admin, para no pegarle a Firestore con la conexión long-polling aún muerta.

**Alternativa:** desactivar `refetchOnWindowFocus`. Se rechaza como default: los listados se quedarían stale; basta serializar Auth → datos y reintentar `unauthenticated`.

### 5. Reintento único en el data provider ante `unauthenticated`

En `getList` (y el resto de métodos que hoy no envuelven el error): si Firestore lanza `unauthenticated` y hay `currentUser`, refrescar token y repetir **una** vez. Si el reintento funciona, el usuario no ve error ni pasa por `checkError`. Envolver todos los errores de Firestore con código/status para no perder metadatos.

El timeout de 15 s se mantiene; un timeout sin código de auth no debe pasar por la rama de sesión caducada (hoy ya no lo hace; no regresionar).

### 6. Mantenimiento de token en segundo plano, menos agresivo

Conservar intervalo y actividad, pero con `getIdToken(false)` y sin cerrar sesión si falla (como ahora). Quitar el `force=true` en visibility/online. El SDK sigue renovando el ID token; nosotros no competimos con Firestore al despertar.

## Risks / Trade-offs

- **[Riesgo] Primera visita espera ~5 s antes de login** → Mitigación: `authStateReady` + `onAuthStateChanged`; si el primer evento es `null` y no hay persistencia, rechazar antes del timeout. Medir en dispositivos lentos.
- **[Riesgo] Sesión revocada tarda unos segundos en expulsar** → Aceptado: mejor que un falso logout. Tras gracia + refresh fallido irrecuperable, sí login.
- **[Riesgo] IndexedDB bloqueado (Safari privado)** → Fallback a `browserLocalPersistence`; sesión de pestaña, no durable. Documentar si aparece.
- **[Riesgo] Long polling sigue dando `unauthenticated` tras el reintento** → Mitigación: un reintento + no expulsar si Auth vive; el usuario ve error de datos, no login. Si persiste, evaluar quitar `experimentalAutoDetectLongPolling` en un change aparte.
- **[Trade-off] Datos un instante stale al volver** → Delay corto vs. logout. Preferimos delay.

## Migration Plan

Cambio solo de frontend. Despliegue normal (Cloudflare Pages). Quien ya está logueado no necesita acción; al recargar usa IndexedDB como hasta el `getAuth()` actual.

Rollback: revertir el deploy. No hay migración de datos. Si alguien quedó en login por un falso corte, recargar o volver a entrar restaura la sesión persistida.

## Open Questions

Ninguna que altere specs, enfoque o tareas. El valor exacto del delay de foco (300 vs 500 ms) y del timeout de gracia (3 vs 5 s) se fija en implementación y se ajusta si la primera visita se siente lenta.
