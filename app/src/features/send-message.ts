import { supabase } from '../lib/supabase'
import type { ProviderId } from '../lib/providers'

export type ChatStreamMode = 'new' | 'edit' | 'retry'

export type StreamChatPayload = {
  conversationId: string | null
  mode: ChatStreamMode
  input: string
  provider: ProviderId
  model: string
  temperature: number
  presetId: string | null
  targetTurnIndex?: number
  parentMessageId?: string | null
  targetMessageId?: string | null
}

export type StreamChatCallbacks = {
  onConversation?: (conversationId: string) => void
  onDelta?: (text: string) => void
  onDone?: (payload: { messageId?: string; conversationId?: string; userMessageId?: string }) => void
  onError?: (message: string) => void
}

function getFunctionsBaseUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined

  if (!supabaseUrl) {
    throw new Error('Falta VITE_SUPABASE_URL para conectar con Supabase Functions.')
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`
}

function parseEventStreamChunk(chunk: string, callbacks: StreamChatCallbacks, accumulatedText: string) {
  const events = chunk.split('\n\n')
  let nextAccumulatedText = accumulatedText

  for (const event of events) {
    const lines = event
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (!lines.length) continue

    const eventName = lines.find((line) => line.startsWith('event:'))?.replace('event:', '').trim()
    const dataLine = lines.find((line) => line.startsWith('data:'))?.replace('data:', '').trim()

    if (!eventName || !dataLine) continue

    try {
      const payload = JSON.parse(dataLine) as Record<string, string>

      if (eventName === 'conversation' && payload.conversationId) {
        callbacks.onConversation?.(payload.conversationId)
      }

      if (eventName === 'delta' && payload.text) {
        nextAccumulatedText = payload.text
        callbacks.onDelta?.(nextAccumulatedText)
      }

      if (eventName === 'done') {
        callbacks.onDone?.({
          messageId: payload.messageId,
          conversationId: payload.conversationId,
          userMessageId: payload.userMessageId,
        })
      }

      if (eventName === 'error') {
        callbacks.onError?.(payload.message || 'Ocurrió un error durante el streaming.')
      }
    } catch {
      callbacks.onError?.('No se pudo interpretar una parte del stream de respuesta.')
    }
  }

  return nextAccumulatedText
}

export async function streamChatMessage(
  payload: StreamChatPayload,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('No hay una sesión activa para enviar mensajes al backend.')
  }

  const response = await fetch(`${getFunctionsBaseUrl()}/chat-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `Error HTTP ${response.status} al invocar chat-stream.`)
  }

  if (!response.body) {
    throw new Error('La función chat-stream no devolvió un cuerpo de respuesta.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulatedText = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const completeEvents = buffer.split('\n\n')
    buffer = completeEvents.pop() || ''

    accumulatedText = parseEventStreamChunk(completeEvents.join('\n\n'), callbacks, accumulatedText)
  }

  if (buffer.trim()) {
    accumulatedText = parseEventStreamChunk(buffer, callbacks, accumulatedText)
  }

  return accumulatedText
}
