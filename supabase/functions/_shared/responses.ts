// @ts-nocheck
import { corsHeaders } from './cors.ts'

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

export function errorResponse(message: string, status = 400) {
  return json({ ok: false, error: message }, status)
}
