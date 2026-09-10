## Context

See proposal.md - Why. Hoy el modal hidrata desde `testCase` + localStorage + `execution_drafts`, elige por `updatedAt`, y a los 800 ms escribe a localStorage, Firestore (`execution_drafts`) y el documento `test_cases`. Un corte de red breve puede dejar el UI a medias; al reconectar ese estado recibe un timestamp nuevo y pisa lo lleno.

## Goals / Non-Goals

**Goals:**
- Comparar riqueza antes de cualquier persistencia automática (local, borrador remoto, caso).
- Tras `offline` → `online`, no escribir hasta haber comparado con lo persistido.
- Mantener el autosave cuando el usuario sí está enriqueciendo la ejecución.

**Non-Goals:**
- Historial de N versiones en la UI de Borradores.
- Restaurar CP6622 desde PITR.
- Cambiar borradores de construcción (wizard/IA).
- Conflicto interactivo “¿cuál conservar?” (queda para un change futuro si hace falta).

## Decisions

### 1. Score de riqueza, no merge campo a campo
Se calcula un score entero sobre el snapshot de ejecución:
- +1 por cada paso con status distinto de `not_executed`
- +1 por cada paso con `actualResult` no vacío
- +1 por cada evidencia (en grupos o lista plana)
- +1 si las notas generales tienen texto
- +1 si el caso sin pasos tiene resultado o resultado actual

Se bloquea el write automático si `incomingScore < persistedScore`. Empate o mayor: se permite (el usuario puede corregir un typo sin añadir “riqueza”).

**Alternativa:** merge por campo (quedarse con el texto más largo). Se descartó: mezcla ejecuciones inconsistentes y es más difícil de explicar.

### 2. Baseline persistido en memoria al hidratar
Al abrir/hidratar, se guarda el snapshot más rico entre caso, localStorage y remoto como `persistedRichBaseline`. Cada save automático exitoso actualiza ese baseline. Si un write se bloquea, el baseline no baja.

### 3. Reconexión = pausa + re-comparar
Listeners `offline`/`online` (y `navigator.onLine`):
- Al perder red: marcar `reconnectGuard = true` y cancelar timers de autosave/draft remoto.
- Al volver: no disparar save inmediato. Releer el caso/borrador si se puede; si lo local es más pobre, restaurar el baseline en el UI o al menos no persistir lo pobre. Recién entonces reactivar autosave.

**Alternativa:** solo chequear `navigator.onLine` en el timeout de 800 ms. Insuficiente: el timeout puede dispararse justo cuando vuelve la red con estado ya pobre.

### 4. Finalizar ejecución no usa la guardia
“Finalizar ejecución” es un acto explícito. Si el usuario confirma con pasos pendientes, se guarda lo que ve. La guardia cubre autosave y sync de borrador, no el commit consciente.

### 5. Sin cambio de modelo Firestore
No hay subcolección de revisiones en este change. La protección es en el cliente. Si dos pestañas escriben, gana la más rica según el score de cada una frente a su baseline; no resolvemos sync multi-tab más allá de eso.

## Risks / Trade-offs

- [Score no detecta “reemplacé una nota larga por una corta a propósito”] → El usuario puede finalizar explícitamente; el autosave conservará la nota más rica. Aceptable frente a pérdida de data.
- [Hidratación inicial ya pobre] → Si al abrir no hay baseline rico (nunca se guardó), no hay qué proteger. La guardia no inventa data.
- [Sin red no se puede re-leer remoto] → Se usa el último baseline en memoria + localStorage; no se escribe a Firestore hasta poder comparar o hasta que lo local no sea más pobre.

## Migration Plan

Despliegue frontend únicamente. Rollback = revertir el change. Sin migración de datos.
