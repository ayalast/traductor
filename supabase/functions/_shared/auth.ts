// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'

let serviceClient = null

export function createServiceClient() {
  if (serviceClient) return serviceClient

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  }

  serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return serviceClient
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

async function verifyJwtLocally(token: string) {
  const secret = Deno.env.get('SUPABASE_JWT_SECRET') || Deno.env.get('JWT_SECRET')
  if (!secret) return null

  const [headerPart, payloadPart, signaturePart] = token.split('.')
  if (!headerPart || !payloadPart || !signaturePart) return null

  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(headerPart)))
  if (header.alg !== 'HS256') return null

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    decodeBase64Url(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  )

  if (!isValid) return null

  const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadPart)))
  if (!claims.sub) return null
  if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) return null

  return {
    id: claims.sub,
    email: claims.email ?? '',
    role: claims.role,
    aud: claims.aud,
    app_metadata: claims.app_metadata ?? {},
    user_metadata: claims.user_metadata ?? {},
  }
}

export async function requireUser(request: Request) {
  const authorization = request.headers.get('Authorization')

  if (!authorization) {
    throw new Error('Falta encabezado Authorization.')
  }

  const token = authorization.replace('Bearer ', '').trim()
  const client = createServiceClient()
  const localUser = await verifyJwtLocally(token).catch(() => null)

  if (localUser) {
    return { client, user: localUser, token }
  }

  const { data, error } = await client.auth.getUser(token)

  if (error || !data.user) {
    throw new Error('No se pudo validar la sesión del usuario.')
  }

  return { client, user: data.user, token }
}
