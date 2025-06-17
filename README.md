# QA Admin Dashboard

Panel de administración para gestionar pruebas de calidad y resultados de testing.

## Variables de entorno

Debes definir las siguientes variables de entorno para la configuración de Firebase (puedes agregarlas en un archivo `.env` o directamente en `src/firebase/config.ts`):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Ejemplo de archivo `.env`:

```
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

Luego, asegúrate de que `src/firebase/config.ts` lea estas variables usando `import.meta.env`.

## Configuración Inicial

Para comenzar a trabajar con el proyecto, necesitas:

1. Crear un proyecto en Firebase y obtener las credenciales
2. Actualizar el archivo `src/firebase/config.ts` con tus credenciales de Firebase
3. Configurar las reglas de seguridad en Firebase

## Funcionalidades Implementadas

- Autenticación de usuarios
- Dashboard básico
- Visualización de resultados de pruebas

## Próximas Funcionalidades

### Prioridad Alta
- [ ] Agregar más funcionalidades al dashboard
- [ ] Crear formularios para agregar/editar pruebas
- [ ] Implementar la visualización de detalles de las pruebas
- [ ] Agregar gráficos y estadísticas

### Mejoras Futuras
- [ ] Sistema de notificaciones
- [ ] Exportación de reportes
- [ ] Integración con herramientas de testing
- [ ] Gestión de usuarios y permisos

## Tecnologías Utilizadas

- React
- TypeScript
- Vite
- Firebase
- Material-UI

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```

## Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request
