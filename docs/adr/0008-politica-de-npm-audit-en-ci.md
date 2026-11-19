# 0008. Política de `npm audit` en la CI

- **Estado:** Aceptada
- **Fecha:** 18/11/2026
- **Relacionado:** SPEC NFR-SEC-08, §17 v1.3, tarea F1-05

## Contexto

El SPEC pedía `npm audit --audit-level=high` como paso bloqueante de la CI. Al configurarla, el advisory **GHSA-fc5q-39xc-vjpf** (ReDoS en `picomatch`) afectaba a todas las versiones publicadas del paquete, sin versión corregida. Solo llega por herramientas de desarrollo (Vite, Vitest, el plugin de ESLint de Next) y no forma parte de lo que se despliega. Con la regla original, la CI fallaría en todos los PR sin forma de arreglarlo.

## Decisión

- **Bloqueante:** `npm audit --omit=dev --audit-level=high`, que audita solo las dependencias de producción.
- **Informativo:** `npm audit --audit-level=high` completo, con `continue-on-error`, para no perder de vista las de desarrollo.
- **Dependabot** semanal (npm y GitHub Actions) para traer correcciones apenas existan.

## Alternativas consideradas

- `audit-ci` con una excepción solo para ese advisory: más preciso (bloquearía vulnerabilidades nuevas de desarrollo), pero suma una dependencia y una lista de excepciones que hay que mantener.
- Bajar Vitest a una versión vieja (lo que proponía `npm audit fix`): retroceso sin beneficio real.

## Consecuencias

- La CI no se bloquea por problemas de herramientas que no llegan a producción.
- Una vulnerabilidad alta **nueva** en dependencias de desarrollo no bloquea: hay que mirar el paso informativo y los PR de Dependabot.
- Cuando `picomatch` publique una versión corregida, se puede volver a bloquear con el audit completo (nueva ADR que reemplace a esta).
