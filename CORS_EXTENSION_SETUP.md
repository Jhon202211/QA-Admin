# 🔧 Configuración de Extensión CORS para QAScope

## 📋 Descripción

Esta guía te ayudará a configurar la extensión de CORS necesaria para habilitar la grabación y ejecución real de pruebas de Playwright en QAScope.

## 🎯 ¿Por qué necesitas la extensión?

Las políticas de seguridad del navegador (CORS) limitan la capacidad de:
- Grabar eventos en múltiples pestañas
- Ejecutar scripts que interactúen con otros sitios
- Automatizar flujos complejos entre dominios

La extensión de CORS permite superar estas limitaciones para desarrollo y testing.

## 📦 Instalación de la Extensión

### Opción 1: Chrome Web Store (Recomendado)

1. **Abrir Chrome Web Store**
   - Ve a [Chrome Web Store](https://chrome.google.com/webstore)
   - Busca "Test CORS" o "CORS Unblock"

2. **Instalar la extensión**
   - Haz clic en "Agregar a Chrome"
   - Confirma la instalación

3. **Configurar la extensión**
   - Haz clic en el icono de la extensión en la barra de herramientas
   - Activa el toggle "ON"
   - Configura la lista blanca con los sitios que quieres probar

### Opción 2: Instalación Manual

1. **Descargar la extensión**
   - Busca "Test CORS" en GitHub
   - Descarga el archivo `.crx`

2. **Instalar en Chrome**
   - Ve a `chrome://extensions/`
   - Activa "Modo desarrollador"
   - Arrastra el archivo `.crx` a la página

## ⚙️ Configuración

### 1. Activar la Extensión

1. Haz clic en el icono de la extensión en la barra de herramientas
2. Activa el toggle "ON"
3. Verifica que el estado sea "Enabled"

### 2. Configurar Lista Blanca

1. Abre las opciones de la extensión
2. Agrega los dominios que quieres permitir:
   ```
   localhost:5173
   localhost:3000
   tu-sitio-de-prueba.com
   ```

### 3. Verificar Funcionalidad

1. Recarga la página de QAScope
2. Verifica que aparezca "✅ Extensión CORS disponible"
3. Prueba la grabación de eventos

## 🚀 Funcionalidades Habilitadas

### Con Extensión CORS:
- ✅ **Grabación Multi-pestaña**: Graba eventos en diferentes pestañas
- ✅ **Ejecución Cross-Origin**: Ejecuta scripts en múltiples sitios
- ✅ **Flujos Complejos**: Automatiza procesos entre dominios
- ✅ **Configuración Flexible**: Controla qué sitios permitir

### Sin Extensión CORS:
- ❌ Solo grabación en pestaña actual
- ❌ No ejecución cross-origin
- ❌ Flujos limitados a un solo sitio
- ❌ Restricciones de seguridad del navegador

## 🎙️ Uso del Grabador de Eventos

### Iniciar Grabación

1. Ve al editor de scripts en QAScope
2. Haz clic en "🎙️ Grabar Eventos"
3. La extensión se activará automáticamente
4. Navega por los sitios que quieres automatizar
5. Los eventos se grabarán automáticamente

### Tipos de Eventos Grabados

- **Clics**: Selección de botones, enlaces, elementos
- **Llenado de campos**: Inputs, textareas, selects
- **Navegación**: Cambios de URL
- **Esperas**: Pausas entre acciones
- **Capturas de pantalla**: Screenshots automáticos

### Detener Grabación

1. Haz clic en "⏹️ Detener Grabación"
2. Los eventos se convertirán en pasos de Playwright
3. Revisa y edita los pasos generados
4. Guarda el script

## ▶️ Ejecución de Scripts

### Con Extensión CORS

1. Selecciona un script para ejecutar
2. Haz clic en "▶️ Ejecutar"
3. La extensión se activará automáticamente
4. El script se ejecutará en una nueva pestaña
5. Puede interactuar con múltiples sitios

### Sin Extensión CORS

1. Solo se ejecutarán scripts en la pestaña actual
2. No se pueden ejecutar scripts cross-origin
3. Funcionalidad limitada

## 🔒 Consideraciones de Seguridad

### Uso Recomendado

- ✅ **Solo para desarrollo y testing**
- ✅ **Desactivar cuando no se use**
- ✅ **Configurar lista blanca apropiada**
- ✅ **Usar en entornos controlados**

### Precauciones

- ⚠️ **No usar en producción**
- ⚠️ **No activar permanentemente**
- ⚠️ **Revisar sitios en lista blanca**
- ⚠️ **Entender las implicaciones de seguridad**

## 🛠️ Solución de Problemas

### La extensión no se detecta

1. Verifica que esté instalada correctamente
2. Recarga la página de QAScope
3. Verifica que esté activada
4. Revisa la consola del navegador para errores

### La grabación no funciona

1. Verifica que la extensión esté activada
2. Comprueba la lista blanca
3. Asegúrate de estar en un sitio permitido
4. Revisa los permisos de la extensión

### Error de ejecución

1. Verifica que el script sea válido
2. Comprueba que los selectores existan
3. Asegúrate de que la extensión esté activada
4. Revisa la consola para errores específicos

## 📞 Soporte

Si tienes problemas con la configuración:

1. **Revisa esta documentación**
2. **Verifica la consola del navegador**
3. **Comprueba los permisos de la extensión**
4. **Contacta al equipo de desarrollo**

## 🔄 Actualizaciones

La extensión se actualiza automáticamente desde Chrome Web Store. Para actualizaciones manuales:

1. Ve a `chrome://extensions/`
2. Busca la extensión "Test CORS"
3. Haz clic en "Actualizar"

---

**Nota**: Esta extensión es esencial para el funcionamiento completo de las funcionalidades de grabación y ejecución de QAScope. Sin ella, las capacidades estarán limitadas. 