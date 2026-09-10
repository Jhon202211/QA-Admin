## Context

See proposal.md - Why. Firebase Auth emite un **ID token de ~1 hora** (no configurable desde el cliente) y un **refresh token** de larga duración en IndexedDB. No existe un idle timer que haga `signOut` por no uso. Lo que echa al usuario es: pestaña congelada → timers de `setInterval` (20 min) no corren → ID token vence → al volver, `checkAuth`/`checkError` ven null o `unauthenticated` y hacen `reject()`.

`stabilize-auth-session` ya suaviza el falso logout al descongelar. Este change fija el **mínimo de 2 h de inactividad** como criterio de aceptación y cierra los huecos que queden para ese plazo.

## Goals / Non-Goals

**Goals:**
- Tras ≥ 2 h sin uso, volver o recargar no manda a login si el refresh token sigue válido.
- Al recuperar foco/visibilidad, renovar el ID token **antes** de que react-admin declare sesión muerta.
- Dejar claro en código/comentario que 2 h no es la duración del ID token.

**Non-Goals:**
- Hacer que el ID token dure 2 horas (imposible en el cliente; Firebase no lo expone).
- Idle timeout que **cierre** la sesión a las 2 h (sería lo contrario de lo pedido).
- Custom token / JWT propio / Cloud Functions para emitir tokens más largos.
- Cambiar `stabilize-auth-session` (sigue su propio ciclo).

## Decisions

### 1. “2 horas” = supervivencia de sesión, no TTL del ID token
La garantía es: el usuario no pierde la sesión por estar 2 h quieto. El mecanismo es renovar el ID token con el refresh persistido al despertar. No se pide a Firebase un ID token de 7200 s.

**Alternativa:** custom token de 2 h vía Admin SDK. Se rechaza: backend nuevo, rotación, y no evita el null al descongelar.

### 2. Despertar Auth antes de expulsar, también después de inactividad larga
Al `visibilitychange`/`focus`/`online`: `ensureCurrentUser` → `getIdToken(false)` (el SDK refresca si el token venció). `checkAuth` no hace `reject` si hay usuario persistido aunque el ID token esté caducado; primero intenta renovar.

Si el refresh falla por red, no expulsar (alineado con `stabilize-auth-session`). Si falla por `user-disabled` / refresh revocado, sí login.

**Alternativa:** bajar el intervalo de 20 min a 5 min. Insuficiente: Chrome congela timers en background; a las 2 h el intervalo no corrió.

### 3. No inventar un “keep-alive” cada 2 h en background
Un worker que pinge cada 50 min no es fiable en pestañas ocultas. La renovación al **volver** es la palanca real. El intervalo existente se mantiene como ayuda cuando la pestaña sigue visible y ociosa (usuario leyendo sin mover el mouse).

### 4. Criterio de prueba
Aceptación: dejar la pestaña ≥ 2 h (o simular ID token vencido + `currentUser` aún en IndexedDB) y confirmar que no hay redirect a `/login`. Primera visita y logout explícito siguen yendo a login.

## Risks / Trade-offs

- [No se puede alargar el ID token] → La UI puede tener 1 s de “rehidratando”; no es logout. Aceptado.
- [Refresh token revocado a las 2 h] → Logout legítimo. No se oculta.
- [Solapa con stabilize-auth-session] → Este change solo añade la garantía de 2 h y ajustes si la gracia de 5 s no basta tras un freeze largo. No reescribe persistencia.
- [Pestaña visible pero sin eventos 2 h] → El intervalo de 20 min debería renovar; si el OS suspende, el despertar al primer click/foco cubre.

## Migration Plan

Solo frontend. Deploy Pages. Quien ya está logueado no hace nada.

Rollback: revertir el change. Sin migración de datos.
