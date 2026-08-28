## Why

El agente de generación de casos fallaba cuando el LLM devolvía markdown, varios objetos JSON, un array o una respuesta truncada, porque el parseo solo aceptaba un único objeto válido. El arreglo ya está en `master` (`0b3b306`, 27 ago 2026) y ahora también en `sddscope`, pero no pasó por OpenSpec: `pruebas-manuales` solo cubre aceptar una sugerencia, no el contrato de generación ni la tolerancia del parseo.

## What Changes

- Se documenta retroactivamente el comportamiento **ya desplegado** de generación de casos: prompt, parseo robusto, unwrap/merge de varias guías y cuota de tokens.
- No se modifica código ni comportamiento — es una fotografía del sistema tras `0b3b306`.
- Se introduce la capacidad `ai-test-generation` para el contrato entre el LLM y la UI del agente, que el baseline de pruebas manuales no cubría.

## Capabilities

### New Capabilities
- `ai-test-generation`: generación de una sugerencia de casos de prueba a partir de una historia de usuario; el sistema acepta respuestas JSON del LLM en formas imperfectas (fences markdown, varios objetos, wrappers, truncado) y las normaliza a una sola sugerencia, o falla con un error claro si no hay estructura usable.

### Modified Capabilities
_(ninguna — `pruebas-manuales` sigue describiendo la aceptación de una sugerencia ya generada; este change cubre el paso anterior.)_

## Impact

- **Código afectado**: ninguno en este change (solo documentación). El comportamiento de referencia vive en `src/services/aiService.ts` (`callLLM`, `parseLLMJson`, `unwrapSuggestions`, `mergeSuggestions`) y se consume desde `src/components/TestCases/AIAgent.tsx`.
- **Usuario**: deja de ver un error genérico de JSON inválido en los casos cubiertos; si el modelo cubre varios módulos, ve una sola sugerencia con módulos/submódulos unidos por ` / ` y casos concatenados.
- **Cierre esperado**: archivar el change para que `openspec/specs/ai-test-generation/spec.md` quede como línea base del agente.
