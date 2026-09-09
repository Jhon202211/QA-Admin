## 1. Comparación de riqueza

- [x] 1.1 Extraer helpers puros para score de riqueza y “¿el incoming es más pobre?” sobre el snapshot de ejecución
- [x] 1.2 Cubrir con tests unitarios los casos: más pobre, más rico, empate, evidencias vacías vs llenas

## 2. Guardia en el modal

- [x] 2.1 Guardar baseline persistido al hidratar (el más rico entre caso, local y remoto)
- [x] 2.2 Bloquear autosave de `test_cases` y sync de borrador (local + remoto) cuando incoming < baseline
- [x] 2.3 No marcar “Cambios guardados” si el write se descartó; actualizar baseline solo tras persistir un estado no más pobre
- [x] 2.4 “Finalizar ejecución” sigue guardando el estado actual sin aplicar la guardia

## 3. Corte de red

- [x] 3.1 Al pasar a offline, cancelar timers de autosave/draft y activar guardia de reconexión
- [x] 3.2 Al volver online, comparar con baseline (y remoto si se puede) antes de reactivar writes automáticos
- [x] 3.3 Si lo local es más pobre tras reconectar, no persistirlo y conservar el baseline
