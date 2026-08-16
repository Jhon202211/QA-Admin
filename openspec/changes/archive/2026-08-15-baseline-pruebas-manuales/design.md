## Context

QA-Admin no tenía specs de OpenSpec antes de este change (ver proposal.md - Why). No existe un spec previo con el que reconciliar: el contenido de `specs/pruebas-manuales/spec.md` se derivó por lectura directa del código fuente (no de la documentación de README, que es más informal y no está estructurada como requirements verificables), específicamente: `src/pages/TestCases/TestCasesPage.tsx`, `src/pages/TestCases/TestCaseEditPage.tsx`, `src/components/TestCases/HierarchicalView.tsx`, `ArchivedView.tsx`, `DraftsView.tsx`, `CreateTestCaseWizard.tsx`, `TestExecutionModal.tsx`, `EvidenceManager.tsx`/`EvidencePreview.tsx`, y los servicios `testCaseDraftService.ts` / `executionDraftService.ts` / `evidenceService.ts`.

## Goals / Non-Goals

**Goals:**
- Producir un spec que un desarrollador pueda leer y contrastar contra el comportamiento real del sistema sin necesidad de leer el código.
- Establecer el patrón de granularidad y de límites de capacidad ("capability boundary") que se replicará en los próximos baselines (planificación, automatización, módulo IA).

**Non-Goals:**
- No se busca cobertura exhaustiva de validaciones de UI, mensajes de error puntuales, ni estilos — eso quedó fuera por decisión explícita de granularidad "alto nivel".
- No se evalúa ni se propone ningún cambio de comportamiento; el spec describe el sistema tal como es hoy, no como debería ser.

## Decisions

**Una sola capacidad `pruebas-manuales`, sin separar `ejecucion-pruebas`.**
Se consideró partir la ejecución de casos (TestExecutionModal, evidencias, borradores de ejecución) en una capacidad aparte, ya que en código son componentes y flujos de usuario claramente distintos de la creación/gestión. Se decidió mantenerlos juntos por ahora porque comparten la misma entidad `TestCase` y el mismo ciclo de vida de borradores, y porque partir capacidades sin necesidad inmediata añade fricción al mantenimiento de specs en esta etapa temprana de adopción de SDD. Si el spec crece demasiado o ejecución empieza a evolucionar a un ritmo distinto de la creación, se puede extraer como capacidad propia en un change posterior (`MODIFIED` sobre `pruebas-manuales` + `ADDED` sobre `ejecucion-pruebas`).

**Granularidad "alto nivel" para los requirements.**
Cada requirement captura una regla de negocio o comportamiento observable (p. ej. "el archivado es a nivel de proyecto, no de caso individual"), no cada validación de formulario. Alternativa considerada: documentar exhaustivamente cada campo y validación — se descartó porque el volumen de detalle haría el spec frágil ante refactors menores de UI sin cambio de comportamiento real, y porque ralentizaría la adopción inicial del framework.

**El baseline se modela como un change ADDED, no como edición directa de `specs/`.**
Aunque técnicamente se podría haber escrito `openspec/specs/pruebas-manuales/spec.md` directamente, se optó por pasar por el flujo estándar de `change → archive` para que quede un registro histórico (en `changes/archive/`) de cómo y cuándo se estableció la línea base, y para validar el spec con `openspec validate` antes de que se vuelva la fuente de verdad.

## Risks / Trade-offs

- **[Riesgo] El spec puede quedar desalineado del código si el checklist de verificación (tasks.md) no se revisa con rigor** → Mitigación: la sección 1 de `tasks.md` lista una verificación puntual por requirement contra el archivo de código correspondiente antes de archivar.
- **[Riesgo] Bundlear ejecución dentro de `pruebas-manuales` puede hacer el spec difícil de mantener si ambos flujos crecen de forma independiente** → Mitigación: decisión revisitable explícitamente documentada arriba; no requiere cambio de código, solo un futuro change de reorganización de specs.
- **[Trade-off] La granularidad alto nivel deja fuera detalles como mensajes de error específicos o reglas de validación de campos individuales** → Aceptado conscientemente: esos detalles se pueden añadir incrementalmente vía `MODIFIED Requirements` en changes futuros si llegan a ser relevantes para el trabajo que se esté proponiendo.
