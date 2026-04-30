# Mi Traductor - Nueva Arquitectura

Aplicación de traducción y asistencia lingüística con IA, ahora con arquitectura moderna React + Supabase.

## Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Estilos**: CSS personalizado con tokens de diseño
- **Proveedores IA**: Groq, DeepSeek, OpenRouter

## Configuración Local

### 1. Variables de Entorno - Frontend

Crea un archivo `.env` en [`app/`](app) basado en [`app/.env.example`](app/.env.example):

```bash
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**Obtener credenciales de Supabase:**
1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. Settings → API
3. Copia `Project URL` y `anon public` key

### 2. Configuración real de Supabase y Google

El archivo [`supabase/config.toml`](supabase/config.toml) contiene la configuración local base, pero para que la app funcione con login real debes completar tanto el frontend como Supabase Auth.

**Autenticación con Google:**
1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilita Google OAuth
3. Crea credenciales OAuth 2.0
4. Configura las redirect URLs correctas
5. Actualiza [`supabase/config.toml`](supabase/config.toml) o la consola de Supabase con tus credenciales

**Redirect URLs mínimas recomendadas:**
- Desarrollo frontend: `http://localhost:5173/auth/callback`
- Supabase local: `http://localhost:54321/auth/v1/callback`
- Producción: `https://TU-DOMINIO/auth/callback`

**Importante:**
- Si no existe [`app/.env`](app/.env), el frontend caerá en el fallback de [`app/src/lib/supabase.ts`](app/src/lib/supabase.ts:14) y terminará apuntando a `example.supabase.co`.
- El login correcto depende de tener valores reales en [`app/.env`](app/.env).

### 3. Secretos requeridos en Edge Functions

Además del frontend, debes configurar secretos reales en Supabase para las funciones dentro de [`supabase/functions/`](supabase/functions/):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY`
- `APP_PUBLIC_URL`
- `OPENROUTER_APP_NAME`

**Notas importantes:**
- [`supabase/functions/_shared/crypto.ts`](supabase/functions/_shared/crypto.ts:1) requiere `ENCRYPTION_KEY` real para cifrado AES-GCM.
- [`supabase/functions/provider-models/index.ts`](supabase/functions/provider-models/index.ts:26) usa `APP_PUBLIC_URL` y `OPENROUTER_APP_NAME` para OpenRouter.
- [`supabase/functions/provider-key-validate/index.ts`](supabase/functions/provider-key-validate/index.ts:84) necesita entorno real para validar keys de proveedores.

### 4. Instalación y Ejecución

```bash
# Instalar dependencias del frontend
cd app
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
```

### 5. Supabase CLI (Opcional para desarrollo local)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar Supabase local
supabase start

# Aplicar migraciones
supabase db push

# Desplegar Edge Functions
supabase functions deploy chat-stream
supabase functions deploy provider-key-upsert
supabase functions deploy provider-key-delete
supabase functions deploy provider-models
supabase functions deploy provider-key-validate
```

## Estructura del Proyecto

```
app/
├── src/
│   ├── components/      # Componentes React reutilizables
│   │   ├── auth/       # Login con Google
│   │   ├── chat/       # Mensajes, composer, vista de chat
│   │   ├── history/    # Lista de conversaciones
│   │   ├── layout/     # AppShell, Sidebar, Topbar
│   │   ├── prompts/    # Gestión de presets
│   │   └── providers/  # Selección de proveedor/modelo
│   ├── features/       # Lógica de negocio
│   │   ├── branch-conversation.ts
│   │   └── send-message.ts
│   ├── hooks/          # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useConversations.ts
│   │   ├── useMessages.ts
│   │   ├── useConversationBranch.ts
│   │   └── ...
│   ├── lib/            # Utilidades y configuración
│   │   ├── supabase.ts
│   │   ├── providers.ts
│   │   └── prompt-default.ts
│   └── pages/          # Páginas principales
│       ├── ChatPage.tsx
│       └── AuthCallbackPage.tsx
│
supabase/
├── migrations/         # Migraciones de base de datos
│   ├── 0001_extensions.sql
│   ├── 0002_profiles_and_preferences.sql
│   ├── 0003_prompt_presets.sql
│   ├── 0004_provider_credentials.sql
│   ├── 0005_conversations_and_messages.sql
│   ├── 0006_rls_policies.sql
│   └── 0007_seed_builtin_prompt.sql
│
└── functions/          # Edge Functions
    ├── _shared/       # Código compartido
    ├── chat-stream/   # Streaming de respuestas IA
    ├── provider-key-upsert/
    ├── provider-key-delete/
    └── provider-models/
```

