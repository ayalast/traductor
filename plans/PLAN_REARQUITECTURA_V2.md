# Mi Traductor v2 — Auditoría profunda y plan de re-arquitectura

> Fecha: 2026-09-24 · Rama auditada: `b73781a` ("ui: compacta práctica móvil") · Versión visible: `0.9.0-rc.1`

## 0. Resumen ejecutivo

**La URL `https://mi-traductor.pages.dev/` sirve exactamente esta aplicación.** Al compilar `app/` en el commit `b73781a` con la URL pública de Supabase de producción, los 20 assets y `index.html` son **idénticos byte a byte** a los desplegados (sección 1).

La app funciona, pero su núcleo tiene fallos estructurales que explican lo que notas:

1. **El parpadeo al terminar una respuesta es real y está medido.** Al acabar el stream, `refreshConversations()` pone `isLoading=true` y el lateral **desmonta la lista y muestra "Cargando…"** (~160 ms con 120 ms de latencia simulada; más en redes móviles). En el primer mensaje de un chat nuevo, además, aparece "Preparando conversación…" por el lazy-load de `ChatView`.
2. **El scroll "secuestra" al usuario.** En cada token se fuerza `scrollTop`; si subes para releer durante el streaming, la app te devuelve abajo en <400 ms (medido: de 100 a 1855 px).
3. **El streaming es cuadrático.** Cada evento `delta` reenvía **todo** el texto acumulado y el cliente re-parsea todo el Markdown + KaTeX y reemplaza el `innerHTML` completo. Medido: 118× más bytes que el contenido; una respuesta de 1500 tokens ≈ **4,5 MB de SSE y 1500 re-parseos**. Esto frena Groq justo donde debería volar.
4. **Latencia evitable antes del primer token**: cadena de `await` secuenciales a la BD, validación de JWT con posible viaje extra al servidor de Auth, "prewarm" roto (siempre devuelve 400) y persistencia de 4–5 consultas seguidas **antes** de enviar `done`.
5. **Proveedores y modelos cableados en código y en la BD** (`CHECK (provider in ('groq','deepseek','openrouter'))` en 3 tablas, columnas `active_model_groq/deepseek/openrouter`). Agregar un proveedor exige migración + cambios en 6+ archivos. El catálogo no se cachea, incluye modelos que no son de chat, y la UI inventa insignias "Pro" y descripciones.
6. **`ChatPage.tsx` es un "god component"** (841 líneas, 17 `useState`, lógica de red, árbol de mensajes, scroll y UI mezclados). Los mensajes optimistas **nunca se reconcilian** con los persistidos.
7. **La BD no ayuda a aprender**: no hay vocabulario del usuario, repetición espaciada, errores frecuentes ni progreso; las "palabras del día" son 144 palabras estáticas en `vocabulary.ts`.
8. **UI**: configuración en una sola columna de 4.621 px, panel de API keys sin estilos, emojis como iconos, objetivos táctiles de 26–34 px en Android, un visitante sin sesión ve un "workspace" falso con un botón de Google sin texto, y no hay rutas por conversación (el botón "Compartir" copia `/`).

**Estrategia recomendada:** reescritura **incremental tipo "strangler"** dentro del mismo repo: nuevo gateway de chat, BD v2 por migraciones *expand/contract* y nuevo frontend detrás de un feature flag, con tests de paridad contra la app actual. Nada se apaga hasta que v2 iguale y supere cada función existente (checklist de paridad, sección 11). Opcionalmente, una **Fase 0.5 de "quick wins"** (1–3 días) elimina ya el parpadeo y el scroll-jacking en la app actual mientras se construye v2.

---

## 1. Verificación del despliegue

| Comprobación | Resultado |
|---|---|
| `index.html` de producción | Mismo preconnect a `tvjrxiuwxstpzwhmdpwt.supabase.co`, mismas fuentes, mismos chunks (`react`, `supabase`, `providers`, `logger`, `package`) |
| Build local (`vite build`, Vite 8.0.8) sin variables | 12 de 20 assets con hash idéntico; el resto difería solo por la URL/anon key inyectadas |
| Build local con la URL pública y anon key de producción | **20/20 assets + `index.html` idénticos byte a byte** (`cmp`) |
| Contenido funcional | El bundle desplegado incluye "Palabras para practicar hoy" (commit `0c6810a`) y el ajuste móvil de `b73781a` |

Conclusión: producción = `HEAD` de esta rama. El `index.html` de 80 KB de la raíz es la app **legacy** (single-file) y no forma parte del despliegue (Cloudflare construye `app/`).

## 2. Metodología y límites

- Lectura completa de `app/src`, `supabase/functions` y `supabase/migrations`; `tsc` y `eslint` pasan limpios.
- **Servidor mock de Supabase** (REST PostgREST, Auth y `chat-stream` SSE con el mismo formato de producción) + sesión simulada, para navegar la app autenticada sin credenciales reales.
- **Instrumentación del DOM** (MutationObserver + sondeo de `scrollTop`) durante envíos reales para medir parpadeos y scroll.
- Capturas en escritorio 1440×900 y **Android emulado (Pixel 7, 412×915, DPR 2.625)** en producción (sin sesión) y local (con sesión).
- **No verificado:** login real con Google, llamadas reales a Groq/DeepSeek/OpenRouter, latencia real extremo a extremo y un dispositivo Android físico. La Fase 0 incluye medir la línea base real (TTFT) con una key de Groq.

Capturas: [`plans/auditoria-2026-09/`](auditoria-2026-09/).

---

## 3. Hallazgos

Severidad: 🔴 crítico · 🟠 alto · 🟡 medio · ⚪ bajo.

### 3.1 Experiencia de chat y streaming

