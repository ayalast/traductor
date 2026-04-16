// @ts-nocheck
import { handleCors, corsHeaders } from '../_shared/cors.ts'
import { errorResponse } from '../_shared/responses.ts'
import { requireUser } from '../_shared/auth.ts'
import { decryptSecret } from '../_shared/crypto.ts'
import { PROVIDERS } from '../_shared/providers.ts'

function createTitleFromInput(input: string) {
  const normalized = input.replace(/\s+/g, ' ').trim()
  if (!normalized) return 'Nuevo chat'
  return normalized.slice(0, 60)
}

function encodeSse(event: string, data: Record<string, unknown>) {
  const encoder = new TextEncoder()
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

async function getConversationContext(client, conversationId, options = {}) {
  let query = client
    .from('messages')
    .select('role, content, turn_index')
    .eq('conversation_id', conversationId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })

  if (options.beforeTurnIndex != null) {
    query = query.lt('turn_index', options.beforeTurnIndex)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`No se pudo cargar el historial del chat: ${error.message}`)
  }

  return (data ?? []).map((item) => ({
    role: item.role,
    content: item.content,
  }))
}

async function getNextTurnIndex(client, conversationId) {
  const { data, error } = await client
    .from('messages')
    .select('turn_index')
    .eq('conversation_id', conversationId)
    .order('turn_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo calcular el siguiente turno: ${error.message}`)
  }

  return (data?.turn_index ?? 0) + 1
}

async function getLatestUserMessage(client, conversationId) {
  const { data, error } = await client
    .from('messages')
    .select('id, content, turn_index')
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .order('turn_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo cargar el último mensaje del usuario: ${error.message}`)
  }

  if (!data) {
    throw new Error('No existe un mensaje de usuario para reintentar.')
  }

  return data
}

async function resolvePresetAndNotes(client, userId, requestedPresetId) {
  const { data: prefs, error: prefsError } = await client
    .from('user_preferences')
    .select('active_preset_id, notes')
    .eq('user_id', userId)
    .maybeSingle()

  if (prefsError) {
    throw new Error(`No se pudieron cargar las preferencias del usuario: ${prefsError.message}`)
  }

  const presetId = requestedPresetId || prefs?.active_preset_id

  if (!presetId) {
    throw new Error('No existe un preset activo para este usuario.')
  }

  const { data: preset, error: presetError } = await client
    .from('prompt_presets')
    .select('id, prompt')
    .eq('id', presetId)
    .eq('user_id', userId)
    .single()

  if (presetError || !preset) {
    throw new Error(`No se pudo cargar el preset activo: ${presetError?.message || 'Preset inexistente.'}`)
  }

  const notes = prefs?.notes?.trim?.() || ''
  const systemPrompt = `${preset.prompt}${notes ? `\n\nNotas persistentes del usuario:\n${notes}` : ''}`

  return {
    presetId: preset.id,
    systemPrompt,
  }
}

async function resolveConversation(client, userId, payload, presetId) {
  if (payload.conversationId) {
    const { data: conversation, error } = await client
      .from('conversations')
      .select('id, user_id, provider, model, temperature, preset_id')
      .eq('id', payload.conversationId)
      .eq('user_id', userId)
      .single()

    if (error || !conversation) {
      throw new Error(`No se pudo cargar la conversación solicitada: ${error?.message || 'No encontrada.'}`)
    }

    return conversation
  }

  const title = createTitleFromInput(payload.input)

  const { data: created, error: createError } = await client
    .from('conversations')
    .insert({
      user_id: userId,
      title,
      provider: payload.provider,
      model: payload.model,
      temperature: payload.temperature,
      preset_id: presetId,
      archived: false,
      branch_depth: 0,
    })
    .select('id, user_id, provider, model, temperature, preset_id')
    .single()

  if (createError || !created) {
    throw new Error(`No se pudo crear la conversación: ${createError?.message || 'Error desconocido.'}`)
  }

  return created
}

