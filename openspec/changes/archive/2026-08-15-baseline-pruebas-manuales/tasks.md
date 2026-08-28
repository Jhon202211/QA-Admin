## 1. Verificación del spec contra el código actual

- [x] 1.1 Confirmar que la estructura jerárquica (Proyecto → Módulo/Categoría → Submódulo) en `HierarchicalView.tsx` coincide con los requirements de organización del spec.
- [x] 1.2 Confirmar que los tres caminos de creación (wizard, formulario directo, sugerencia IA) siguen produciendo la misma estructura de `TestCase` descrita en el spec.
- [x] 1.3 Confirmar que `testCaseDraftService.ts` y el flujo de "Continuar creación" en `DraftsView.tsx` coinciden con el requirement de borradores de construcción.
- [x] 1.4 Confirmar que la acción de clonar en `HierarchicalView.tsx` coincide con el requirement de clonación.
- [x] 1.5 Confirmar que `TestExecutionModal.tsx` (resultado por caso, evidencia por paso) coincide con el requirement de ejecución.
- [x] 1.6 Confirmar que `executionDraftService.ts` y el flujo de "Continuar ejecución" coinciden con el requirement de borradores de ejecución.
- [x] 1.7 Confirmar que `EvidenceManager.tsx`/`EvidencePreview.tsx` coinciden con el requirement de gestión de evidencias.
- [x] 1.8 Confirmar que el archivado en `ArchivedView.tsx` es efectivamente a nivel de proyecto (no de caso individual), como describe el spec.
- [x] 1.9 Confirmar que los filtros y `ExportButton` de la vista de lista en `TestCasesPage.tsx` coinciden con el requirement de listado.

## 2. Cierre del baseline

- [x] 2.1 Ajustar `specs/pruebas-manuales/spec.md` si alguna verificación de la sección 1 encuentra una discrepancia con el código. (Sin discrepancias — no se requirieron ajustes.)
- [x] 2.2 Archivar este change (`openspec archive baseline-pruebas-manuales`) para que el spec pase a ser la línea base oficial en `openspec/specs/`.
