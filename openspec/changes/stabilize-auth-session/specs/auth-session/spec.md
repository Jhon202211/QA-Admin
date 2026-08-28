## Purpose

Mantiene la sesión autenticada del usuario en el cliente de forma durable: sobrevive recargas, nuevas pestañas y el retorno tras inactividad breve, y solo envía a login cuando la credencial es irrecuperable.

## ADDED Requirements

### Requirement: Sesión persistida entre recargas y pestañas
El sistema SHALL restaurar la sesión autenticada desde el almacenamiento persistente del navegador al cargar la aplicación, de modo que el usuario no deba volver a iniciar sesión solo por recargar, abrir otra pestaña del mismo origen o haber estado unos minutos en otra pestaña.

#### Scenario: Recargar con sesión vigente
- **WHEN** un usuario autenticado recarga la aplicación
- **THEN** el sistema lo mantiene autenticado y no lo redirige a la pantalla de login

#### Scenario: Volver de otra pestaña del navegador
- **WHEN** un usuario autenticado deja la aplicación en segundo plano unos minutos y vuelve a la pestaña sin recargar
- **THEN** el sistema lo mantiene autenticado y no lo redirige a la pantalla de login

### Requirement: Fallos transitorios no cierran la sesión
El sistema SHALL NOT redirigir a login cuando Auth aún no ha rehidratado al usuario, cuando Firestore responde como no autenticado de forma puntual, o cuando hay un fallo de red o de reconexión, si la sesión persistida todavía puede recuperarse.

#### Scenario: Firestore no autenticado al recuperar el foco
- **WHEN** al volver a la pestaña una lectura de datos falla por falta de autenticación puntual y la sesión persistida sigue disponible
- **THEN** el sistema recupera la sesión, reintenta la lectura y no redirige a login

#### Scenario: Usuario nulo un instante al navegar
- **WHEN** una comprobación de sesión ve al usuario ausente de forma momentánea tras descongelar la pestaña o cambiar de vista
- **THEN** el sistema espera a que Auth se rehidrate y no redirige a login si el usuario reaparece

#### Scenario: Fallo de red al verificar el token
- **WHEN** una renovación o verificación de token falla por red, timeout o indisponibilidad temporal
- **THEN** el sistema mantiene la sesión local y no redirige a login

### Requirement: Permisos insuficientes no equivalen a sesión caducada
El sistema SHALL NOT tratar un rechazo de autorización (permiso denegado sobre un recurso) como cierre de sesión.

#### Scenario: Lectura denegada por reglas
- **WHEN** una operación de datos falla porque el usuario autenticado no tiene permiso sobre el recurso
- **THEN** el sistema muestra el error de datos y mantiene al usuario autenticado

### Requirement: Login solo cuando la sesión es irrecuperable
El sistema SHALL redirigir a la pantalla de login únicamente cuando no hay sesión persistida tras completar la restauración, cuando el usuario cierra sesión de forma explícita, o cuando el proveedor de identidad indica que la credencial fue revocada o el usuario fue deshabilitado.

#### Scenario: Cierre de sesión explícito
- **WHEN** un usuario elige cerrar sesión
- **THEN** el sistema termina la sesión y muestra la pantalla de login

#### Scenario: Credencial revocada
- **WHEN** el proveedor de identidad indica que el usuario está deshabilitado o que el token de renovación fue revocado
- **THEN** el sistema redirige a la pantalla de login

#### Scenario: Primera visita sin sesión
- **WHEN** un usuario abre la aplicación y no existe una sesión persistida
- **THEN** el sistema muestra la pantalla de login
