# 0005. Mails después de responder (`after()`), sin el mensaje completo

- **Estado:** Aceptada (se implementa en F3-05 y F3-06)
- **Fecha:** 18/11/2026
- **Relacionado:** SPEC FR-08, US-05, §10.2 (fuga de datos por mail)

## Contexto

Cada consulta nueva genera dos mails: aviso al estudio y acuse de recibo a quien consulta. Enviar mails es lento y puede fallar; además, el mail viaja fuera del sistema y el texto de una consulta de familia es sensible.

## Decisión

- Los mails se envían **después de responder al usuario**, con `after()` de Next. Si fallan, la consulta ya está guardada: se loguea el error con el ID de la consulta (sin datos personales).
- El **aviso al estudio** incluye área, urgencia, canal preferido, nombre, número de referencia y un link al detalle en el panel, pero **no el texto del mensaje**: se lee en el panel, detrás del login.
- El **acuse** no incluye texto ingresado por el usuario, salvo su nombre.

## Alternativas consideradas

- Enviar antes de responder: el usuario espera más y un fallo del mail parece un fallo de la consulta.
- Cola de trabajos dedicada: más infraestructura de la que justifica el volumen de un estudio chico.

## Consecuencias

- Respuesta rápida al usuario y ninguna consulta perdida por un error de mail.
- Si un mail falla, el estudio igual ve la consulta en el panel (caso manual MT-15).
- Minimización de datos: el contenido sensible no queda en las casillas de correo.
