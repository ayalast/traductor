// @ts-nocheck
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, json } from '../_shared/responses.ts'
import { requireUser } from '../_shared/auth.ts'
import { decryptSecret } from '../_shared/crypto.ts'
import { PROVIDERS } from '../_shared/providers.ts'

// Modelos por defecto como fallback
const DEFAULT_MODELS = {
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
    { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-coder', name: 'DeepSeek Coder' },
  ],
  openrouter: [
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
  ],
}

async function fetchModelsFromProvider(provider, apiKey) {
  const config = PROVIDERS[provider]
  
  if (!config?.modelsEndpoint) {
    throw new Error(`No hay endpoint de modelos configurado para ${provider}`)
  }

  const extraHeaders =
    provider === 'openrouter'
      ? {
          'HTTP-Referer': Deno.env.get('APP_PUBLIC_URL') || 'http://localhost:5173',
          'X-Title': Deno.env.get('OPENROUTER_APP_NAME') || 'Mi Traductor',
        }
      : {}

  const response = await fetch(config.modelsEndpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Error HTTP ${response.status}: ${errorText || 'Sin detalles'}`)
  }

  const data = await response.json()
  return parseModelsResponse(provider, data)
}

function parseModelsResponse(provider, data) {
  // Groq y OpenRouter usan formato OpenAI
  if (provider === 'groq' || provider === 'openrouter') {
    if (!data?.data || !Array.isArray(data.data)) {
      throw new Error('Formato de respuesta inválido')
    }
    
    return data.data
      .filter(model => model.id && !model.id.includes('whisper')) // Filtrar modelos no-chat
      .map(model => ({
        id: model.id,
        name: model.id.split('/').pop() || model.id, // Simplificar nombre
        context_length: model.context_length,
        created: model.created,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  // DeepSeek tiene su propio formato
  if (provider === 'deepseek') {
    if (!Array.isArray(data)) {
      throw new Error('Formato de respuesta inválido')
    }
    
    return data.map(model => ({
      id: model.id || model.model,
      name: model.name || model.id || model.model,
    }))
  }

  throw new Error(`Proveedor no soportado: ${provider}`)
}

Deno.serve(async (request) => {
  const cors = handleCors(request)
  if (cors) return cors

  if (request.method !== 'GET') {
    return errorResponse('Método no permitido.', 405)
  }

  try {
    const { client, user } = await requireUser(request)
    const url = new URL(request.url)
    const provider = url.searchParams.get('provider')

    if (!provider || !(provider in PROVIDERS)) {
      return errorResponse('provider inválido.', 400)
    }

    // Intentar obtener la API key del usuario
    const { data: credData, error: credError } = await client
      .from('provider_credentials')
      .select('encrypted_key, iv')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle()

    // Si no hay credenciales, devolver modelos por defecto
    if (credError || !credData?.encrypted_key) {
      return json({
        ok: true,
        provider,
        models: DEFAULT_MODELS[provider] || [],
        source: 'default',
        note: 'Usando modelos por defecto. Configura tu API key para ver el catálogo completo.',
      })
    }

    // Intentar descifrar y consultar modelos reales
    try {
      const apiKey = await decryptSecret(credData.encrypted_key, credData.iv)
      const models = await fetchModelsFromProvider(provider, apiKey)

      return json({
        ok: true,
        provider,
        models,
        source: 'api',
        count: models.length,
      })
    } catch (fetchError) {
      // Si falla la consulta, devolver modelos por defecto con advertencia
      console.error(`Error fetching models for ${provider}:`, fetchError)
      
      return json({
        ok: true,
        provider,
        models: DEFAULT_MODELS[provider] || [],
        source: 'default_fallback',
        error: fetchError.message,
        note: 'No se pudo consultar el catálogo remoto. Usando modelos por defecto.',
      })
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Error interno.', 500)
  }
})
