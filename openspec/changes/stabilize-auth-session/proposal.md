## Why

La sesión de QAScope se corta de forma abrupta: react-admin redirige a `/login` en minutos, sobre todo al volver de otra pestaña y a veces sin recargar. El corte no es la falta de un refresh token (Firebase Auth ya lo gestiona) ni el ID token de ~1 hora: `checkAuth` y `checkError` tratan un `currentUser` nulo o un `unauthenticated` puntual —típico al descongelar la pestaña— como sesión muerta. Hay que dejar de expulsar al usuario mientras la credencial aún se puede recuperar.

## What Changes

- La sesión persistida (IndexedDB / Firebase Auth) se restaura una sola vez al arrancar, sin volver a cambiar el tipo de persistencia en cada carga.
- Tras volver a la pestaña o recuperar red, el sistema espera a que Auth se rehidrate y reintenta Firestore antes de declarar al usuario deslogueado.
- `checkAuth` y `checkError` solo redirigen a `/login` cuando la sesión es irrecuperable (usuario deshabilitado, refresh token revocado, logout explícito), no ante el primer `null`, `unauthenticated` o fallo de red.
- El refresco forzado del ID token no corre en carrera con las queries al recuperar el foco.
- **No** se implementa un refresh token propio ni se sustituye Firebase Auth.

## Capabilities

### New Capabilities
- `auth-session`: ciclo de vida de la sesión en el cliente — persistencia, recuperación al volver a la pestaña, y criterio para expulsar a login frente a fallos transitorios.

### Modified Capabilities
_(ninguna — `pruebas-manuales` y `ai-test-generation` no cambian requisitos)_

## Impact

- **Código**: `src/firebase/auth.ts`, `src/firebase/config.ts`, `src/main.tsx`; posible ajuste de `QueryClient` / refetch al foco en `src/App.tsx`; `src/firebase/dataProvider.ts` si hace falta reintentar `unauthenticated`.
- **Auth**: Firebase Auth (email/password) + react-admin `authProvider` (`requireAuth`).
- **Datos**: Firestore (SDK web, long polling). Sin cambios de reglas ni de backend.
- **Fuera de alcance**: login nuevo, JWT propio, “Recordar correo”, idle timeout de seguridad.
