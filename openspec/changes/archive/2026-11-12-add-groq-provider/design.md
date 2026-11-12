## Context

El agente de IA llama a un proveedor de lenguaje mediante `callLLM` y `callChatCompletion` en `src/services/aiService.ts`. Todos los proveedores existentes (OpenAI, Ollama Cloud, DeepSeek) exponen el endpoint `/chat/completions` en formato compatible con OpenAI. Groq también lo hace, por lo que no se requiere un cliente nuevo.

## Goals / Non-Goals

**Goals:**
- Permitir usar Groq con la misma interfaz de configuración que los demás proveedores.
- Reutilizar el flujo de llamada y parseo existente sin bifurcaciones nuevas.

**Non-Goals:**
- No se implementa streaming ni la selección automática de modelos.
- No se cambia el prompt ni el contrato JSON de la respuesta.
- No se migra la configuración de Ollama ni se elimina su código.

## Decisions

- **Reutilizar el cliente OpenAI-compatible.** Groq se añade a `LLMProvider` con base `https://api.groq.com/openai/v1`. Alternativa descartada: un cliente específico, innecesario porque el formato es el mismo.
- **Enrutar por proxy.** Se añade `/proxy/groq/openai/v1` en `PROXY_PATHS`, el proxy de Vite (`/proxy/groq`) y el servicio `groq` en `functions/proxy/[[path]].js`. Así el navegador no llama directo a `api.groq.com` y no hay errores de CORS en desarrollo ni en producción.
- **Sin `response_format: json_object` para Groq.** Solo OpenAI y DeepSeek reciben el modo JSON. Alternativa descartada: activarlo para Groq, porque algunos modelos responden 400 si no lo soportan. El parseo tolerante ya extrae JSON envuelto en fences o texto.
- **Modelo por defecto `llama-3.3-70b-versatile`** con una lista acotada de modelos en la UI (Llama 3.3 70B, GPT-OSS 120B y 20B, Qwen3 32B, Llama 3.1 8B). Los nombres de modelo de Groq pueden cambiar; la lista se revisa cuando se depreque alguno.
- **Credenciales en `localStorage`**, igual que los demás proveedores, bajo los campos `groqApiKey` y `groqModel`.

## Risks / Trade-offs

- [Modelos deprecados por Groq] → El usuario recibe un error de la API y puede cambiar el modelo en el selector; la lista se mantiene manualmente.
- [Límites del nivel gratuito (tokens por minuto)] → Error 429 visible al usuario; se sugiere un modelo más pequeño o esperar.
- [API key en el navegador] → Mismo riesgo que los demás proveedores; aceptado porque la app no tiene backend para llamadas LLM.
