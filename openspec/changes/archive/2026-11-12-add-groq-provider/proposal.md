## Why

El plan de Ollama Cloud expiró y el agente de IA quedó sin proveedor de lenguaje utilizable. Groq ofrece una API compatible con OpenAI, con un nivel gratuito y respuestas rápidas, por lo que se integra como alternativa para la generación de casos de prueba. La integración ya está implementada y fue probada por el equipo; este change documenta el comportamiento resultante en la especificación.

## What Changes

- Se añade Groq como proveedor de lenguaje seleccionable en la configuración del agente de IA, junto a OpenAI, Ollama Cloud y DeepSeek.
- El usuario configura la API key de Groq y elige el modelo desde una lista de modelos soportados.
- Las peticiones a Groq se enrutan a través del proxy (Vite en desarrollo, Cloudflare Pages Functions en producción) para evitar errores de CORS.
- No se fuerza el modo JSON (`response_format`) con Groq, porque no todos sus modelos lo soportan; la respuesta se procesa con el parseo tolerante existente.
- No hay cambios en el contrato de generación de casos ni en la lógica de parseo.

## Capabilities

### New Capabilities
- `llm-provider-config`: configuración del proveedor de lenguaje del agente de IA (proveedores disponibles, credenciales, modelo, enrutamiento por proxy y comportamiento por proveedor).

### Modified Capabilities
_(ninguna — `ai-test-generation` mantiene su contrato de generación; el cambio de proveedor no altera la forma de la sugerencia.)_

## Impact

- **Código afectado**: `src/services/aiService.ts` (tipo `LLMProvider`, `PROVIDER_DEFAULTS`, `PROXY_PATHS`, `getLLMConfig`), `src/pages/Configuration/ConfigurationPage.tsx` (tarjeta, campos y selector de modelo de Groq), `vite.config.ts` (proxy `/proxy/groq`) y `functions/proxy/[[path]].js` (servicio `groq`).
- **Dependencias externas**: API de Groq (`https://api.groq.com/openai/v1`). Requiere una API key válida.
- **Datos**: la configuración se guarda en `localStorage` bajo `qaScopeConfig`, con los nuevos campos `groqApiKey` y `groqModel`.
- **Usuario**: puede cambiar de proveedor sin modificar el resto del flujo de generación de casos.
