## Purpose

Gestiona el ciclo de vida completo de un caso de prueba manual: su creación, organización jerárquica, ejecución, evidencia asociada y archivado, permitiendo a un equipo de QA planificar y registrar resultados de testing manual de forma trazable.

## ADDED Requirements

### Requirement: Estructura jerárquica de organización
El sistema SHALL organizar los casos de prueba en una jerarquía de Proyecto → Módulo/Categoría → Submódulo, y SHALL permitir navegar esa jerarquía tanto en una vista jerárquica como en una vista de lista plana.

#### Scenario: Navegar casos por proyecto y módulo
- **WHEN** un usuario abre la vista jerárquica de Pruebas Manuales
- **THEN** el sistema agrupa y muestra los casos de prueba activos por Proyecto y luego por Módulo/Categoría dentro de cada proyecto

#### Scenario: Buscar proyecto por nombre
- **WHEN** un usuario escribe un término en el buscador de proyecto
- **THEN** el sistema filtra la vista para mostrar solo los proyectos cuyo nombre coincide

### Requirement: Creación de casos de prueba por múltiples caminos
El sistema SHALL permitir crear un caso de prueba mediante un asistente guiado paso a paso, mediante un formulario directo, o a partir de una sugerencia generada por un agente de IA; en todos los casos el resultado SHALL ser un registro con la misma estructura de caso de prueba.

#### Scenario: Creación guiada por asistente
- **WHEN** un usuario completa el asistente de creación (wizard) indicando proyecto, módulo, submódulo, tipo de prueba, datos del caso y pasos
- **THEN** el sistema crea un caso de prueba con esos datos

#### Scenario: Creación directa por formulario
- **WHEN** un usuario completa y envía el formulario de creación directa con los campos requeridos (proyecto, tipo de prueba, nombre, prioridad, estado)
- **THEN** el sistema crea el caso de prueba sin pasar por el asistente

#### Scenario: Creación a partir de sugerencia de IA
- **WHEN** un usuario acepta una sugerencia de caso de prueba generada por el agente de IA
- **THEN** el sistema la convierte en un borrador de construcción editable antes de confirmarse como caso definitivo

### Requirement: Borradores de construcción reanudables
El sistema SHALL persistir el progreso de creación de un caso de prueba (originado en el asistente o en una sugerencia de IA) como un borrador, y SHALL permitir reanudar o descartar ese borrador antes de que se confirme como caso definitivo.

#### Scenario: Reanudar un borrador de construcción
- **WHEN** un usuario abre la sección de Borradores y selecciona "Continuar creación" sobre un borrador existente
- **THEN** el sistema restaura el estado del asistente (paso actual, datos ingresados, pasos del caso) donde quedó

#### Scenario: Eliminar un borrador de construcción
- **WHEN** un usuario elimina un borrador desde la sección de Borradores
- **THEN** el sistema lo remueve sin crear un caso de prueba definitivo

### Requirement: Clonación de casos de prueba
El sistema SHALL permitir duplicar un caso de prueba existente como punto de partida para uno nuevo.

#### Scenario: Clonar un caso existente
- **WHEN** un usuario selecciona la acción de clonar sobre un caso de prueba
- **THEN** el sistema crea un nuevo caso de prueba con los mismos datos, editable de forma independiente al original

### Requirement: Ejecución de casos de prueba con evidencia
El sistema SHALL permitir ejecutar un caso de prueba registrando un resultado de ejecución (aprobado, fallido, bloqueado, omitido, retest, en progreso o no ejecutado) y SHALL permitir adjuntar evidencia asociada a pasos específicos de esa ejecución.

#### Scenario: Registrar resultado de ejecución
- **WHEN** un usuario ejecuta un caso de prueba y selecciona un resultado por paso
- **THEN** el sistema guarda el resultado de ejecución del caso y lo refleja en las vistas de lista y jerárquica

#### Scenario: Adjuntar evidencia a un paso
- **WHEN** un usuario adjunta un archivo o captura a un paso durante la ejecución
- **THEN** el sistema asocia esa evidencia al paso correspondiente de esa ejecución

### Requirement: Borradores de ejecución reanudables
El sistema SHALL persistir una ejecución en curso como borrador, y SHALL permitir reanudarla o descartarla antes de confirmar el resultado final.

#### Scenario: Reanudar una ejecución en curso
- **WHEN** un usuario selecciona "Continuar ejecución" sobre un borrador de ejecución existente
- **THEN** el sistema restaura los resultados y evidencias ya registrados en esa ejecución

### Requirement: Gestión de evidencias por paso
El sistema SHALL permitir adjuntar, previsualizar y gestionar archivos de evidencia asociados a pasos individuales de un caso de prueba o su ejecución.

#### Scenario: Previsualizar evidencia adjunta
- **WHEN** un usuario abre una evidencia adjunta a un paso
- **THEN** el sistema muestra una previsualización del archivo sin salir del contexto del caso o ejecución

### Requirement: Archivado a nivel de proyecto
El sistema SHALL permitir archivar y desarchivar un proyecto completo de pruebas como unidad; el archivado NO SHALL aplicarse a casos de prueba individuales de forma independiente.

#### Scenario: Archivar un proyecto
- **WHEN** un usuario archiva un proyecto desde la vista jerárquica
- **THEN** el sistema marca todos los casos de ese proyecto como archivados y deja de mostrarlos en la vista jerárquica activa

#### Scenario: Desarchivar un proyecto
- **WHEN** un usuario desarchiva un proyecto desde la vista de Archivados
- **THEN** el sistema restaura todos los casos de ese proyecto a la vista jerárquica activa

### Requirement: Listado con filtros y exportación
El sistema SHALL ofrecer una vista de lista de casos de prueba con filtros por nombre, tipo de prueba y prioridad, y SHALL permitir exportar el resultado filtrado.

#### Scenario: Filtrar la lista de casos
- **WHEN** un usuario aplica un filtro de tipo de prueba o prioridad en la vista de lista
- **THEN** el sistema muestra solo los casos de prueba que cumplen ese filtro

#### Scenario: Exportar la lista filtrada
- **WHEN** un usuario selecciona la acción de exportar en la vista de lista
- **THEN** el sistema genera un archivo con los casos de prueba actualmente visibles según los filtros aplicados
