## Why

QA-Admin no tiene specs en OpenSpec todavía: el proyecto está construido y en producción, pero su comportamiento nunca se documentó como requirements. Antes de usar SDD para features y ajustes futuros, se necesita una línea base que capture lo que el sistema hace hoy. Este change documenta retroactivamente el módulo **Pruebas Manuales** (Proyecto → Módulo → Submódulo → Tipo), el módulo más central del sistema y el punto de partida elegido para adoptar el framework.

Este es un change de documentación, no de desarrollo: no se modifica código ni comportamiento. El objetivo es que `specs/pruebas-manuales/spec.md` quede como la fuente de verdad verificada contra el código actual.

## What Changes

- Se documenta la capacidad `pruebas-manuales` completa: entidad de caso de prueba, jerarquía de organización, los tres flujos de creación, borradores de construcción, clonación, ejecución con evidencias, borradores de ejecución, archivado a nivel de proyecto, y vista de lista con filtros/exportación.
- No hay cambios de código ni de comportamiento — es una fotografía del sistema existente.

## Capabilities

### New Capabilities
- `pruebas-manuales`: gestión del ciclo de vida completo de un caso de prueba manual — creación (wizard, formulario directo o sugerencia IA), organización jerárquica, ejecución con evidencias, borradores reanudables (de construcción y de ejecución), clonación, archivado por proyecto, y listado/exportación.

### Modified Capabilities
_(ninguna — no existen specs previas en el proyecto)_

## Impact

- **Código afectado**: ninguno (change de solo documentación).
- **Áreas de referencia** (para verificar que el spec coincide con el código): `src/pages/TestCases/`, `src/components/TestCases/`, `src/services/testCaseDraftService.ts`, `src/services/executionDraftService.ts`, `src/services/evidenceService.ts`, colecciones Firestore `test_cases` y `test_case_drafts`.
- **Precedente**: establece el patrón que se repetirá para documentar el resto de módulos del sistema (automatización, planificación, IA, etc.) en changes de baseline futuros.
