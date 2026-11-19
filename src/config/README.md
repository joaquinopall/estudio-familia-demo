# `src/config`

Configuración del estudio (SPEC §6.1, FR-03). Es lo que se cambia para convertir la demo en el sitio de un estudio real, sin tocar componentes.

- `site.config.ts`: nombre del estudio, profesionales y matrículas, dirección, horarios, teléfono, WhatsApp (número y mensaje genérico), email público, tiempo de respuesta, redes, coordenadas, navegación, CTA principal y disclaimer. Tipado (`SiteConfig`). En la demo, con datos **ficticios** (SPEC §11.4) e `isFictitious: true`.

Ningún componente debe hardcodear estos datos.

**Para un estudio real:** reemplazar los datos, poner `isFictitious: false` y revisar el mensaje de WhatsApp (siempre genérico, sin datos personales). El test `__tests__/site-config.test.ts` valida formatos (número de WhatsApp, email, matrículas) y el disclaimer exacto.
