// @ts-nocheck
import { handleCors } from '../_shared/cors.ts'
import { errorResponse, json } from '../_shared/responses.ts'
import { requireUser } from '../_shared/auth.ts'

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

    if (!provider) {
      return errorResponse('provider es obligatorio.', 400)
    }

    const { error } = await client
      .from('provider_credentials')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (error) {
      return errorResponse(error.message, 500)
    }

    return json({ ok: true, provider })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Error interno.', 500)
  }
})
