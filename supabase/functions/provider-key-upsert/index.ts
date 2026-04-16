// @ts-nocheck
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, json } from '../_shared/responses.ts'
import { requireUser } from '../_shared/auth.ts'
import { encryptSecret, maskSecret } from '../_shared/crypto.ts'

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
    const apiKey = body?.apiKey?.trim?.()

    if (!provider || !apiKey) {
      return errorResponse('provider y apiKey son obligatorios.', 400)
    }

    const encrypted = await encryptSecret(apiKey)

    const { error } = await client.from('provider_credentials').upsert({
      user_id: user.id,
      provider,
      encrypted_key: encrypted.encryptedText,
      iv: encrypted.iv,
      algorithm: encrypted.algorithm,
      key_hint: maskSecret(apiKey),
      validation_status: 'unknown',
    })

    if (error) {
      return errorResponse(error.message, 500)
    }

    return json({
      ok: true,
      provider,
      keyHint: maskSecret(apiKey),
      validationStatus: 'unknown',
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Error interno.', 500)
  }
})
