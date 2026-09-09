## Purpose

Evita que un estado de ejecución más vacío —sobre todo tras un corte de red breve— reemplace el caso o el borrador que ya tenían más datos.

## ADDED Requirements

### Requirement: No pisar una ejecución más completa
El sistema SHALL persistir un estado de ejecución (borrador o caso) solo cuando no es más pobre que el último estado persistido conocido. Un estado es más pobre cuando tiene menos pasos evaluados, notas más cortas o menos evidencias, y no aporta campos nuevos con contenido.

#### Scenario: Estado pobre no reemplaza al lleno
- **WHEN** el modal tiene menos resultados, notas o evidencias que lo ya guardado
- **THEN** el sistema no escribe ese estado sobre el caso ni sobre el borrador persistido

#### Scenario: Estado más completo sí se guarda
- **WHEN** el usuario añade un resultado, nota o evidencia respecto a lo ya guardado
- **THEN** el sistema persiste ese estado

### Requirement: Reconexión no dispara overwrite ciego
Tras recuperar la red, el sistema MUST NOT autosavear el estado en pantalla sin compararlo antes con lo persistido. Si lo local es más pobre, SHALL conservar lo persistido.

#### Scenario: Vuelve la red con el modal a medias
- **WHEN** se pierde la red un momento y al volver el modal está más vacío que el último guardado
- **THEN** el sistema no pisa el caso ni el borrador con ese estado incompleto

#### Scenario: Indicador no finge un guardado pobre
- **WHEN** el sistema descarta un write por ser más pobre
- **THEN** no muestra el estado de “Cambios guardados” como si ese estado pobre se hubiera persistido