async function getProviderKey(client, userId, provider) {
  const { data, error } = await client
    .from('provider_credentials')
    .select('encrypted_key, iv')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo cargar la API key del proveedor: ${error.message}`)
  }

  if (!data?.encrypted_key) {
    throw new Error(`No existe una API key guardada para ${provider}.`)
  }

  return decryptSecret(data.encrypted_key, data.iv)
}

async function updateConversationMetadata(client, conversationId, payload, presetId, titleFallback) {
  const updates = {
    provider: payload.provider,
    model: payload.model,
    temperature: payload.temperature,
    preset_id: presetId,
    updated_at: new Date().toISOString(),
  }

  if (titleFallback) {
    updates.title = titleFallback
  }

  const { error } = await client.from('conversations').update(updates).eq('id', conversationId)

  if (error) {
    throw new Error(`No se pudo actualizar la conversación: ${error.message}`)
  }
}

async function insertUserMessage(client, conversationId, input) {
  const turnIndex = await getNextTurnIndex(client, conversationId)

  const { data, error } = await client
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: input,
      turn_index: turnIndex,
      status: 'complete',
    })
    .select('id, turn_index, content')
    .single()

  if (error || !data) {
    throw new Error(`No se pudo guardar el mensaje del usuario: ${error?.message || 'Error desconocido.'}`)
  }

  return data
}

async function updateUserMessageForEdit(client, conversationId, turnIndex, content) {
  const { data, error } = await client
    .from('messages')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('turn_index', turnIndex)
    .eq('role', 'user')
    .select('id, turn_index, content')
    .single()

  if (error || !data) {
    throw new Error(`No se pudo actualizar el mensaje editado: ${error?.message || 'Error desconocido.'}`)
  }

  return data
}

async function deleteMessagesAfterTurn(client, conversationId, turnIndex) {
  const { error } = await client
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('role', 'assistant')
    .eq('turn_index', turnIndex)

  if (error) {
    throw new Error(`No se pudo limpiar la respuesta previa del turno editado: ${error.message}`)
  }

  const { error: futureError } = await client
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId)
    .gt('turn_index', turnIndex)

  if (futureError) {
    throw new Error(`No se pudieron limpiar los mensajes posteriores: ${futureError.message}`)
  }
}

async function deleteAssistantForRetry(client, conversationId, turnIndex) {
  const { error } = await client
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('role', 'assistant')
    .eq('turn_index', turnIndex)

  if (error) {
    throw new Error(`No se pudo limpiar la última respuesta del asistente: ${error.message}`)
  }
}

async function insertAssistantMessage(client, conversationId, turnIndex, content, reasoningSummary = null) {
  const { data, error } = await client
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content,
      turn_index: turnIndex,
      status: 'complete',
      reasoning_summary: reasoningSummary,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`No se pudo guardar el mensaje del asistente: ${error?.message || 'Error desconocido.'}`)
  }

  return data.id
}

function extractReasoningSummary(content) {
  // Intenta extraer razonamiento del contenido
  // Busca patrones comunes de razonamiento en respuestas de LLMs
  
  if (!content || content.length < 50) {
    return null
  }

  // Buscar secciones explícitas de razonamiento
  const reasoningPatterns = [
    /(?:^|\n)(?:##?\s*)?(?:Razonamiento|Reasoning|Análisis|Analysis|Pensamiento|Thinking)[:\s]*\n([\s\S]{50,500}?)(?:\n##?|\n\n|$)/i,
    /(?:^|\n)(?:Explicación|Explanation|Justificación|Justification)[:\s]*\n([\s\S]{50,500}?)(?:\n##?|\n\n|$)/i,
  ]

  for (const pattern of reasoningPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return match[1].trim().slice(0, 500)
    }
  }

  // Si no hay sección explícita, extraer las primeras oraciones como contexto
  const sentences = content.split(/[.!?]+\s+/).filter(s => s.trim().length > 20)
  if (sentences.length >= 2) {
    const summary = sentences.slice(0, 2).join('. ').trim()
    return summary.length > 500 ? summary.slice(0, 497) + '...' : summary
  }

  return null
}

async function prepareOperationState(client, conversationId, payload) {
  const mode = payload.mode || 'new'

  if (mode === 'edit') {
    if (payload.targetTurnIndex == null) {
      throw new Error('Para editar se requiere targetTurnIndex.')
    }

    const normalizedInput = payload.input?.trim?.()
    if (!normalizedInput) {
      throw new Error('Para editar se requiere un input no vacío.')
    }

    await deleteMessagesAfterTurn(client, conversationId, payload.targetTurnIndex)
    const userMessage = await updateUserMessageForEdit(client, conversationId, payload.targetTurnIndex, normalizedInput)
    const history = await getConversationContext(client, conversationId, { beforeTurnIndex: payload.targetTurnIndex })

    return {
      history,
      userMessage,
      userContent: normalizedInput,
    }
  }

  if (mode === 'retry') {
    const latestUserMessage = await getLatestUserMessage(client, conversationId)
    await deleteAssistantForRetry(client, conversationId, latestUserMessage.turn_index)
    const history = await getConversationContext(client, conversationId, {
      beforeTurnIndex: latestUserMessage.turn_index,
    })

    return {
      history,
      userMessage: latestUserMessage,
      userContent: latestUserMessage.content,
    }
  }

  const userMessage = await insertUserMessage(client, conversationId, payload.input.trim())
  const history = await getConversationContext(client, conversationId, { beforeTurnIndex: userMessage.turn_index })

  return {
    history,
    userMessage,
    userContent: payload.input.trim(),
  }
}

async function callProviderWithStreaming({ provider, apiKey, model, temperature, messages, onDelta }) {
  const config = PROVIDERS[provider]

  if (!config) {
    throw new Error(`Proveedor no soportado: ${provider}`)
  }

  const extraHeaders =
    provider === 'openrouter'
      ? {
          'HTTP-Referer': Deno.env.get('APP_PUBLIC_URL') || 'http://localhost:5173',
          'X-Title': Deno.env.get('OPENROUTER_APP_NAME') || 'Mi Traductor',
        }
      : {}

  const response = await fetch(config.chatEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      temperature,
      stream: true,
      max_tokens: 1500,
      messages,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `Error HTTP ${response.status} al llamar al proveedor.`)
  }

  if (!response.body) {
    throw new Error('El proveedor no devolvió un cuerpo de streaming.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalText = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''

    for (const event of events) {
      const lines = event
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => line.startsWith('data:'))

      for (const line of lines) {
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue

        try {
          const parsed = JSON.parse(payload)
          const delta =
            parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content ?? ''

          if (!delta) continue

          finalText += delta
          onDelta(finalText)
        } catch {
          continue
        }
      }
    }
  }

  return finalText.trim()
}

Deno.serve(async (request) => {
  const cors = handleCors(request)
  if (cors) return cors

  if (request.method !== 'POST') {
    return errorResponse('Método no permitido.', 405)
  }

  try {
    const { client, user } = await requireUser(request)
    const payload = await request.json()

    if (!payload?.provider || !PROVIDERS[payload.provider]) {
      return errorResponse('El provider enviado no es válido.', 400)
    }

    if (!payload?.model) {
      return errorResponse('El model es obligatorio.', 400)
    }

    const mode = payload.mode || 'new'

    if (mode === 'new' || mode === 'edit') {
      if (!payload?.input?.trim?.()) {
        return errorResponse('El campo input es obligatorio para este modo.', 400)
      }
    }

    if ((mode === 'edit' || mode === 'retry') && !payload?.conversationId) {
      return errorResponse('conversationId es obligatorio para edit y retry.', 400)
    }

    const { presetId, systemPrompt } = await resolvePresetAndNotes(client, user.id, payload.presetId)
    const conversation = await resolveConversation(client, user.id, payload, presetId)
    const conversationId = conversation.id
    const providerKey = await getProviderKey(client, user.id, payload.provider)
    const titleFallback = !payload.conversationId && mode === 'new' ? createTitleFromInput(payload.input) : null

    await updateConversationMetadata(client, conversationId, payload, presetId, titleFallback)

    const { history, userMessage, userContent } = await prepareOperationState(client, conversationId, payload)
    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userContent },
    ]

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encodeSse('conversation', { conversationId }))

          const finalText = await callProviderWithStreaming({
            provider: payload.provider,
            apiKey: providerKey,
            model: payload.model,
            temperature: payload.temperature,
            messages: llmMessages,
            onDelta: (text) => {
              controller.enqueue(encodeSse('delta', { text }))
            },
          })

          const safeFinalText = finalText || 'Sin respuesta del modelo.'
          const reasoningSummary = extractReasoningSummary(safeFinalText)
          const messageId = await insertAssistantMessage(
            client,
            conversationId,
            userMessage.turn_index,
            safeFinalText,
            reasoningSummary
          )

          await updateConversationMetadata(client, conversationId, payload, presetId, null)

          controller.enqueue(encodeSse('done', { messageId, conversationId }))
          controller.close()
        } catch (error) {
          controller.enqueue(
            encodeSse('error', {
              message: error instanceof Error ? error.message : 'Error interno durante el streaming.',
            }),
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Error interno.', 500)
  }
})
