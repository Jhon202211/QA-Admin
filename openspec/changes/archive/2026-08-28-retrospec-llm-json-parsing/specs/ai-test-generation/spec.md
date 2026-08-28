## Purpose

Genera una sugerencia de casos de prueba a partir de una historia de usuario y del contexto de conocimiento, normalizando la respuesta del modelo de lenguaje a un único resultado usable por el agente de IA.

## ADDED Requirements

### Requirement: Generación de sugerencia desde historia de usuario
El sistema SHALL, cuando el usuario solicita generar casos y hay un proveedor de lenguaje configurado, enviar la historia (y criterios, reglas o bugs si se informaron) al modelo y devolver una sugerencia con proyecto, módulo, submódulo, tipo de prueba y al menos un caso de prueba. Si no hay proveedor configurado, el sistema SHALL devolver una sugerencia simulada en lugar de fallar.

#### Scenario: Generación exitosa con proveedor configurado
- **WHEN** un usuario envía una historia de usuario con el agente de IA y hay un proveedor de lenguaje configurado
- **THEN** el sistema muestra una sugerencia editable con módulo, submódulo, tipo de prueba y una lista no vacía de casos

#### Scenario: Modo simulación sin proveedor
- **WHEN** un usuario solicita generar casos y no hay proveedor de lenguaje configurado
- **THEN** el sistema muestra una sugerencia simulada sin llamar al modelo

### Requirement: Contrato JSON de la respuesta del modelo
El sistema SHALL tratar como válida una respuesta cuyo JSON raíz es un objeto. Ese objeto SHALL describir un solo módulo (campos de sugerencia en la raíz, incluida una lista `test_cases`) o varios módulos envueltos bajo una clave de colección conocida (`guides`, `items`, `results`, `suggestions`, `data` o `modules`). El sistema SHALL extraer JSON usable aunque la respuesta traiga texto envolvente (por ejemplo fences markdown).

#### Scenario: Un solo módulo en un objeto raíz
- **WHEN** el modelo responde con un objeto que incluye `module`, `submodule`, `test_type` y `test_cases` no vacío
- **THEN** el sistema usa esa estructura como la sugerencia mostrada al usuario

#### Scenario: Varios módulos bajo una clave de colección
- **WHEN** el modelo responde con un objeto raíz que contiene una lista de guías bajo una clave de colección conocida y cada guía tiene casos
- **THEN** el sistema fusiona esas guías en una sola sugerencia en lugar de rechazar la respuesta

### Requirement: Tolerancia a JSON imperfecto
El sistema SHALL aceptar respuestas que vengan envueltas en fences markdown, con comas colgantes, como varios valores JSON concatenados, o truncadas a mitad de un valor, siempre que pueda extraer al menos un objeto o array JSON completo y convertirlo en sugerencias con casos. Si no puede extraer ningún JSON válido, el sistema SHALL fallar con un error de JSON inválido visible para el usuario.

#### Scenario: Respuesta envuelta en markdown
- **WHEN** el modelo envuelve el JSON en un bloque markdown (por ejemplo fences `json`)
- **THEN** el sistema extrae el JSON y muestra la sugerencia

#### Scenario: Varios objetos JSON concatenados
- **WHEN** el modelo devuelve más de un objeto JSON completo en el mismo texto
- **THEN** el sistema los trata como varias guías y las fusiona en una sola sugerencia

#### Scenario: Respuesta truncada con objetos internos completos
- **WHEN** la respuesta se corta por límite de tokens pero contiene al menos un objeto JSON completo con casos
- **THEN** el sistema recupera esos casos completos y muestra una sugerencia en lugar de fallar

#### Scenario: Sin JSON usable
- **WHEN** la respuesta no contiene ningún JSON extraíble y parseable
- **THEN** el sistema muestra un error de que la respuesta no es un JSON válido y no muestra sugerencia

### Requirement: Fusión de varias guías en una sugerencia
Cuando hay más de una guía válida, el sistema SHALL producir una sola sugerencia: concatenar todos los casos y condiciones, unir los nombres de módulo y submódulo distintos con ` / `, conservar el tipo de prueba de la primera guía válida, y usar la primera tabla de decisión marcada como aplicable si existe. Si ninguna guía tiene `test_cases` no vacío, o falta módulo, submódulo o tipo de prueba tras la fusión, el sistema SHALL fallar con un error de estructura esperada.

#### Scenario: Fusión de dos módulos
- **WHEN** el modelo cubre dos módulos distintos cada uno con casos
- **THEN** el usuario ve una sola sugerencia cuyo módulo concatena ambos nombres y cuya lista de casos incluye los de ambos módulos

#### Scenario: Guías sin casos
- **WHEN** el JSON parsea pero ninguna guía incluye una lista de casos no vacía
- **THEN** el sistema muestra un error de estructura esperada y no muestra sugerencia
