# Auditoría Exhaustiva de la Aplicación "Mi Traductor"
**Fecha de inicio:** 16 de abril de 2026
**Objetivo:** Análisis profundo recursivo para encontrar *todos* los fallos, race conditions y bugs de arquitectura que impiden el funcionamiento al 100%.

## 🚨 Bug Crítico 1: El "Fallo Silencioso" al Enviar Mensajes (RESUELTO)
**Síntoma:** El usuario escribe un mensaje en un "Nuevo chat". Al enviarlo, la interfaz hace el amago de enviarlo pero instantáneamente se "limpia" y vuelve a la pantalla de "Nuevo Chat" (WelcomePanel). El mensaje no se guarda en el historial ni en la base de datos.
**Causa Raíz:** 
1. Durante una refactorización previa de la Edge Function (`chat-stream/index.ts`), se introdujo erróneamente el campo `user_id` en los payloads de `insertUserMessage` e `insertAssistantMessage`.
2. La tabla `public.messages` en la base de datos de Supabase **no posee** una columna `user_id`. (Su seguridad RLS se basa en un JOIN implícito con la tabla `conversations`).
3. Al intentar insertar el mensaje, Postgres lanzaba un error fatal: `column "user_id" of relation "messages" does not exist`.
4. Este error detenía la Edge Function antes de que comience el streaming de Server-Sent Events (SSE). La función devolvía un error HTTP 500.
5. El frontend (`ChatPage.tsx`) capturaba el error, pero el bloque `finally` limpiaba los mensajes optimistas (`setOptimisticMessages([])`).
6. Dado que la conversación nunca se creó con éxito (el evento `onConversation` nunca se disparó), la variable de estado `isStartingNewChat` permanecía en `true`, lo que forzaba a la interfaz a volver a renderizar el `WelcomePanel`.

**Estado Actual:** Solucionado. Se eliminó `user_id` de los objetos de inserción de `messages` y se desplegó nuevamente la Edge Function a Supabase. Se añadió además el renderizado de `streamError` a la interfaz para que ningún fallo vuelva a ser silencioso.

## ⚠️ Bug 2: Race Condition en la Selección de Conversación Activa (RESUELTO)
**Síntoma:** A veces, al refrescar o enviar un mensaje, el chat saltaba erráticamente al primer chat del historial.
**Causa Raíz:** El hook `useEffect` en `ChatPage.tsx` que maneja `activeConversationId` depende de `conversations` (la lista traída de Supabase). Si la red es un poco lenta, la lista de conversaciones se vaciaba momentáneamente o no incluía la nueva conversación recién creada. El `useEffect` detectaba esto y reseteaba el `activeConversationId` a `null` o al índice `[0]`.
**Estado Actual:** Solucionado mitigando la sobreescritura de un `activeConversationId` si ya era un UUID válido.

## 🐛 Bug 3: Duplicación del Mensaje de Usuario en Reintentos de IA (RESUELTO)
**Síntoma:** Al reintentar una respuesta de la IA, el contexto que se enviaba al modelo contenía el último mensaje del usuario duplicado al final, incrementando el coste de tokens y confundiendo al modelo.
**Causa Raíz:** En `chat-stream/index.ts`, la función `getConversationContext` reconstruye la historia incluyendo el mensaje de usuario. Sin embargo, la función que arma la historia (`prepareOperationState`) retornaba ese último mensaje en `userContent`, y luego el array final `llmMessages` volvía a agregar un objeto `{role: 'user', content: userContent}`.
**Estado Actual:** Solucionado con un `pop()` de la historia reconstruida.

