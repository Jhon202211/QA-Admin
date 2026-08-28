## Context

El código de generación ya está en `sddscope` vía merge de `master` (`0b3b306` en `src/services/aiService.ts`). Este design describe cómo funciona ese arreglo, no cómo implementarlo de nuevo. Ver proposal.md para el porqué del retrospec. El consumidor observable es `AIAgent.tsx`: una llamada, una sugerencia o un error.

Antes del fix, la extracción tomaba el primer `{` y el último `}`, y `JSON.parse` debía producir exactamente un objeto con `module`, `submodule`, `test_type` y `test_cases`. Eso rompía con fences, objetos concatenados, arrays, wrappers `{ "guides": [...] }` y respuestas cortadas.

## Goals / Non-Goals

**Goals:**
- Dejar registradas las decisiones de parseo y fusión que el código ya aplica, para que un change futuro no las “repare” por accidente.
- Separar el contrato del agente (`ai-test-generation`) del ciclo de vida de casos en `pruebas-manuales`.

**Non-Goals:**
- No reescribir el parser ni cambiar `max_tokens`, JSON mode ni el prompt.
- No documentar el chatbot OpenLaila ni la base de conocimiento más allá de que sus chunks se inyectan en el prompt de generación.
- No decidir si el merge de módulos es el producto deseado a largo plazo (queda como comportamiento actual).

## Decisions

**Normalizar a una sola sugerencia, no fallar ni mostrar N resultados.**
El modelo a veces cubre varios módulos. Alternativas: rechazar arrays/wrappers; mostrar varias sugerencias en la UI. Se eligió unwrap + merge porque `AIAgent` solo consume un objeto. Coste: módulo/submódulo unidos con ` / ` y casos de contextos distintos en la misma lista.

**Recuperar JSON completo dentro de texto sucio o truncado, no reintentar la llamada.**
Si `finish_reason` es `length`, se avisa en consola y se intenta extraer valores JSON balanceados; si un valor está abierto, se avanza un carácter para rescatar objetos internos cerrados. Alternativa: retry o streaming. Se priorizó no perder el trabajo ya generado.

**Ampliar el prompt y `max_tokens` (8192) además del parser.**
El prompt pide objeto raíz (nunca array suelto) y permite `{ "guides": [...] }`. OpenAI/DeepSeek siguen usando `response_format: json_object`. El parser cubre incumplimientos del prompt (fences, concatenación, wrappers extra).

**Claves de wrapper conocidas.**
Además de `guides`, se aceptan `items`, `results`, `suggestions`, `data` y `modules`. Primera clave presente gana. Es un compromiso entre tolerancia y no escanear todo el objeto.

## Risks / Trade-offs

- **[Riesgo] Merge silencioso mezcla módulos** → Mitigación: el usuario puede editar proyecto/módulo/submódulo en el agente antes de crear casos; un change futuro puede exigir un módulo y fallar si hay varios.
- **[Riesgo] Truncado sigue perdiendo casos al final de la respuesta** → Mitigación: `max_tokens` alto y recuperación de objetos cerrados; no hay retry. Aceptado.
- **[Riesgo] Extraer el primer JSON balanceado en texto ruidoso puede tomar un objeto interno** → Mitigación: se intenta `JSON.parse` del texto limpio primero; la extracción por balanceo es respaldo.
- **[Trade-off] Parser más complejo que un único `JSON.parse`** → Aceptado a cambio de menos fallos visibles en generación.

## Migration Plan

Nada que desplegar: el comportamiento ya está en la rama. El cierre de este change es archivar para publicar `openspec/specs/ai-test-generation/spec.md`. Rollback del producto sería revertir `0b3b306`, no este retrospec.

## Open Questions

- ¿El merge de varios módulos debe seguir siendo el contrato, o un change posterior debe forzar un módulo y un error explícito?
