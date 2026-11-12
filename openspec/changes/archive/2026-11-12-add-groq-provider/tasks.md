## 1. Implementación

- [x] 1.1 Añadir `groq` a `LLMProvider`, `PROVIDER_DEFAULTS` y `PROXY_PATHS` en `src/services/aiService.ts`.
- [x] 1.2 Leer `groqApiKey` y `groqModel` en `getLLMConfig` y resolver la URL base con `resolveBaseUrl`.
- [x] 1.3 Añadir la tarjeta de Groq, el campo de API key y el selector de modelo en `ConfigurationPage.tsx`.
- [x] 1.4 Añadir el proxy `/proxy/groq` en `vite.config.ts`.
- [x] 1.5 Añadir el servicio `groq` en `functions/proxy/[[path]].js`.

## 2. Verificación

- [x] 2.1 Confirmar que `tsc -b` compila sin errores de tipos.
- [x] 2.2 Confirmar que la generación de casos funciona con Groq configurado (prueba manual del equipo).