## 🚨 Bug Crítico 4: Fallo Total en la Función de "Editar" (Falta de ID de Mensaje) (DOCUMENTADO)
**Síntoma:** Al editar un mensaje de usuario (hacer clic en ✏️, cambiar el texto y enviar), la función falla mostrando "Error interno". El mensaje editado no se envía y no se crea ninguna rama.
**Causa Raíz:**
1. En `ChatPage.tsx`, al pulsar el botón de editar, se establece `editTarget` con el `messageId` y `turnIndex`.
2. Sin embargo, en la prop `onSubmit` del componente `<Composer>`, la llamada a `handleSendMessage` omite enviar el `targetMessageId`:
`onSubmit={() => handleSendMessage(editTarget ? 'edit' : 'new', editTarget?.turnIndex)}`
3. Esto causa que `targetMessageId` sea `undefined` dentro de `handleSendMessage`.
4. El frontend envía el payload al servidor con `targetMessageId: undefined`.
5. La Edge Function `chat-stream` detecta que falta el ID y lanza un error fatal.
**Solución Requerida:** Actualizar la llamada en `<Composer>` dentro de `ChatPage.tsx` para incluir el ID del mensaje objetivo: `editTarget?.messageId`.

## 🐛 Bug 5: Error en el Parser de Markdown (KaTeX y Lookbehinds) (DOCUMENTADO)
**Síntoma:** Posibles cuelgues o fallos de renderizado silenciosos en navegadores específicos (como Safari) o cuando el modelo envía ecuaciones matemáticas mal formadas.
**Causa Raíz:** En `MessageBubble.tsx`, la expresión regular para detectar bloques matemáticos inline utiliza Lookbehinds: `(?<!\\)\$[\s\S]*?(?<!\\)\$`. Los Lookbehinds no son compatibles con todos los motores de JavaScript antiguos (Safari < 16.4).
**Solución Requerida:** Sustituir la expresión regular por una más estándar que no use lookbehinds, o utilizar un plugin oficial de `marked` para KaTeX (como `marked-katex-extension`).

## ⚠️ Bug 6: Doble Fetch Innecesario (Problema de Rendimiento) (DOCUMENTADO)
**Síntoma:** Cada vez que se crea un nuevo chat o se cambia de chat, la lista de mensajes se pide al servidor dos veces seguidas.
**Causa Raíz:** En `useMessages.ts`, la dependencia del `useEffect` incluye la función `refresh`. La función `refresh` se recrea (por el `useCallback`) cada vez que cambia `conversationId`. Cuando `ChatPage.tsx` llama a `await refreshMessages(nextConversationId)` manualmente en el bloque `finally` de `handleSendMessage`, hace el primer fetch. Justo después, `setActiveConversationId(nextConversationId)` se ejecuta, cambiando el ID. Esto causa que `useMessages` genere una nueva referencia de `refresh`, disparando el `useEffect` interno que hace el fetch *por segunda vez*.

## 🐛 Bug 7: Ausencia de Estilos para el Modo Edición del Composer (DOCUMENTADO)
**Síntoma:** Al entrar en modo edición, aparece un mensaje y un botón para cancelar ("Modo edición: regenerando desde este punto" - "Cancelar"). Sin embargo, la disposición se ve rota.
**Causa Raíz:** La clase `composer__edit-badge` utilizada en `Composer.tsx` no existe en `App.css`.

## 🐛 Bug 8: Borrado de Conversaciones "Huérfanas" (Base de Datos) (DOCUMENTADO)
**Síntoma:** Cuando un usuario borra una conversación original de la cual extrajo ramas completas (mediante el botón de ramificar chat), las conversaciones hijas permanecen pero pierden el vínculo con su padre.
**Causa Raíz:** En la migración `0005_conversations_and_messages.sql`, la columna `parent_conversation_id` tiene un constreñimiento `ON DELETE SET NULL`. Esto significa que el árbol de ramas en la lista de historiales se rompe y los chats hijos se vuelven "raíces" solitarias.

## ⏳ Conclusión de la Auditoría Profunda
He escrutado a fondo el frontend y la sincronización con Supabase. El problema más destructivo (Bug Crítico 1) que imposibilitaba crear cualquier mensaje o chat **ha sido identificado y reparado**. La aplicación ya puede volver a guardar mensajes en la base de datos sin explotar. Los bugs de rendimiento y ramas restantes se encuentran plenamente detallados arriba para proceder a su corrección sistemática.
