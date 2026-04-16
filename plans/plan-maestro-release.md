# Plan maestro de cierre, validación y despliegue

## Estado de este documento

Este documento pasa a ser la referencia principal desde este punto del proyecto.

Su objetivo es unificar y simplificar lo que antes estaba repartido entre documentos ahora archivados o complementarios:

- [`plans/rework-completo-app-plan.md`](plans/rework-completo-app-plan.md) — archivado
- [`plans/rework-completo-app-spec.md`](plans/rework-completo-app-spec.md) — archivado
- [`plans/deploy-readiness-roadmap.md`](plans/deploy-readiness-roadmap.md) — archivado
- [`plans/release-checklist.md`](plans/release-checklist.md) — complemento operativo vigente
- [`VERIFICATION_CHECKLIST.md`](VERIFICATION_CHECKLIST.md) — auditoría técnica vigente

## Resumen ejecutivo

La reescritura principal ya está terminada.

Estado actual confirmado:

- frontend nuevo en [`app/`](app)
- backend y datos en [`supabase/`](supabase)
- [`build`](app/package.json:8) pasa
- [`lint`](app/package.json:9) pasa
- versión visible actual: [`0.1.0-audit.2`](app/package.json:4)
- checklist técnico consolidado en [`VERIFICATION_CHECKLIST.md`](VERIFICATION_CHECKLIST.md)

La aplicación ya no está en fase de construcción estructural.
Ahora está en fase de **validación real y preparación de release**.

---

## Regla operativa más importante desde ahora