| # | Sev. | Hallazgo | Evidencia |
|---|---|---|---|
| C1 | 🔴 | **Parpadeo del lateral al terminar cada respuesta.** `finally` → `refreshConversations()` → `setIsLoading(true)` → el lateral renderiza `<LoadingState>` en lugar de la lista. | `ChatPage.tsx:536-547`, `useConversations.ts:38`, `ChatPage.tsx:700`. Medido: lista desmontada 157 ms |
| C2 | 🔴 | **Flash "Preparando conversación…"** al enviar el primer mensaje: `ChatView` es `lazy()` y su `Suspense` sustituye el contenido. | `ChatPage.tsx:24,772`. Medido: ~300 ms |
| C3 | 🔴 | **Streaming cuadrático** (texto completo en cada `delta`) + re-parseo total de Markdown/KaTeX + `dangerouslySetInnerHTML` completo por token. | `chat-stream/index.ts:503,589,644`, `send-message.ts:66-68`, `MessageBubble.tsx:80-165`. Medido: 118× bytes |
| C4 | 🔴 | **Scroll-jacking**: el efecto de `MessageList` se ejecuta en cada cambio de `messages` (cada token) y fuerza `scrollTop`. El usuario no puede releer durante el streaming. | `MessageList.tsx:41-60`. Medido: 100 → 1855 px en 400 ms |
| C5 | 🔴 | **Los mensajes optimistas nunca se reconcilian.** Tras enviar, la vista queda "congelada" en la copia optimista hasta cambiar de chat: el selector de versiones (1/2) no aparece tras reintentar y los datos del servidor no se reflejan. | `setOptimisticMessages` solo se limpia en `handleNewChat`/`handleSelectConversation` |
| C6 | 🟠 | **"Detener" no detiene al proveedor ni guarda nada.** El abort corta la lectura del cliente, pero el edge function sigue consumiendo tokens; en modo `new` el mensaje del usuario se persiste **al final**, así que si el proveedor falla o se aborta, **se pierde también el mensaje del usuario**. | `chat-stream/index.ts:397,594` (sin `request.signal`, persistencia tras el stream) |
| C7 | 🟠 | **Prewarm roto**: la validación `if (!payload.model) → 400` ocurre antes de revisar `intent === 'prewarm'`, y el prewarm no envía `model`. Nunca calienta nada. | `chat-stream/index.ts:530` vs `:536`; `send-message.ts:170-181` |
| C8 | 🟠 | Doble `GET messages` al final de cada envío (efecto del hook + `refreshMessages` explícito) y `PATCH` extra del título en chats nuevos (el servidor ya lo crea). | Log del mock; `ChatPage.tsx:459-464` |
| C9 | 🟠 | Markdown parcial visible durante el stream (`*Example sentence numbe`), y `$…$` se interpreta como LaTeX: "cuesta $5 y $10" se rompe. Las fórmulas dentro de bloques de código también se sustituyen. | `MessageBubble.tsx:86-97` |
| C10 | 🟡 | El campo `reasoning` nunca se muestra; `reasoning_summary` se "inventa" con las 2 primeras frases de la respuesta. Los modelos de razonamiento (`reasoning_content` de DeepSeek, `reasoning` de Groq) se ignoran: el usuario espera en blanco mientras el modelo piensa. | `MessageBubble.tsx` no desestructura `reasoning`; `extractReasoningSummary` en `chat-stream/index.ts:235` |
| C11 | 🟡 | Botón "ir al final" roto: el listener se registra al montar, cuando `chatThreadRef.current` aún es `null`. | `ChatPage.tsx:250-260`. Verificado: nunca aparece |
| C12 | 🟡 | `max_tokens: 1500` fijo: respuestas largas se cortan sin opción "Continuar". | `chat-stream/index.ts:457` |
| C13 | 🟡 | La tecla Enter no respeta `isComposing` (IME / teclados Android) y el atajo "Esc cancela edición" que anuncia Configuración **no existe**. | `Composer.tsx:57-58`; `Escape` solo en `DiagnosticsPanel` |

### 3.2 Backend y latencia (camino hasta el primer token)

Camino actual para un mensaje nuevo: `requireUser` → `request.json()` → `Promise.all(preset+notas [2 consultas secuenciales], key [1 consulta + descifrado])` → fetch al proveedor. En edición/reintento se suman `resolveConversation` + `updateConversationMetadata` + `prepareOperationState` (2–4 consultas más, **secuenciales y antes del stream**).

