# QA Admin Dashboard

Panel de administración para gestionar pruebas de calidad y resultados de testing.

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
