# session-idle-window Specification

## Purpose

Garantiza que un usuario autenticado que deja QAScope inactivo al menos dos horas no sea enviado a login solo por ese tiempo sin uso, y que al volver la sesión se restaure.

## Requirements

### Requirement: Sesión sobrevive al menos dos horas de inactividad
El sistema SHALL mantener autenticado al usuario si ha estado inactivo al menos dos horas y la credencial persistida sigue siendo válida. El sistema MUST NOT redirigir a login únicamente porque pasó ese tiempo sin interacción.

#### Scenario: Volver tras dos horas sin usar la pestaña
- **WHEN** un usuario autenticado deja la aplicación sin usarla durante al menos dos horas y regresa a la pestaña
- **THEN** el sistema lo mantiene autenticado y no lo redirige a login

#### Scenario: Recargar tras dos horas con sesión persistida
- **WHEN** un usuario autenticado recarga la aplicación después de al menos dos horas desde el último uso y existe sesión persistida válida
- **THEN** el sistema restaura la sesión y no muestra login

### Requirement: La inactividad no equivale a cierre de sesión
El sistema SHALL NOT tratar el paso del tiempo sin clics, teclas o foco como un logout. El logout SHALL ocurrir solo por cierre explícito, usuario deshabilitado o credencial revocada por el proveedor de identidad.

#### Scenario: Pestaña en segundo plano sin actividad
- **WHEN** el navegador suspende la pestaña y el usuario no interactúa durante el periodo de inactividad cubierto
- **THEN** al recuperar el foco el sistema renueva la sesión persistida si sigue vigente y no envía a login

### Requirement: Login sigue disponible cuando no hay sesión
El sistema SHALL mostrar login en la primera visita sin sesión persistida y tras un logout explícito, igual que hoy.

#### Scenario: Logout explícito tras estar inactivo
- **WHEN** el usuario cierra sesión a propósito, aunque haya estado inactivo antes
- **THEN** el sistema termina la sesión y muestra login
