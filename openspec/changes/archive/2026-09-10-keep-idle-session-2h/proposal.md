## Why

Tras un rato sin usar QAScope (cambiar de pestaña, irse a comer, dejar el modal abierto), el usuario vuelve y aparece `/login`. No hay un temporizador de inactividad que cierre la sesión: el ID token de Firebase dura ~1 hora y, si la pestaña estuvo dormida, al despertar un `checkAuth`/`checkError` prematuro trata la renovación fallida o el usuario nulo como logout. Se necesita una garantía explícita: **mínimo 2 horas sin uso, al volver sigues dentro**.

## What Changes

- Se valida y se documenta que **no se puede alargar el ID token a 2 horas** (lo fija Firebase). La sesión sí puede durar 2+ horas porque el refresh token persistido sigue vivo.
- Tras inactividad de al menos 2 horas, al volver a la pestaña el sistema renueva el ID token con el refresh persistido y **no redirige a login** solo por el tiempo sin uso.
- Si la pestaña sigue abierta pero el navegador congela timers, al recuperar foco/visibilidad se espera Auth y se renueva el token antes de declarar sesión muerta.
- Logout sigue ocurriendo solo por cierre explícito, usuario deshabilitado o refresh token revocado.
- **No** se añade un idle timeout de seguridad que cierre a las 2 horas. El “2 horas” es un **mínimo de supervivencia**, no un máximo.

## Capabilities

### New Capabilities

- `session-idle-window`: la sesión autenticada sobrevive al menos 2 horas de inactividad en el cliente y se restaura al volver, sin exigir un ID token de 2 horas.

### Modified Capabilities

_(ninguna — `auth-session` aún no está en `openspec/specs/` porque `stabilize-auth-session` no se ha archivado; este change no lo modifica para no chocar)_

## Impact

- Código: `src/firebase/auth.ts` (`setupAuthSessionMaintenance`, `checkAuth`, `checkError`, `ensureCurrentUser`); posible ajuste menor en `src/App.tsx` si el refetch al foco se adelanta a la renovación.
- Auth: Firebase Auth (email/password). El ID token sigue siendo ~1 h; se usa el refresh token persistido (IndexedDB).
- Relación: complementa `stabilize-auth-session` (falso logout al descongelar). Este change añade el criterio de **2 horas de no uso**.
- Fuera de alcance: JWT propio, cambiar la duración del ID token en Firebase Admin, idle timeout que cierre la sesión, 2FA, reglas de Firestore.