**No usar todavía** la URL oficial [`https://mi-traductor.pages.dev/`](https://mi-traductor.pages.dev/) como entorno de validación del nuevo sistema mientras siga sirviendo la versión anterior.

### Orden correcto de validación

1. **Local**
2. **Preview deployment**
3. **Producción sobre `main`**

### Regla de promoción entre entornos

- Si falla en local, no pasa a preview.
- Si falla en preview, no pasa a `main`.
- Solo se usa [`https://mi-traductor.pages.dev/`](https://mi-traductor.pages.dev/) cuando el preview ya esté validado.

---

## Entornos y propósito de cada uno

### 1. Local

Propósito:

- corregir integración real con Supabase
- validar OAuth real
- validar proveedor, modelos y almacenamiento
- detectar errores funcionales sin tocar producción

Requisitos mínimos:

- [`app/.env`](app/.env) real
- proyecto Supabase real
- Google OAuth configurado
- secretos de Edge Functions configurados

### 2. Preview deployment

Propósito:

- validar comportamiento web real antes de tocar `main`
- probar callbacks públicos
- comprobar variables de entorno del entorno desplegado
- validar UI real en navegador externo

Regla:

- si Cloudflare Pages ofrece deployment preview por rama o commit, ese debe ser el entorno web de validación principal
- el preview debe usar la misma configuración relevante que producción

### 3. Producción

Propósito:

- servir la versión estable al usuario final

Regla:

- solo se publica en [`main`](../README.md) cuando local y preview estén en verde

---

## Qué ya está resuelto

### Producto y arquitectura

- autenticación con Google en frontend
- callback OAuth
- historial persistente por usuario
- chat con streaming
- edición, retry y branching
- presets persistentes
- notas persistentes
- catálogo de modelos
- validación de API keys desde UI
- panel de diagnóstico
- versionado visible

### Calidad técnica

- problemas auditados corregidos
- `build` pasando
- `lint` pasando
- checklist técnico corregido

---

## Qué falta realmente para declarar release

Lo pendiente ya no es reescribir features grandes.
Lo pendiente es cerrar la operación real.

### Bloques pendientes reales

#### A. Configuración real

- confirmar que [`app/.env`](app/.env) usa el proyecto Supabase correcto
- confirmar que Google OAuth está configurado para local, preview y producción
- confirmar secretos reales de Edge Functions

#### B. Validación real con servicios externos

- login real con Google
- creación automática de perfil, preferencias y preset inicial
- prueba real con key de Groq
- prueba real con key de DeepSeek
- prueba real con key de OpenRouter
- carga real de modelos por proveedor
- envío real de mensajes por proveedor

#### C. Validación operativa

- smoke test completo en local
- smoke test completo en preview
- smoke test completo post despliegue

#### D. Cierre de release

- actualizar versión de release candidate
- decidir si se acepta el warning de chunk grande actual
- actualizar documentación final de despliegue
- publicar en `main`

---

## Secuencia única recomendada desde este momento

### Fase 1. Configuración local real

1. Confirmar que [`app/.env`](app/.env) contiene el `Project URL` y `anon key` reales.
2. Verificar que [`app/src/lib/supabase.ts`](app/src/lib/supabase.ts:14) ya no cae en el fallback.
3. Configurar Google OAuth con estos callbacks:
   - `http://localhost:5173/auth/callback`
   - URL de preview deployment
   - `https://mi-traductor.pages.dev/auth/callback`
4. Configurar secretos de funciones:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ENCRYPTION_KEY`
   - `APP_PUBLIC_URL`
   - `OPENROUTER_APP_NAME`

### Criterio de salida de Fase 1

- frontend apuntando al Supabase real
- callbacks correctos configurados
- secretos listos

---

### Fase 2. Validación real en local

Ejecutar en local:

1. login con Google
2. callback exitoso
3. logout
4. creación de perfil
5. creación de preferencias
6. creación de preset builtin
7. guardar una key real
8. validar esa key desde UI
9. cargar modelos reales
10. crear chat nuevo
11. enviar mensaje
12. editar mensaje
13. retry
14. branching
15. reasoning summary
16. panel de diagnóstico

### Criterio de salida de Fase 2

- login real funcionando
- al menos un proveedor funcionando extremo a extremo
- historial persistiendo correctamente

---

### Fase 3. Preview deployment

1. desplegar rama actual a preview deployment
2. cargar variables de entorno de preview
3. cargar callbacks públicos reales
4. repetir smoke test en preview

### Regla crítica

Mientras el preview no esté validado, **no se promueve a `main`**.

### Criterio de salida de Fase 3

- preview verde
- login real verde
- un proveedor real verde
- smoke test verde

---

### Fase 4. Preparación de release candidate

1. cambiar versión visible desde [`0.1.0-audit.2`](app/package.json:4) a una RC
2. actualizar [`README.md`](README.md)
3. revisar [`plans/release-checklist.md`](plans/release-checklist.md)
4. aceptar explícitamente o abrir tarea sobre warning de chunk grande

Versión sugerida:

- `0.9.0-rc.1`

### Criterio de salida de Fase 4

- release candidate definida
- documentación alineada
- decisión explícita sobre warning de performance

---

### Fase 5. Publicación en `main`

1. merge a `main`
2. esperar despliegue de Cloudflare Pages
3. confirmar publicación sobre [`https://mi-traductor.pages.dev/`](https://mi-traductor.pages.dev/)
4. ejecutar smoke test de producción

### Smoke test mínimo de producción

1. abrir app
2. confirmar versión visible
3. login con Google
4. crear chat
5. enviar mensaje
6. guardar y validar key
7. cargar modelos
8. cambiar modelo
9. abrir logs ocultos

### Criterio de salida de Fase 5

- producción verde
- smoke test verde
- sin errores críticos visibles

---

## Criterio formal para declarar la app terminada

La app se considera terminada cuando se cumplen simultáneamente estas condiciones:

### Técnica

- [`npm run build`](app/package.json:8) pasa
- [`npm run lint`](app/package.json:9) pasa
- no quedan fallos críticos abiertos en [`VERIFICATION_CHECKLIST.md`](VERIFICATION_CHECKLIST.md)

### Funcional

- login real funciona
- historial real funciona
- presets reales funcionan
- keys reales funcionan
- modelos reales funcionan
- chat real funciona
- branching funciona

### Operativa

- [`README.md`](README.md) está actualizado
- [`plans/release-checklist.md`](plans/release-checklist.md) puede ejecutarse sin improvisación
- la versión visible coincide con la release publicada
- producción está validada con smoke test

---

## Recomendación práctica inmediata

Lo siguiente que debe hacerse **ahora mismo** es esto:

1. confirmar el proyecto Supabase real
2. configurar Google OAuth real
3. probar login en local
4. validar un provider real
5. solo entonces pasar a preview deployment

## Documento principal a seguir desde ahora

A partir de este momento, este archivo es la guía maestra:

- [`plans/plan-maestro-release.md`](plans/plan-maestro-release.md)

Y como documentos operativos de apoyo:

- [`plans/release-checklist.md`](plans/release-checklist.md)
- [`VERIFICATION_CHECKLIST.md`](VERIFICATION_CHECKLIST.md)
- [`README.md`](README.md)
