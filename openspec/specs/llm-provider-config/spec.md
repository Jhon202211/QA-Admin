## Purpose

Define cómo el agente de IA selecciona y usa el proveedor de lenguaje configurado en Configuración (OpenAI, Ollama Cloud, DeepSeek y Groq), incluyendo credenciales, modelo, enrutamiento por proxy y comportamiento específico de cada proveedor.

## Requirements

### Requirement: Groq como proveedor de lenguaje seleccionable
El sistema SHALL ofrecer Groq como proveedor de lenguaje del agente de IA, junto a OpenAI, Ollama Cloud y DeepSeek. Cuando el usuario selecciona Groq, el sistema SHALL mostrar un campo para la API key y un selector de modelo.

#### Scenario: Selección de Groq en Configuración
- **WHEN** el usuario activa el agente de IA y selecciona el proveedor Groq en Configuración
- **THEN** el sistema muestra el campo "API Key de Groq" y el selector de modelo con los modelos soportados

#### Scenario: Modelo por defecto
- **WHEN** el usuario selecciona Groq y no ha elegido un modelo
- **THEN** el sistema usa `llama-3.3-70b-versatile` como modelo

### Requirement: Uso de Groq con API key configurada
El sistema SHALL llamar a la API de Groq en el endpoint compatible con OpenAI (`/chat/completions`) cuando el proveedor activo es Groq y hay una API key no vacía, usando el modelo seleccionado. Si la API key está vacía, el sistema SHALL tratar el agente como sin proveedor configurado.

#### Scenario: Generación de casos con Groq
- **WHEN** el usuario genera casos de prueba con el proveedor Groq configurado y una API key válida
- **THEN** el sistema envía la solicitud al modelo seleccionado de Groq y muestra la sugerencia resultante

#### Scenario: API key vacía
- **WHEN** el proveedor activo es Groq y el campo de API key está vacío
- **THEN** el sistema usa la simulación en lugar de llamar a Groq

### Requirement: Enrutamiento de Groq por proxy
El sistema SHALL enrutar las peticiones a Groq a través del proxy de la aplicación (`/proxy/groq`) cuando la URL base configurada es la URL por defecto de Groq, tanto en desarrollo (Vite) como en producción (Cloudflare Pages Functions).

#### Scenario: Petición desde el navegador en desarrollo
- **WHEN** el usuario genera casos con Groq en el servidor de desarrollo
- **THEN** la petición sale hacia `/proxy/groq` y el proxy la reenvía a `https://api.groq.com`, sin error de CORS

#### Scenario: Petición desde producción
- **WHEN** el usuario genera casos con Groq en la versión desplegada
- **THEN** la función de proxy reenvía la petición a `https://api.groq.com` y devuelve la respuesta al navegador

### Requirement: Modo JSON no forzado para Groq
El sistema SHALL NOT enviar `response_format: json_object` en las peticiones a Groq. La respuesta SHALL procesarse con el parseo tolerante de JSON definido para la generación de casos.

#### Scenario: Petición a Groq sin modo JSON
- **WHEN** el sistema llama a Groq para generar casos
- **THEN** el cuerpo de la petición no incluye `response_format`

#### Scenario: Respuesta envuelta en markdown desde Groq
- **WHEN** el modelo de Groq devuelve el JSON envuelto en un bloque markdown
- **THEN** el sistema extrae el JSON y muestra la sugerencia
