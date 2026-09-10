## 1. Renovación al volver de inactividad

- [x] 1.1 En `setupAuthSessionMaintenance`, al foco/visibilidad/online: esperar `ensureCurrentUser` y renovar con `getIdToken(false)` antes de cualquier expulsión
- [x] 1.2 En `checkAuth`/`checkError`, si hay sesión persistida y el ID token está vencido, renovar y no hacer `reject` solo por el tiempo inactivo
- [x] 1.3 Confirmar que no existe ni se añade un timer que haga `signOut` por inactividad

## 2. Criterio de 2 horas

- [x] 2.1 Dejar documentado en el mantenimiento de sesión que el mínimo de supervivencia es 2 h (no la duración del ID token)
- [x] 2.2 Si el refetch al foco en `App.tsx` corre antes de renovar Auth, retrasarlo lo suficiente para no disparar `unauthenticated` al volver de un idle largo

## 3. Verificación

- [x] 3.1 Tras ≥ 2 h sin uso (o simular ID token vencido con sesión persistida), volver a la pestaña: no redirige a login
- [x] 3.2 Recargar con sesión persistida tras ese idle: restaura sesión
- [x] 3.3 Primera visita y logout explícito: sí muestran login
