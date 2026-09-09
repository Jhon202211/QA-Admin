## ADDED Requirements

### Requirement: Autosave de ejecución no destruye datos más ricos
El autosave de una ejecución en curso SHALL aplicar la misma protección que el guardado de borrador: no reemplazará un caso persistido por un estado más vacío, incluso si el timestamp local es más reciente.

#### Scenario: Autosave tras corte de red
- **WHEN** el usuario recupera la red y el modal contiene menos datos de ejecución que el caso ya persistido
- **THEN** el autosave no actualiza el caso de prueba con ese estado incompleto

#### Scenario: Finalizar sigue siendo explícito
- **WHEN** el usuario confirma finalizar la ejecución
- **THEN** el sistema guarda el estado actual del modal como resultado final, sin aplicar la guardia de pobreza (el usuario asume la confirmación)
