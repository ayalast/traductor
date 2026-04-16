# Checklist operativo de release

Este documento traduce la estrategia vigente de [`plans/plan-maestro-release.md`](plans/plan-maestro-release.md:1) a una secuencia ejecutable antes, durante y después del despliegue.

## 1. Pre-release técnico

### 1.1 Frontend
- [ ] Confirmar que [`app/.env`](../app/.env) contiene valores reales válidos
- [ ] Confirmar que [`VITE_SUPABASE_URL`](../app/src/lib/supabase.ts:3) apunta al proyecto real
- [ ] Confirmar que [`VITE_SUPABASE_ANON_KEY`](../app/src/lib/supabase.ts:4) es la key pública correcta
- [ ] Ejecutar [`npm run build`](../app/package.json:8)
- [ ] Ejecutar [`npm run lint`](../app/package.json:9)
- [ ] Revisar la versión visible en [`app/package.json`](../app/package.json:4)

### 1.2 Backend
- [ ] Confirmar que todas las migraciones de [`supabase/migrations/`](../supabase/migrations) están aplicadas
- [ ] Confirmar despliegue de [`chat-stream`](../supabase/functions/chat-stream/index.ts:1)
- [ ] Confirmar despliegue de [`provider-key-upsert`](../supabase/functions/provider-key-upsert/index.ts:1)
- [ ] Confirmar despliegue de [`provider-key-delete`](../supabase/functions/provider-key-delete/index.ts:1)
- [ ] Confirmar despliegue de [`provider-models`](../supabase/functions/provider-models/index.ts:1)
- [ ] Confirmar despliegue de [`provider-key-validate`](../supabase/functions/provider-key-validate/index.ts:1)

### 1.3 Secretos y configuración
- [ ] Configurar `SUPABASE_URL`
- [ ] Configurar `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Configurar `ENCRYPTION_KEY`
- [ ] Configurar `APP_PUBLIC_URL`
- [ ] Configurar `OPENROUTER_APP_NAME`
- [ ] Verificar Google OAuth en Supabase Auth
- [ ] Verificar redirect URL local `http://localhost:5173/auth/callback`
- [ ] Verificar redirect URL de producción `https://TU-DOMINIO/auth/callback`

## 2. Validación manual previa al despliegue

### 2.1 Autenticación
- [ ] Pulsar el botón de Google en [`GoogleLoginButton.tsx`](../app/src/components/auth/GoogleLoginButton.tsx:9)
- [ ] Completar OAuth real
- [ ] Confirmar retorno a [`/auth/callback`](../app/src/pages/AuthCallbackPage.tsx:6)
- [ ] Confirmar acceso a la aplicación principal
- [ ] Confirmar logout

### 2.2 Conversaciones
- [ ] Crear nuevo chat desde [`ChatPage.tsx`](../app/src/pages/ChatPage.tsx:430)
- [ ] Enviar primer mensaje
- [ ] Confirmar creación de conversación en historial
- [ ] Reabrir conversación previa
- [ ] Confirmar persistencia de mensajes

### 2.3 Funciones avanzadas de chat
- [ ] Editar un mensaje anterior
- [ ] Reintentar la última respuesta
- [ ] Detener una generación en curso
- [ ] Crear rama desde un mensaje
- [ ] Navegar al padre y a ramas hijas
- [ ] Expandir resumen de razonamiento en [`MessageBubble.tsx`](../app/src/components/chat/MessageBubble.tsx:47)

### 2.4 Presets y notas
- [ ] Crear preset nuevo en [`PromptPresetList.tsx`](../app/src/components/prompts/PromptPresetList.tsx:19)
- [ ] Duplicar preset
- [ ] Renombrar preset
- [ ] Eliminar preset propio
- [ ] Activar preset
- [ ] Editar notas persistentes en [`UserNotesPanel.tsx`](../app/src/components/prompts/UserNotesPanel.tsx:9)

### 2.5 Proveedores y modelos
- [ ] Guardar key real de Groq
- [ ] Guardar key real de DeepSeek
- [ ] Guardar key real de OpenRouter
- [ ] Validar key desde [`ProviderKeysPanel.tsx`](../app/src/components/providers/ProviderKeysPanel.tsx:12)
- [ ] Cargar catálogo de modelos por proveedor
- [ ] Cambiar proveedor en [`ProviderSelect.tsx`](../app/src/components/providers/ProviderSelect.tsx:11)
- [ ] Cambiar modelo en [`ModelCombobox.tsx`](../app/src/components/providers/ModelCombobox.tsx:15)

### 2.6 Configuración visual
- [ ] Abrir [`SettingsDrawer.tsx`](../app/src/components/layout/SettingsDrawer.tsx:25)
- [ ] Cambiar temperatura
- [ ] Cambiar tema
- [ ] Cambiar modo claro/oscuro
- [ ] Ajustar textura de papel
- [ ] Confirmar persistencia visual

### 2.7 Diagnóstico y versión
- [ ] Confirmar versión visible en [`VersionBadge.tsx`](../app/src/components/common/VersionBadge.tsx:3)
- [ ] Abrir panel de diagnóstico con `Ctrl+Shift+L`
- [ ] Confirmar exportación de logs
- [ ] Confirmar filtrado de logs

## 3. Preparación del release candidate

- [ ] Elegir versión RC en [`app/package.json`](../app/package.json:4)
- [ ] Actualizar [`README.md`](../README.md) si cambió algún paso operativo
- [ ] Confirmar que [`VERIFICATION_CHECKLIST.md`](../VERIFICATION_CHECKLIST.md:1) no tiene fallos críticos abiertos
- [ ] Confirmar aceptación del warning de chunk grande o abrir tarea posterior

## 4. Despliegue

### 4.1 Frontend
- [ ] Conectar repositorio a Cloudflare Pages
- [ ] Configurar build command `cd app && npm install && npm run build`
- [ ] Configurar output directory `app/dist`
- [ ] Configurar variables de entorno del frontend

### 4.2 Supabase
- [ ] Aplicar migraciones en producción
- [ ] Desplegar Edge Functions
- [ ] Configurar secretos en producción
- [ ] Configurar Google OAuth en producción

## 5. Smoke test post despliegue

- [ ] Abrir aplicación desplegada
- [ ] Confirmar versión visible correcta
- [ ] Iniciar sesión con Google
- [ ] Crear chat nuevo
- [ ] Enviar mensaje
- [ ] Validar key de un proveedor
- [ ] Cargar modelos
- [ ] Cambiar modelo
- [ ] Abrir panel de diagnóstico
- [ ] Confirmar ausencia de fallos críticos

## 6. Criterio final de salida

La aplicación puede declararse terminada y lista para despliegue estable cuando:

- [ ] [`npm run build`](../app/package.json:8) pasa
- [ ] [`npm run lint`](../app/package.json:9) pasa
- [ ] OAuth real funciona
- [ ] Al menos un proveedor real funciona extremo a extremo
- [ ] Historial y branching funcionan con persistencia real
- [ ] Presets y notas funcionan con persistencia real
- [ ] La versión visible coincide con la release publicada
- [ ] [`README.md`](../README.md) y [`plans/plan-maestro-release.md`](plans/plan-maestro-release.md:1) están alineados
