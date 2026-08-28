## 1. Verificación del spec contra el código actual

- [x] 1.1 Confirmar que `generateTestCasesFromUserStory` llama al LLM cuando hay proveedor configurado y usa simulación cuando no, como el requirement de generación.
- [x] 1.2 Confirmar que el prompt y el parseo aceptan objeto raíz de un módulo o colección (`guides` y wrappers) según el requirement de contrato JSON.
- [x] 1.3 Confirmar que el parseo tolera fences markdown, comas colgantes, JSON concatenado y truncado con objetos internos completos, y que falla con error de JSON inválido si no hay nada extraíble.
- [x] 1.4 Confirmar que la fusión une módulos/submódulos con ` / `, concatena casos y condiciones, y falla si no hay `test_cases` o faltan campos tras el merge.
- [x] 1.5 Confirmar que `AIAgent.tsx` muestra la sugerencia unificada o el error de generación, sin un segundo camino de parseo.

## 2. Cierre del retrospec

- [x] 2.1 Ajustar `specs/ai-test-generation/spec.md` si alguna verificación de la sección 1 encuentra una discrepancia con el código.
- [x] 2.2 Archivar este change (`openspec archive retrospec-llm-json-parsing`) para publicar la capacidad en `openspec/specs/ai-test-generation/`.