## Estado actual del proyecto

### ✅ Implementado y verificado estáticamente
- [x] Autenticación con Google en frontend
- [x] Callback OAuth
- [x] Historial de conversaciones por usuario
- [x] Streaming de respuestas en tiempo real
- [x] Soporte multi-proveedor (Groq, DeepSeek, OpenRouter)
- [x] API keys cifradas por usuario
- [x] Validación de API keys desde UI
- [x] System prompts con presets persistentes
- [x] Edición, reintento y branching
- [x] Drawer de configuración completo
- [x] Temas, texturas y versionado visible
- [x] Panel de diagnóstico oculto
- [x] Build y lint pasando

### ⏳ Pendiente de validación real antes de release
- [ ] Login real con Google en Supabase configurado
- [ ] Probar una API key real de cada proveedor
- [ ] Validar catálogo remoto real en cada proveedor
- [ ] Ejecutar smoke test de extremo a extremo
- [ ] Validar responsive en dispositivos reales
- [ ] Desplegar frontend y backend con secretos reales

Consulta la guía principal en [`plans/plan-maestro-release.md`](plans/plan-maestro-release.md:1), el checklist operativo en [`plans/release-checklist.md`](plans/release-checklist.md:1), el plan de performance en [`plans/optimizacion-carga-inicial.md`](plans/optimizacion-carga-inicial.md:1) y la auditoría en [`VERIFICATION_CHECKLIST.md`](VERIFICATION_CHECKLIST.md:1).

## Despliegue

### Cloudflare Pages (Frontend)

El proyecto está configurado para despliegue automático en Cloudflare Pages:

1. Conecta tu repositorio GitHub
2. Configura el build:
   - **Build command**: `cd app && npm install && npm run build`
   - **Build output directory**: `app/dist`
   - **Root directory**: `/`
3. Añade variables de entorno en Cloudflare:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Supabase (Backend)

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Aplica las migraciones desde [`supabase/migrations/`](supabase/migrations)
3. Despliega las Edge Functions, incluyendo [`provider-key-validate`](supabase/functions/provider-key-validate/index.ts:1)
4. Configura Google OAuth en Authentication → Providers
5. Actualiza las redirect URLs para producción
6. Configura todos los secretos requeridos por [`supabase/functions/_shared/crypto.ts`](supabase/functions/_shared/crypto.ts:1) y por los endpoints de proveedores

### Smoke test mínimo post despliegue

Después del despliegue, verifica en este orden:

1. Abrir la aplicación y confirmar la versión visible en la esquina inferior derecha
2. Iniciar sesión con Google
3. Crear un chat nuevo
4. Enviar un mensaje y validar streaming
5. Guardar una API key real
6. Validar la API key desde la UI
7. Cargar modelos del proveedor
8. Cambiar de modelo
9. Editar un mensaje
10. Reintentar una respuesta
11. Crear una rama
12. Abrir el panel de diagnóstico con `Ctrl+Shift+L`

Si alguno de esos pasos falla, el release no debe considerarse cerrado.

## Soporte

Para problemas o preguntas, revisa:
- [`plans/plan-maestro-release.md`](plans/plan-maestro-release.md:1) - Guía principal vigente
- [`plans/release-checklist.md`](plans/release-checklist.md:1) - Checklist operativo de release
- [`plans/optimizacion-carga-inicial.md`](plans/optimizacion-carga-inicial.md:1) - Plan vigente para optimizar carga inicial
- [`VERIFICATION_CHECKLIST.md`](VERIFICATION_CHECKLIST.md:1) - Auditoría técnica y validación
- [`HANDOFF_PROYECTO.md`](HANDOFF_PROYECTO.md) - Contexto histórico del proyecto original

## Licencia

Proyecto privado - Todos los derechos reservados
