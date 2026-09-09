## Why

Tras un corte de red breve, el modal de ejecución puede hidratar un estado incompleto y el autosave (last-write-wins) lo escribe encima del caso y del borrador llenos. El usuario pierde resultados, notas y evidencias sin aviso y sin versión anterior a la que volver.

## What Changes

- Antes de persistir una ejecución (borrador remoto, localStorage o caso `test_cases`), el sistema compara la “riqueza” de lo que está en pantalla con lo ya guardado.
- Si lo nuevo está más vacío (menos pasos evaluados, menos notas, menos evidencias), no se pisa. Se conserva la versión más completa.
- Tras un corte de red momentáneo, el autosave no escribe a ciegas al reconectar: espera comparar con lo persistido y, si lo local es más pobre, descarta ese write.
- El indicador de guardado refleja cuando se evitó un overwrite (sin pretender que el estado pobre ya quedó guardado).

## Capabilities

### New Capabilities

- `execution-overwrite-guard`: protección de ejecuciones frente a overwrite por un estado más vacío, en especial al recuperar la red.

### Modified Capabilities

- `pruebas-manuales`: el autosave y los borradores de ejecución dejan de ser last-write-wins a ciegas; no confirman un estado más pobre que el persistido.

## Impact

- Código: `src/components/TestCases/TestExecutionModal.tsx`, posiblemente `src/services/executionDraftService.ts`.
- Datos: mismas colecciones `test_cases` y `execution_drafts`; sin migración.
- Fuera de alcance: historial de N versiones en la UI de Borradores, rescate PITR de CP6622, borradores de construcción (wizard/IA).
