# Plan: Optimizar Carga Inicial

## Objetivo

Eliminar el flash inicial donde la app parece no tener sesion y reducir trabajo no critico durante el arranque de la app React en `app/`.

La meta visible es que, al abrir la app con una sesion existente, entre directamente al workspace del usuario sin mostrar el boton de Google ni mensajes demo.

## Estado Seguro

- Rama base intacta: `master`
- Rama de seguridad creada: `backup/master-before-initial-load`
- Rama de trabajo activa: `optimize-initial-load`

Para volver al estado anterior:

```bash
git switch master
```

Para borrar la rama de trabajo si falla:

```bash
git branch -D optimize-initial-load
```

## Diagnostico Confirmado

El problema principal esta en `app/src/hooks/useAuth.ts`:

- `session` inicia como `null`.
- `isAuthenticated` queda inicialmente en `false`.
- `ChatPage` renderiza UI de no autenticado antes de que `supabase.auth.getSession()` termine.
- Luego la sesion llega y la UI cambia, produciendo el flash.

Problemas secundarios:

- `GoogleLoginButton` llama `useAuth()` de nuevo y puede crear otro chequeo/listener de auth.
- `ChatPage` no usa `isLoading` para evitar render falso de logout.
- Se cargan datos no criticos al inicio: modelos, credenciales, presets y branch info.
- `SettingsDrawer`, `DiagnosticsPanel`, `marked` y `katex` entran en el bundle inicial aunque no siempre son necesarios.
- El build actual genera un JS principal de alrededor de `536 KB` sin comprimir y `154 KB` gzip.

## No Tocar En Esta Fase

- No reescribir el backend de Supabase.
- No cambiar tablas ni migraciones salvo que se apruebe una fase posterior.
- No eliminar la app legacy `index.html` todavia.
- No hacer commits automaticos sin pedir confirmacion.
- No tocar credenciales ni archivos `.env`.

## Fase 1: Auth Sin Flash

Archivos:

- `app/src/hooks/useAuth.ts`
- `app/src/main.tsx` o `app/src/App.tsx`
- `app/src/components/auth/GoogleLoginButton.tsx`
- `app/src/pages/ChatPage.tsx`

Implementar:

1. Convertir auth a contexto compartido: `AuthProvider` + `useAuth()`.
2. Tener una sola suscripcion `supabase.auth.onAuthStateChange()` para toda la app.
3. Inicializar `session` desde la sesion persistida por Supabase en `localStorage` cuando sea seguro hacerlo.
4. Mantener `supabase.auth.getSession()` como validacion async en segundo plano.
5. En `ChatPage`, si auth esta cargando y no hay estado confiable, mostrar un loading neutro de app completa.
6. Nunca renderizar `fallbackMessages` ni `GoogleLoginButton` mientras auth sigue cargando.
7. Cambiar `GoogleLoginButton` para consumir el contexto existente, no crear su propio flujo de auth aislado.

Criterio de aceptacion:

- Con sesion guardada, no aparece el boton de Google al recargar.
- Con sesion guardada, no aparecen mensajes demo al recargar.
- Sin sesion, aparece login despues de resolver auth.
- Logout sigue funcionando.
- OAuth callback sigue funcionando.

## Fase 2: Diferir Datos No Criticos

Archivo principal:

- `app/src/pages/ChatPage.tsx`

Mantener en arranque:

- `useAuth`
- `useUserPreferences`
- `useConversations`
- `useMessages` solo cuando exista `activeConversationId`

Diferir hasta abrir settings:

- `useProviderCatalog`
- `useProviderCredentials`
- `usePromptPresets`

Eliminar o diferir:

- `useConversationBranch`, porque actualmente `currentBranch`, `parentBranch` y `childBranches` se calculan pero no se usan en render.

Criterio de aceptacion:

- Abrir la app dispara menos llamadas iniciales.
- Abrir settings sigue cargando modelos, credenciales y presets correctamente.
- Enviar mensajes sigue usando provider, model, temperature y preset activo.

## Fase 3: Lazy Loading De UI Pesada

Archivos:

- `app/src/App.tsx`
- `app/src/pages/ChatPage.tsx`
- Componentes en `app/src/components/layout/`, `providers/`, `prompts/`, `common/`

Implementar:

1. Cargar `SettingsDrawer` con `React.lazy` y `Suspense` solo cuando `isSettingsOpen` sea true.
2. Cargar `DiagnosticsPanel` con `React.lazy` solo cuando se active con `Ctrl+Shift+L`.
3. Si es sencillo, mover `ProviderSelect`, `ModelCombobox`, `ProviderKeysPanel`, `PromptPresetList` y `UserNotesPanel` al chunk de settings.

Criterio de aceptacion:

- El bundle principal baja de tamano.
- Settings abre sin errores.
- Diagnostico abre con `Ctrl+Shift+L`.

## Fase 4: Markdown Y KaTeX Fuera Del Arranque

Archivos:

- `app/src/main.tsx`
- `app/src/components/chat/MessageBubble.tsx`

Implementar con cuidado:

1. Evitar importar `katex/dist/katex.min.css` en `main.tsx` si no es necesario para primera pintura.
2. Separar el renderer Markdown/KaTeX en un modulo cargado de forma diferida.
3. Mantener fallback visual simple mientras se carga el renderer.

Criterio de aceptacion:

- Los mensajes assistant siguen renderizando Markdown.
- Formulas KaTeX siguen funcionando si existen.
- El primer bundle baja o se divide mejor.

## Fase 5: Preconnect Y HTML Inicial

Archivo:

- `app/index.html`

Implementar:

1. Cambiar `<html lang="en">` a `es`.
2. Cambiar `<title>app</title>` a `Mi Traductor`.
3. Agregar `preconnect` a Supabase usando el host configurado del proyecto.
4. Mover Google Fonts desde `@import` de `index.css` a links en HTML si se decide mantener esas fuentes.

Criterio de aceptacion:

- La app mantiene estilos.
- Menos bloqueo por CSS/imports externos.

## Fase 6: Verificacion

Ejecutar desde `app/`:

```bash
npm run build
npm run lint
```

Ejecutar local para revision:

```bash
npm run dev
```

Checklist manual:

- Recargar con sesion activa.
- Recargar sin sesion.
- Login con Google.
- Logout.
- Abrir settings.
- Cambiar provider/modelo.
- Enviar mensaje.
- Abrir diagnostico con `Ctrl+Shift+L`.

## Fase Posterior Opcional: Bootstrap Backend

Solo si el frontend optimizado no basta:

- Crear RPC o Edge Function `bootstrap`.
- Devolver en una sola llamada preferencias, conversaciones recientes y datos minimos necesarios.
- Reemplazar varias consultas iniciales por una sola.

No implementar en esta primera pasada porque es mas invasivo.
