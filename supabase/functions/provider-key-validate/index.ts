// @ts-nocheck
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, json } from '../_shared/responses.ts'
import { requireUser } from '../_shared/auth.ts'
import { decryptSecret } from '../_shared/crypto.ts'
import { PROVIDERS } from '../_shared/providers.ts'

/**
 * Valida una API key haciendo una llamada de prueba al proveedor
 */
async function validateApiKey(provider, apiKey) {
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

  try {
    // Intentar listar modelos como prueba de validación
    const response = await fetch(config.modelsEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      signal: AbortSignal.timeout(10000), // 10 segundos timeout
    })

    if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        status: 'invalid',
        message: 'API key inválida o sin permisos',
        httpStatus: response.status,
      }
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return {
        valid: false,
        status: 'error',
        message: `Error HTTP ${response.status}`,
        details: errorText.slice(0, 200),
      }
    }

    // Si llegamos aquí, la key es válida
    const data = await response.json()
    const modelCount = Array.isArray(data?.data) ? data.data.length : (Array.isArray(data) ? data.length : 0)

    return {
      valid: true,
      status: 'valid',
      message: 'API key válida',
      modelCount,
    }
  } catch (error) {
    if (error.name === 'TimeoutError') {
      return {
        valid: false,
        status: 'timeout',
        message: 'Timeout al validar la API key',
      }
    }

    return {
      valid: false,
      status: 'error',
      message: error.message || 'Error al validar la API key',
    }
  }
}

Deno.serve(async (request) => {
  const cors = handleCors(request)
  if (cors) return cors

  if (request.method !== 'POST') {
    return errorResponse('Método no permitido.', 405)
  }

  try {
    const { client, user } = await requireUser(request)
    const body = await request.json()
    const provider = body?.provider

    if (!provider || !(provider in PROVIDERS)) {
      return errorResponse('provider inválido.', 400)
    }

    // Obtener la API key cifrada
    const { data: credData, error: credError } = await client
      .from('provider_credentials')
      .select('encrypted_key, iv, algorithm')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle()

    if (credError || !credData?.encrypted_key) {
      return errorResponse('No existe una API key guardada para este proveedor.', 404)
    }

    // Descifrar la API key
    const apiKey = await decryptSecret(credData.encrypted_key, credData.iv, credData.algorithm)

    // Validar la API key
    const validation = await validateApiKey(provider, apiKey)

    // Actualizar el estado de validación en la base de datos
    const validationStatus = validation.valid
      ? 'valid'
      : validation.status === 'invalid'
        ? 'invalid'
        : 'unknown'

    await client
      .from('provider_credentials')
      .update({
        validation_status: validationStatus,
        validated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('provider', provider)

    return json({
      ok: true,
      provider,
      validation,
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Error interno.', 500)
  }
})