| # | Sev. | Hallazgo |
|---|---|---|
| B1 | 🟠 | Verificación de JWT: solo es local si existe `SUPABASE_JWT_SECRET`/`JWT_SECRET` y el token es HS256; si no, **cada mensaje hace un viaje a Auth** (`client.auth.getUser`). Con claves de firma asimétricas, `getClaims()`/JWKS verifica en local ([docs](https://supabase.com/docs/guides/auth/signing-keys)). Hay que medir cuál rama se ejecuta en producción. |
| B2 | 🟠 | Los edge functions se ejecutan en la región más cercana al usuario, pero la BD está en una sola región: cada consulta secuencial paga el RTT. Supabase permite fijar región (`x-region` / `forceFunctionRegion`) ([docs](https://supabase.com/docs/guides/functions/regional-invocation)). |
| B3 | 🟠 | Persistencia **antes** de `done` (4–5 viajes); no se usa `EdgeRuntime.waitUntil` ([docs](https://supabase.com/docs/guides/functions/background-tasks)). |
| B4 | 🟡 | Cachés en memoria de 2 min para prompt y **API key descifrada**: tras editar notas/preset o borrar/rotar una key se siguen usando valores viejos hasta 2 min (por isolate). |
| B5 | 🟡 | 5 edge functions separadas (más arranques en frío) y todas con `// @ts-nocheck`, sin validación de payload (zod), sin rate limiting, CORS `*`, errores crudos del proveedor devueltos al cliente. |
| B6 | 🟡 | SSE sin heartbeats; `Connection: keep-alive` no aplica en HTTP/2; sin `usage`/métricas (TTFT, tokens). |
| B7 | ⚪ | Contexto limitado a "últimos 24 mensajes" en vez de un presupuesto de tokens según el modelo. |

### 3.3 Base de datos

| # | Sev. | Hallazgo |
|---|---|---|
| D1 | 🟠 | Proveedores fijados por `CHECK` en `user_preferences`, `provider_credentials` y `conversations`; columnas por proveedor `active_model_groq/deepseek/openrouter` (0002). No escala. |
| D2 | 🟠 | `messages` no tiene `user_id`: toda política RLS hace `EXISTS` contra `conversations` fila a fila. Supabase recomienda columnas `user_id` indexadas y `(select auth.uid())` para rendimiento. |
| D3 | 🟠 | El cliente puede **leer `encrypted_key` e `iv`** y modificar `validation_status` (política `for all` en `provider_credentials`). No expone la key en claro, pero no debería ser legible ni editable desde el navegador. |
| D4 | 🟡 | `turn_index` mezcla dos modelos (lineal y árbol con `parent_message_id`); `branch_from_message_id` sin FK; `parent_conversation_id ON DELETE SET NULL` rompe el linaje de ramas; no hay "hoja activa" persistida (al recargar, siempre se muestra la última versión). |
| D5 | 🟡 | `temperature` limitada a 0–1 (los proveedores aceptan 0–2); `theme_id`, `theme_mode` y texturas existen en la BD pero la app usa `localStorage` (no se sincronizan entre dispositivos). |
| D6 | 🟡 | Sin tablas de aprendizaje: vocabulario del usuario, repeticiones (SRS), errores, progreso/rachas, marcadores. Sin búsqueda de texto completo. |
| D7 | ⚪ | La rama de conversación se crea copiando mensajes desde el cliente en 3 llamadas no transaccionales (`branch-conversation.ts`). |

### 3.4 Proveedores y catálogo de modelos

| # | Sev. | Hallazgo |
|---|---|---|
| P1 | 🟠 | `provider-models` consulta al proveedor **en cada apertura de Configuración**, sin caché ni ETag, y devuelve todo excepto `whisper` (incluye TTS, guard, etc.). El fallback estático contiene modelos retirados (`llama-3.1-70b-versatile`, `mixtral-8x7b-32768`, `deepseek-coder`). |
| P2 | 🟠 | La UI **inventa metadatos**: insignia "Pro" si el id contiene `pro`/`large` y dos descripciones genéricas (`ModelCombobox.tsx:99-100`). |
| P3 | 🟠 | La tarjeta del proveedor activo muestra el **modelo por defecto**, no el elegido (`ProviderSelect.tsx:64`: "moonshotai/kimi-k2-instruct-0905" mientras el activo es `llama-3.3-70b-versatile`). |
| P4 | 🟡 | Lista de proveedores duplicada en frontend (`lib/providers.ts`, `lib/api.ts`, `ChatPage.tsx`), backend (`_shared/providers.ts`) y 3 `CHECK` SQL. |
| P5 | 🟡 | No hay capacidades por modelo (razonamiento, visión, ventana de contexto, velocidad), ni búsqueda "en vivo" de un id nuevo, ni proveedores personalizados (endpoint compatible con OpenAI). |

### 3.5 Arquitectura del frontend

- `ChatPage.tsx` (841 líneas) concentra estado, red, árbol de mensajes, scroll, atajos y UI; 17 `useState` y renders de toda la página por token.
- Hooks de datos sin caché (`useState + useEffect`): cada `refresh` vacía/recarga y provoca estados de carga visibles; no hay deduplicación ni cancelación homogénea.
- IDs temporales (`temp-assistant-…`) que luego se sustituyen; claves React basadas en `role-turnIndex`.
- Código muerto: `useConversationBranch.ts` (no se importa), `fallbackMessages` y la conversación "placeholder" que se muestran a visitantes.
- 111 `style={{…}}` en línea y `App.css` de 1.737 líneas; temas aplicados escribiendo variables en `document.documentElement`.
- Sin rutas por conversación (`router.tsx` solo tiene `/` y `/auth/callback`): recargar pierde el chat activo y "Compartir" copia `/`.
- Sin ErrorBoundary, sin tests, sin CI; si faltan variables, el cliente apunta silenciosamente a `example.supabase.co`.
- Documentación contradictoria: `HANDOFF_PROYECTO.md` describe la app legacy; `README.md` dice React 18 (es 19).

### 3.6 UI/UX en web y Android

| Pantalla | Problemas observados |
|---|---|
| Sin sesión ([01](auditoria-2026-09/01-prod-escritorio-sin-sesion.png), [02](auditoria-2026-09/02-prod-android-sin-sesion.png)) | Se muestra un workspace falso con un chat de ejemplo, "Usuario", el modelo `GROQ · moonshotai/kimi-k2-instruct-0905` y un **botón circular de Google sin texto** al pie. No hay propuesta de valor ni pantalla de acceso clara. |
| Inicio ([03](auditoria-2026-09/03-escritorio-inicio.png)) | Buena idea (práctica de vocabulario), pero contenido estático, "Workspace" genérico, "Salir" como botón rojo prominente, iconos emoji (💬 ⚙️ 📋 🔗 ➕), títulos del historial partidos en 2 líneas. |
| Streaming ([04](auditoria-2026-09/04-escritorio-streaming.png)) | Markdown parcial visible; la conversación nueva no aparece en el historial hasta el final; al terminar parpadea el lateral. |
| Configuración ([05](auditoria-2026-09/05-escritorio-config-api-keys.png), [06](auditoria-2026-09/06-android-config.png)) | Una sola columna de **4.621 px** mezclando proveedor, catálogo, keys, prompts, notas, temas, nivel, texturas, temperatura, atajos, ayuda y zona peligrosa. Panel de keys sin estilos ("Guardar ValidarEliminar" pegados, estados en inglés "valid/unknown"). Sin `role="dialog"`, no cierra con Esc ni tocando fuera en móvil. |
| Historial Android ([07](auditoria-2026-09/07-android-historial.png)) | Tocar una conversación **no cierra el panel** (hace falta doble toque, `ConversationList.tsx:100-110`). Botones renombrar/eliminar de 26×26 px anidados dentro de otro botón (HTML inválido y problema de accesibilidad). |
| Objetivos táctiles | Medidos en Pixel 7: renombrar/eliminar 26×26, barra superior 34×34, selector de modelo 31 px de alto, enviar 42×42 (recomendado ≥48 dp). |
| Accesibilidad | Botones de la barra superior sin `aria-label` (se leen como emoji); drawer sin trampa de foco; conversación = `button` con botones dentro. |

---

## 4. Objetivos, principios y presupuestos

**Objetivos:** (1) nunca romper lo que existe, (2) extensibilidad por configuración y registro (proveedores, modelos, secciones de ajustes, acciones de mensaje, modos de estudio), (3) velocidad percibida instantánea, especialmente con Groq, (4) cero parpadeos, (5) una BD que modele el aprendizaje, (6) UI profesional en web y Android.

**Principios de diseño:**
- **Arquitectura por features** (feature-sliced) con límites claros; UI "tonta", lógica en controladores/servicios puros testeables.
- **Patrones:** *Strategy/Adapter* (proveedores), *Registry/Plugin* (proveedores, secciones de ajustes, acciones de mensaje, modos), *Command* (operaciones de chat: enviar, regenerar, editar, continuar, bifurcar, detener), *Repository* (acceso a datos tipado), *Observer/External store* (stream por mensaje sin re-render global), *Expand/Contract* (migraciones sin downtime), *Feature flags* (cutover gradual).
- **Server state ≠ UI state:** TanStack Query para datos del servidor (caché, *stale-while-revalidate*, actualizaciones optimistas); Zustand para estado de UI.
- **Contratos tipados de extremo a extremo:** tipos generados de la BD (`supabase gen types`), esquemas zod compartidos para el protocolo de chat.
- **Nunca reemplazar contenido visible por un spinner.** Los esqueletos solo existen en la primera carga.

**Presupuestos (criterios de aceptación medibles):**

| Métrica | Objetivo |
|---|---|
| Groq, Enter → primer token visible (caliente) | p50 ≤ 350 ms · p95 ≤ 800 ms (línea base real a medir en Fase 0) |
| Overhead del gateway antes de llamar al proveedor | ≤ 60 ms en caliente |
| Trabajo de main thread por lote de tokens (Android gama media, CPU 4×) | ≤ 4 ms; ≤ 60 actualizaciones/s |
| Bytes SSE / bytes de contenido | ≤ 1,3× |
| Cambios de layout al terminar un stream | 0 (sin desmontajes, sin saltos de scroll) |
| INP | < 200 ms |
| JS inicial (gzip) | ≤ 180 KB; Markdown/KaTeX precargados en *idle* tras login |

---

## 5. Arquitectura objetivo

### 5.1 Vista general

```
┌──────────────── Frontend (React 19 + Vite, PWA) ────────────────┐
│ routes/   /c/:id · /learn · /login   (Settings = diálogo/sheet) │
│ features/ chat · conversations · models · providers · settings  │
│           learning · auth                                       │
│ shared/   ui (design system) · lib (markdown, scroll, uuidv7)   │
│           api (supabase tipado, cliente SSE v2)                 │
│ Estado: TanStack Query (servidor) · Zustand (UI) · ChatStore    │
└───────────────┬───────────────────────────────┬─────────────────┘
                │ SSE v2 (append-only)          │ PostgREST/RPC (RLS)
┌───────────────▼──────────────┐       ┌────────▼─────────────────┐
│ Edge function `api` (Hono)   │──────▶│ Postgres v2              │
│ /chat /chat/warm /models     │  1 RPC│ providers · model_catalog│
│ /keys /fork /learning/extract│       │ conversations · messages │
│ auth JWKS · zod · rate limit │       │ learning (FSRS, errores) │
│ ProviderRegistry ─┐          │       └──────────────────────────┘
└───────────────────┼──────────┘
        ┌───────────┼──────────────┬───────────────┐
   OpenAICompatible │         Anthropic*       Custom (base URL)
   Groq · DeepSeek · OpenRouter · OpenAI · Mistral · xAI · Cerebras · Ollama…
```

### 5.2 Estructura del frontend

```
app/src/
  app/          bootstrap: QueryClient, ThemeProvider, AuthProvider, router, ErrorBoundary
  routes/       módulos de ruta (lazy + prefetch en idle)
  features/
    chat/       engine/ (tree-store, chat-controller, stream-client, scroll-controller)
                components/ (Thread, Turn, Message, MessageActions, VersionSwitch,
                             ReasoningPanel, Composer, StreamingMarkdown)
    conversations/  lista, búsqueda, agrupación, CRUD con undo
    models/         consultas de catálogo, ModelPicker (paleta de comandos)
    providers/      credenciales, proveedores personalizados
    settings/       SettingsDialog + secciones registradas
    learning/       vocabulario, repaso FSRS, errores, progreso
    auth/
  entities/     tipos de dominio + mappers (Message, Conversation, Model, Provider)
  shared/       ui/ (componentes), lib/, api/ (tipos generados), config/ (env zod, flags)
```

**Registros extensibles (la clave para "agregar sin romper"):**

```ts
// Agregar una sección de ajustes = crear un archivo y registrarlo.
settingsRegistry.register({ id: 'learning', title: 'Aprendizaje', icon: GraduationCap,
  order: 30, component: lazy(() => import('./sections/LearningSection')) })

// Acciones de mensaje (desktop: barra al pasar el mouse; Android: bottom sheet).
messageActions.register({ id: 'save-vocab', label: 'Guardar en vocabulario',
  when: (m) => m.role === 'assistant', run: (ctx) => ctx.openSaveVocab(ctx.selection) })
```

### 5.3 Motor de chat

- **Store normalizado del árbol por conversación:** `byId`, `childrenByParent`, `activeLeafId`; el hilo visible es una selección derivada (memoizada) de la raíz a la hoja activa.
- **IDs generados en el cliente (UUID v7)** para mensajes y conversaciones nuevas, enviados al servidor: sin IDs temporales, sin intercambios, sin remontajes. Claves React = id del mensaje.
- **ChatController (patrón Command):** `send`, `regenerate(messageId, {model?})`, `editAndResend(messageId, text)`, `continue(messageId)`, `stop()`, `retryAfterError()`, `fork(messageId)`, `switchVersion(parentId, index)`. Cada comando aplica una actualización optimista al store/cache y la confirma con el evento `done` del servidor (que devuelve los registros finales). **No hay refetch al terminar.**
- **Texto en streaming fuera de React:** un store externo por mensaje (`useSyncExternalStore`) recibe deltas; solo el componente del mensaje en streaming se re-renderiza, en lotes por `requestAnimationFrame` y con `startTransition`.
- **Markdown en streaming por bloques memoizados:** los bloques terminados no se vuelven a renderizar; solo el último. Se completa la sintaxis sin cerrar para no mostrar `**texto` a medias. Opción A: [Streamdown](https://github.com/vercel/streamdown) (usa bloques memoizados + `remend`, requiere Tailwind). Opción B: renderer propio con `marked.lexer` + memo por bloque. Matemáticas solo con `\(...\)`, `\[...\]` y `$$...$$` (no `$` suelto) y nunca dentro de código.

### 5.4 Protocolo de streaming v2

```
event: meta       data: {"conversationId","userMessageId","assistantMessageId","provider","model"}
event: reasoning  data: {"d":"…"}          ← solo el fragmento nuevo
event: text       data: {"d":"…"}          ← solo el fragmento nuevo
event: usage      data: {"promptTokens","completionTokens","ttftMs","totalMs"}
event: done       data: {"status":"complete|stopped|length","message":{…registro final…}}
event: error      data: {"code","message","retryable"}
: ping                                      ← cada 15 s
```

El servidor escucha `request.signal`: si el cliente detiene, aborta el fetch al proveedor y guarda el parcial con `status='stopped'` (con opción "Continuar").

### 5.5 Comportamiento de scroll (especificación)

1. **Al enviar:** el mensaje del usuario se desplaza **una vez** al borde superior. Un espaciador dinámico al final del último turno (alto = viewport − composer) lo hace posible aunque el contenido sea corto.
2. **Durante el streaming:** **no hay scroll automático.** La respuesta crece hacia abajo desde su inicio, que queda visible arriba. Si el usuario se desplaza, se respeta siempre.
3. Si la respuesta sobrepasa el viewport aparece una píldora "↓ Continúa la respuesta"; nunca se arrastra al usuario.
4. **Al terminar:** no ocurre nada visual (sin saltos). El espaciador solo se recalcula en el siguiente envío y únicamente en la zona fuera de pantalla.
5. **Al abrir un chat:** se restaura la posición guardada para ese chat; si no existe, se muestra el inicio de la última respuesta.
6. Botón "ir al final" cuando no se está al final; respeta `prefers-reduced-motion`.
7. **Android:** `interactive-widget=resizes-content` en el viewport, alturas con `dvh` y `safe-area-inset-*`, para que el teclado no desplace el hilo.

### 5.6 Reglas "cero parpadeo"

- Las listas y el hilo **nunca** se desmontan por un refetch; TanStack Query conserva los datos mientras revalida (`placeholderData: keepPreviousData`).
- Una conversación nueva se inserta en el historial **al enviar** (optimista, con su UUID), no al final.
- El evento `done` trae los registros definitivos → se escriben en la caché; cero refetch.
- Chunks críticos (`Thread`, `Message`, Markdown) precargados en *idle* tras el login; `Suspense` solo por encima del contenido, nunca en su lugar.
- El indicador "escribiendo" y el contenido final comparten el mismo contenedor, con alto mínimo reservado.
- Tests E2E que fallan si durante un envío se desmonta `.conversation-list` o `.thread`, o si `scrollTop` cambia sin interacción del usuario tras el primer anclaje (automatiza la instrumentación usada en esta auditoría).

### 5.7 Backend: gateway `api` (Hono en un solo edge function)

Un único function con rutas reduce arranques en frío y centraliza auth, CORS, errores y rate limiting.

```
supabase/functions/
  api/index.ts                    Hono: /chat, /chat/warm, /models, /keys, /keys/validate, /fork, /learning/extract
  _shared/http/                   cors (lista de orígenes), errores, sse
  _shared/auth/                   verificación JWT local vía JWKS (claves asimétricas) + caché
  _shared/db/                     cliente tipado, RPCs
  _shared/crypto/                 AES-GCM (sin cambios de formato)
  _shared/providers/              types.ts · registry.ts · openai-compatible.ts
                                  groq.ts · deepseek.ts · openrouter.ts · anthropic.ts (fase posterior)
  _shared/chat/                   context-builder (presupuesto de tokens) · prompt-builder
                                  persistence · learning-extractor (en segundo plano)
```

**Flujo `/chat` optimizado:**
1. Verificar JWT en local (JWKS en caché) → 0 viajes.
2. **Una sola RPC `chat_bootstrap(...)`**: prompt del modo + notas + perfil del estudiante, key cifrada, hilo (CTE recursiva desde el padre) y validación de propiedad → 1 viaje.
3. Descifrar la key e **iniciar el fetch al proveedor de inmediato**; en paralelo, insertar el mensaje del usuario y el asistente con `status='streaming'` (el mensaje del usuario nunca se pierde).
4. Reenviar deltas append-only al instante.
5. Al terminar, `EdgeRuntime.waitUntil(...)` actualiza el asistente (contenido, razonamiento, usage, TTFT) y los metadatos de la conversación; `done` se envía sin esperar a la BD.

### 5.8 Abstracción de proveedores

```ts
interface ProviderAdapter {
  id: string                                  // 'groq', 'deepseek', 'custom:<uuid>'…
  listModels(key: string): Promise<CatalogModel[]>       // normalizado + filtrado a chat
  streamChat(req: ChatRequest, signal: AbortSignal): AsyncIterable<StreamEvent>
  validateKey(key: string): Promise<KeyStatus>
  capabilities(modelId: string): ModelCapabilities       // razonamiento, visión, tools, contexto
}
```

- `OpenAICompatibleAdapter` (base) cubre Groq, DeepSeek, OpenRouter, OpenAI, Mistral, xAI, Together, Fireworks, Cerebras, Gemini (endpoint compatible) y locales (Ollama/LM Studio).
- Subclases finas para particularidades: Groq (`reasoning_format`/`include_reasoning`, `usage` en `x_groq`), DeepSeek (`reasoning_content`), OpenRouter (cabeceras, catálogo con `supported_parameters`, precios y modalidades).
- Adaptadores no compatibles (Anthropic) implementan la misma interfaz.
- **Proveedores personalizados por usuario:** nombre + base URL + key → usan el adaptador base sin tocar código.
- Alternativa evaluada: AI SDK de Vercel (`@ai-sdk/*`). Es válida, pero añade peso al edge y el árbol de mensajes/BYOK siguen siendo propios; se recomienda la interfaz propia (≈300 líneas) y reevaluar si se añaden tools/multimodal.

### 5.9 Catálogo de modelos en tiempo real

- Tabla `model_catalog` compartida por proveedor con TTL (p. ej., 6 h). `/models` responde **al instante desde caché** y revalida en segundo plano (`waitUntil`) si está vencida: *stale-while-revalidate*.
- **Búsqueda en vivo:** al escribir en el selector, si el id no está en caché o el usuario pulsa "Actualizar", se consulta al proveedor en ese momento. También se puede pegar cualquier id y probarlo ("Usar este modelo").
- Normalización por adaptador: descarta modelos que no son de chat (whisper, tts, guard, embeddings), inactivos o retirados; guarda contexto, máximo de salida, modalidades y capacidades.
- Tabla `model_overrides` para curaduría sin despliegue: etiquetas ("Recomendado para traducir", "⚡ Ultra rápido", "Razonamiento"), velocidad aproximada, ocultar o renombrar.
- En el cliente, la caché de TanStack Query se persiste (IndexedDB): el selector abre al instante incluso sin red.

### 5.10 Plan específico de velocidad con Groq

1. Medir la línea base con `Server-Timing` y el evento `usage` (auth, bootstrap, TTFT del proveedor, primer byte al cliente, primer render).
2. JWT local por JWKS (quita el posible viaje a Auth).
3. `chat_bootstrap` en 1 RPC; key descifrada en caché con invalidación explícita al guardar/borrar la key.
4. Probar la función fijada a la región de la BD (`x-region`) frente a la región automática y quedarse con la más rápida medida.
5. Iniciar el fetch a Groq antes de cualquier escritura; persistencia en segundo plano.
6. Warm-up real (`/chat/warm`, sin dependencia de `model`) al enfocar el composer y al volver a la pestaña.
7. Deltas append-only + render en lotes por frame (elimina el coste cuadrático de C3).
8. Contexto por presupuesto de tokens del modelo, no "24 mensajes".
9. Modelos rápidos destacados por curaduría (la documentación de Groq publica velocidades por modelo); para modelos de razonamiento, `reasoning_effort` bajo y razonamiento separado en su panel.
10. Experimental y opt-in: **"Modo directo"** (navegador → Groq con la key guardada solo en el dispositivo) para quitar el salto por el proxy. Contrapartida: la key vive en el navegador; queda como decisión abierta.

---

## 6. Base de datos v2

Migraciones **expand → backfill → switch → contract**: primero se agregan tablas/columnas nuevas compatibles, se rellenan, v2 lee lo nuevo y la app actual sigue funcionando; solo tras el cutover se eliminan columnas viejas.

### 6.1 Proveedores, credenciales y catálogo

```sql
create table public.providers (
  id text primary key,                    -- 'groq','deepseek','openrouter','openai',…
  display_name text not null,
  adapter text not null,                  -- 'openai_compatible' | 'anthropic' | …
  base_url text not null,
  capabilities jsonb not null default '{}',
  enabled boolean not null default true,
  sort_order int not null default 100
);

create table public.user_providers (      -- endpoints compatibles definidos por el usuario
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  base_url text not null,
  adapter text not null default 'openai_compatible',
  created_at timestamptz not null default now()
);

-- provider_credentials: se sustituye el CHECK por FK a providers (o user_provider_id);
-- el cliente deja de poder leer encrypted_key/iv (revoke de columnas + vista pública
-- con provider, key_hint, validation_status, validated_at). Escrituras solo vía gateway.

create table public.model_catalog (
  provider_id text references public.providers(id) on delete cascade,
  model_id text,
  display_name text not null,
  context_window int,
  max_output_tokens int,
  modalities text[] not null default '{text}',
  capabilities jsonb not null default '{}', -- {"reasoning":true,"tools":false,"vision":false}
  pricing jsonb,
  status text not null default 'active' check (status in ('active','preview','deprecated')),
  fetched_at timestamptz not null default now(),
  primary key (provider_id, model_id)
);

create table public.model_overrides (
  provider_id text, model_id text,
  tags text[] not null default '{}', speed_tps int, hidden boolean not null default false,
  display_name text, note text,
  primary key (provider_id, model_id)
);
```

### 6.2 Preferencias

```sql
-- user_preferences v2 (se añaden; las columnas active_model_* se eliminan en contract)
alter table public.user_preferences
  add column default_provider_id text references public.providers(id),
  add column default_model_id text,
  add column model_by_provider jsonb not null default '{}',   -- {"groq":"llama-3.3-70b-versatile"}
  add column generation jsonb not null default '{"temperature":0.5}',  -- temperatura 0–2, max_tokens
  add column ui jsonb not null default '{}',                  -- tema, modo, texturas, densidad, tamaño de letra
  add column learning jsonb not null default '{}';            -- idioma nativo/objetivo, nivel CEFR, metas
```

Tema, nivel y texturas pasan de `localStorage` a la BD (con `localStorage` solo como caché de arranque para evitar parpadeo de tema).

### 6.3 Conversaciones y mensajes

```sql
alter table public.conversations
  add column active_leaf_message_id uuid,           -- versión elegida persiste entre recargas
  add column forked_from_message_id uuid,           -- linaje de bifurcaciones (FK real)
  add column pinned boolean not null default false,
  add column mode text not null default 'chat',     -- chat | translate | practice | review
  add column last_message_at timestamptz,
  add column search tsvector;                       -- título (+ resumen) para búsqueda

alter table public.messages
  add column user_id uuid,                          -- backfill desde conversations; RLS barata
  add column provider_id text, add column model_id text,   -- modelo por mensaje (regenerar con otro modelo)
  add column reasoning text,
  add column usage jsonb,                           -- tokens, ttft_ms, total_ms
  add column error jsonb,
  add column metadata jsonb not null default '{}';
-- status: pending | streaming | complete | stopped | error
-- turn_index se mantiene durante la migración; la profundidad se deriva del árbol.
create index on public.messages (conversation_id, parent_message_id);
create index on public.messages (user_id, created_at desc);
```

**RPCs:**
- `get_thread(leaf_id)` — CTE recursiva raíz→hoja.
- `fork_conversation(message_id, title)` — copia transaccional del hilo a una conversación nueva y devuelve su id (sustituye las 3 llamadas del cliente).
- `chat_bootstrap(user_id, conversation_id, parent_id, provider_id, mode)` — todo lo que el gateway necesita en un viaje.
- `search_conversations(query)` — búsqueda de texto completo (`simple` + `english`/`spanish`) en títulos y mensajes.

**RLS v2:** `user_id` en todas las tablas, índice por `user_id` y políticas con `(select auth.uid()) = user_id`.

### 6.4 Modelo de aprendizaje

```sql
create table public.learner_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  native_language text not null default 'es',
  target_language text not null default 'en',
  cefr_level text not null default 'B1',
  goals text[] not null default '{}',
  daily_goal int not null default 10,               -- tarjetas o minutos
  streak_days int not null default 0,
  last_active_date date
);

create table public.lexicon (                       -- diccionario base (reemplaza vocabulary.ts)
  id bigint generated always as identity primary key,
  lemma text not null, pos text, cefr_level text, frequency_rank int,
  translations jsonb not null default '[]', examples jsonb not null default '[]',
  unique (lemma, pos)
);

create table public.user_vocabulary (               -- lo que el estudiante guarda o encuentra
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lexicon_id bigint references public.lexicon(id),
  term text not null, translation text, context_sentence text,
  source_message_id uuid references public.messages(id) on delete set null,
  -- estado FSRS
  state smallint not null default 0, due timestamptz not null default now(),
  stability real, difficulty real, reps int not null default 0, lapses int not null default 0,
  last_review timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, term)
);

create table public.review_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null, user_vocabulary_id uuid not null references public.user_vocabulary(id) on delete cascade,
  rating smallint not null check (rating between 1 and 4),
  reviewed_at timestamptz not null default now(), duration_ms int
);

create table public.mistakes (                      -- cuaderno de errores
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  original text not null, corrected text not null, explanation text,
  category text not null,                           -- grammar | vocabulary | spelling | false_friend | word_order
  occurrences int not null default 1,
  created_at timestamptz not null default now(), resolved_at timestamptz
);

create table public.daily_activity (                -- rachas y progreso
  user_id uuid not null, day date not null,
  messages_sent int not null default 0, words_added int not null default 0,
  reviews_done int not null default 0, minutes int not null default 0,
  primary key (user_id, day)
);
```

**Cómo ayuda a aprender:**
- **Palabras del día** desde `lexicon` según el nivel CEFR y excluyendo las que el usuario ya domina.
- **Guardar desde cualquier respuesta** (seleccionar texto → "Guardar en vocabulario"), con la frase de contexto y enlace al mensaje de origen.
- **Extracción automática opcional:** tras cada respuesta, en segundo plano y con un modelo rápido de Groq en salida JSON, se proponen palabras nuevas y errores del mensaje del usuario ("Añadir 3 palabras a tu vocabulario").
- **Repaso con FSRS** (algoritmo moderno de repetición espaciada, p. ej. `ts-fsrs`): tarjetas, respuesta escrita, pronunciación con Web Speech API.
- **Cuaderno de errores** con recurrencia; los errores frecuentes y el nivel se inyectan en el prompt del sistema → tutor personalizado.
- **Progreso:** racha, palabras aprendidas, repasos pendientes, errores resueltos.

**Prompts → "Modos" versionados** (Traducir, Corregir mi inglés, Conversar, Explicar gramática, Practicar vocabulario) con variables `{{nivel}}`, `{{idioma_nativo}}`, `{{notas}}`, `{{errores_frecuentes}}`. Los presets actuales se migran como modos personalizados.

---

## 7. Rediseño de UI/UX

### 7.1 Sistema de diseño

- **Tailwind CSS v4 + componentes accesibles sobre Radix (shadcn/ui)**: Dialog/Sheet, DropdownMenu, Tooltip, Tabs, Command (cmdk) para el selector de modelos, Sonner para toasts con "Deshacer", `lucide-react` para iconos (fin de los emojis), `motion` para microanimaciones (150–200 ms).
- **Tokens** en variables CSS (color, superficie, radio, sombra, tipografía, espaciado); los 7 temas actuales (Libre, Ámbar, Océano, Bosque, Lavanda, Papel, Alto contraste) se remapean a tokens con verificación de contraste AA automatizada.
- Fuentes variables autoalojadas (sin CSS de Google Fonts que bloquea el render).

### 7.2 Dirección visual (para los diseños que se crearán)

"Estudio sereno": centrado en el contenido como los mejores chats de IA, con personalidad de aprendizaje. Neutros cálidos, acento esmeralda (heredado de la marca), tipografía de lectura cómoda para respuestas largas, tarjetas de estudio con carácter, modo oscuro de primera clase.

### 7.3 Pantallas a diseñar (escritorio y Android)

1. **Acceso/landing:** propuesta de valor, vista previa real y botón "Continuar con Google" con texto.
2. **Inicio del chat:** saludo, palabras del día (desde la BD), accesos a modos y repasos pendientes.
3. **Hilo:** mensajes con acciones al pasar el mouse (desktop) o pulsación larga → bottom sheet (Android); selector de versiones `‹ 2/3 ›`; panel de razonamiento colapsable; burbuja de error inline con "Reintentar"; "Continuar" cuando se cortó; metadatos (modelo, tiempo, tokens).
4. **Selector de modelos (paleta de comandos, Ctrl+K):** búsqueda instantánea, agrupado por proveedor, etiquetas ⚡/🧠/👁, favoritos y recientes, búsqueda en vivo y "Usar este id".
5. **Configuración:** diálogo con navegación lateral en desktop y hoja a pantalla completa en Android. Secciones: General · Modelos y proveedores · Modos y prompts · Aprendizaje · Apariencia · Atajos · Datos y privacidad.
6. **Centro de aprendizaje:** vocabulario, repaso FSRS, cuaderno de errores y progreso.
7. **Historial:** búsqueda, fijados, agrupación por fecha, renombrar inline, eliminar con deshacer; en Android se cierra al elegir un chat y admite gesto de deslizar.

### 7.4 Android / móvil

- PWA instalable (manifest, iconos, `theme-color`, service worker para el shell). Evaluar después TWA/Capacitor para Play Store.
- `100dvh`, `safe-area-inset-*`, `interactive-widget=resizes-content`, objetivos táctiles ≥ 48 dp, bottom sheets, Enter = salto de línea en móvil (enviar con el botón), `isComposing` respetado.
- Pruebas visuales automatizadas en Pixel 7 (412×915) y 360×800, más validación en un dispositivo físico antes del cutover.

### 7.5 Funciones de chat profesionales

| Función | Comportamiento v2 |
|---|---|
| Editar | Inline en la burbuja; crea una versión hermana y regenera; selector de versiones en el mensaje del usuario |
| Regenerar | Crea versión hermana del asistente; opción "Regenerar con otro modelo" |
| Continuar | Extiende respuestas cortadas (`length`) o detenidas |
| Detener | Aborta en el proveedor; guarda el parcial (`stopped`) |
| Reenviar tras error | Burbuja de error inline con reintento; el mensaje del usuario nunca se pierde |
| Bifurcar | "Continuar en un chat nuevo desde aquí" (RPC transaccional) con enlace "Bifurcado de…" |
| Versiones persistentes | `active_leaf_message_id` recuerda la rama elegida |
| Copiar / exportar | Copiar Markdown o texto, copiar código, exportar chat a `.md` |
| Compartir | Enlaces reales `/c/:id` (y más adelante enlaces públicos de solo lectura) |
| Estudio | Guardar en vocabulario, escuchar pronunciación (TTS), "Explícalo más simple", "Corrige mi frase" |
| Atajos | Ctrl+K paleta, Ctrl+Shift+O nuevo chat, Esc detener/cancelar, ↑ editar el último mensaje, `?` ayuda |

---

## 8. Calidad, pruebas y observabilidad

- **Unitarias (Vitest):** árbol de mensajes y versiones, reducer del ChatController, parser SSE v2, scroll-controller, markdown por bloques, adaptadores de proveedores (con fixtures reales de streams).
- **Componentes (Testing Library) + MSW** para la API.
- **E2E (Playwright)** contra un mock de Supabase versionado en el repo (evolución del usado en esta auditoría): paridad, "cero parpadeo" (sección 5.6), scroll, versiones, bifurcación; capturas de regresión visual en escritorio y Pixel 7.
- **Edge functions:** `deno test` + contrato de protocolo con zod. **SQL:** pruebas de RLS (pgTAP o scripts).
- **CI (GitHub Actions):** lint, typecheck, tests, build y preview de Cloudflare Pages por PR.
- **Observabilidad:** `usage` por mensaje (TTFT, tokens, duración) guardado en BD, `Server-Timing`, web-vitals (INP, LCP) y un reporter de errores del cliente con ErrorBoundary.

---

## 9. Seguridad

- CORS con lista de orígenes (producción + localhost), zod en todos los payloads, rate limiting por usuario en `/chat` y `/keys/validate`.
- Keys: sin lectura de `encrypted_key`/`iv` desde el cliente; caché de descifrado con invalidación; errores del proveedor saneados.
- JWT asimétrico (JWKS) y migración opcional a las nuevas claves publicables de Supabase.
- Validación de variables de entorno al arrancar (fallar ruidosamente en vez de usar `example.supabase.co`).

---

## 10. Plan de migración por fases

Tamaños relativos: S (≤2 días) · M (3–5 días) · L (1–2 semanas). Cada fase termina desplegable y sin romper la app actual.

| Fase | Tamaño | Alcance | Criterios de aceptación |
|---|---|---|---|
| **0. Fundaciones** | M | CI; mock de Supabase en el repo; tests E2E de caracterización de la app actual (paridad); feature flags; medición de línea base real (TTFT Groq, tiempos por etapa); limpieza de docs y mover `index.html` legacy a `legacy/` | CI verde; línea base documentada; suite de paridad cubre la checklist de la sección 11 |
| **0.5 Quick wins (opcional, recomendado)** | S | En la app actual: lateral sin "Cargando…" en refetch; precarga de `ChatView`; reconciliar optimistas; scroll solo al enviar; deltas incrementales compatibles; arreglar prewarm; botón "ir al final"; modelo activo correcto en `ProviderSelect`; quitar "Pro" inventado; Esc cierra ajustes/cancela edición; `isComposing` | Instrumentación: 0 desmontajes y 0 scroll forzado durante/al final del stream |
| **1. Gateway de chat v2** | L | Function `api` (Hono), JWKS, `chat_bootstrap`, registro de proveedores (Groq/DeepSeek/OpenRouter), protocolo v2, cancelación real, persistencia en segundo plano, `usage`. Convive con `chat-stream` | Paridad de respuestas; TTFT medido ≤ presupuesto; detener guarda parcial; mensaje del usuario nunca se pierde |
| **2. BD v2 (expand)** | M | Tablas/columnas nuevas, backfill (`messages.user_id`, `providers`, `model_by_provider`), RPCs, RLS optimizada, catálogo con caché y overrides | App actual sigue funcionando; pruebas de RLS verdes; consultas clave con índices |
| **3. Diseño** | M | Guía visual, tokens y **prototipos de alta fidelidad** (escritorio + Android) de las pantallas de 7.3 para tu aprobación | Diseños aprobados |
| **4. Frontend v2: esqueleto y motor** | L | App shell, rutas `/c/:id`, TanStack Query, design system, ChatStore/Controller, stream client v2, Markdown por bloques, scroll-controller. Detrás de flag (`?v2=1` o por usuario) | Tests "cero parpadeo" y scroll verdes; presupuestos de render cumplidos en Android emulado |
| **5. Funciones de chat pro** | M | Editar inline, regenerar (con otro modelo), versiones persistentes, continuar, detener, reintento inline, bifurcar, exportar, búsqueda | Checklist de paridad + funciones nuevas cubiertas por E2E |
| **6. Modelos y proveedores** | M | Paleta de modelos, búsqueda en vivo, capacidades/etiquetas, proveedores personalizados, gestión de keys rediseñada | Agregar un proveedor compatible = solo datos (sin despliegue de frontend) |
| **7. Configuración** | S | Diálogo por secciones registradas; ajustes sincronizados en BD | Agregar una sección = 1 archivo + registro |
| **8. Aprendizaje** | L | Perfil, palabras del día desde `lexicon`, guardar vocabulario, extracción opcional, repaso FSRS, cuaderno de errores, progreso, modos | Flujo completo guardar → repasar → progreso con datos persistidos |
| **9. Android, accesibilidad y rendimiento** | M | PWA, gestos, objetivos táctiles, auditoría a11y (teclado, lector de pantalla), presupuesto de JS, prueba en dispositivo físico | Lighthouse PWA/a11y ≥ 95; objetivos táctiles ≥ 48 dp; INP < 200 ms |
| **10. Cutover y contract** | S | v2 por defecto, periodo con opción de volver, eliminar `chat-stream`, columnas `active_model_*`, `turn_index` y código legacy | Sin incidencias durante el periodo de convivencia; rollback documentado |

Orden de dependencias: 0 → (0.5) → 1 ∥ 2 ∥ 3 → 4 → 5 → 6 ∥ 7 → 8 → 9 → 10.

---

## 11. Checklist de paridad (no se puede perder nada)

- [ ] Login con Google y callback; cierre de sesión
- [ ] Historial agrupado por fecha (Hoy, Ayer, 7 días, 30 días…), búsqueda con resaltado, renombrar, eliminar con confirmación, borrar todo
- [ ] Nuevo chat (botón, móvil y Ctrl+K), título automático
- [ ] Proveedores Groq/DeepSeek/OpenRouter, catálogo y selección de modelo por proveedor
- [ ] API keys: guardar (cifrado AES-GCM), validar, eliminar, pista `••••1234`
- [ ] Presets de prompt: crear, editar, duplicar, activar, eliminar; preset del sistema
- [ ] Notas persistentes inyectadas en el prompt; temperatura
- [ ] 7 temas × modo claro/oscuro; texturas de papel (fondo y global)
- [ ] Nivel de vocabulario (A1–C2) y tarjetas de práctica que lanzan un prompt guiado; "Otras palabras"
- [ ] Streaming con indicador "Preparando respuesta", detener
- [ ] Markdown (tablas, listas, citas, código con botón copiar), KaTeX
- [ ] Copiar mensaje, copiar conversación, compartir
- [ ] Editar, reintentar, versiones hermanas (1/N), ramificar conversación
- [ ] Anclaje del mensaje del usuario arriba al responder (mejorado según 5.5), enfoque automático del composer en desktop y primer toque en móvil
- [ ] Panel de diagnóstico (Ctrl+Shift+L) y badge de versión
- [ ] Atajos listados en Configuración (y que funcionen de verdad)

---

## 12. Decisiones abiertas (necesito tu confirmación)

1. **Tailwind v4 + shadcn/ui** como base del nuevo diseño (recomendado; habilita Streamdown).
2. **Mantener Supabase Edge Functions** para el gateway (recomendado) o moverlo a Cloudflare Workers junto a Pages.
3. **"Modo directo" experimental** para Groq (key solo en el dispositivo, máxima velocidad).
4. **Extracción automática** de vocabulario/errores usando tu API key (coste mínimo con un modelo 8B de Groq) o solo manual.
5. ¿Solo **inglés** como idioma objetivo o dejar la BD preparada para varios idiomas (el esquema propuesto ya lo permite)?
6. **PWA** instalable es suficiente o se planifica publicación en **Play Store**.
7. ¿Aplicamos la **Fase 0.5** ya, para quitar el parpadeo y el scroll-jacking en producción mientras se construye v2?

---

## Apéndice A — Mediciones

| Medición | Valor | Método |
|---|---|---|
| Lista del lateral desmontada al terminar una respuesta | 157 ms (latencia BD simulada 120 ms) | MutationObserver sobre `.conversation-list` |
| "Preparando conversación…" en el primer envío | ~300 ms | MutationObserver |
| Scroll forzado tras subir manualmente durante el stream | 100 → 1855 px en 400 ms | Sondeo de `scrollTop` |
| Amplificación SSE | 150.133 bytes para 1.268 caracteres (118×) | Respuesta simulada con el formato de producción |
| Extrapolación a 1.500 tokens | ~4,5 MB de SSE y 1.500 re-parseos de Markdown | Suma aritmética de deltas de ~4 caracteres |
| Peticiones al terminar un envío | 1× conversations + 2× messages (duplicado) | Log del mock |
| Alto del contenido de Configuración | 4.621 px en un viewport de 827 px | `scrollHeight` |
| Objetivos táctiles < 48 dp (Pixel 7) | 26×26 (renombrar/eliminar), 34×34 (barra superior), 42×42 (enviar) | `getBoundingClientRect` |
| Build | `tsc` y `eslint` limpios; JS inicial ≈ 157 KB gzip + CSS 6,8 KB | `vite build` |

## Apéndice B — Capturas

| Archivo | Contenido |
|---|---|
| `01-prod-escritorio-sin-sesion.png` | Producción sin sesión (escritorio) |
| `02-prod-android-sin-sesion.png` | Producción sin sesión (Pixel 7) |
| `03-escritorio-inicio.png` | Inicio con sesión (mock) |
| `04-escritorio-streaming.png` | Respuesta en streaming con Markdown parcial |
| `05-escritorio-config-api-keys.png` | Catálogo con "Pro" inventado y panel de keys sin estilos |
| `06-android-config.png` | Configuración en Android: el proveedor muestra el modelo por defecto |
| `07-android-historial.png` | Historial en Android |
