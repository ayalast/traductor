// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'

export function createServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function requireUser(request: Request) {
  const authorization = request.headers.get('Authorization')

  if (!authorization) {
    throw new Error('Falta encabezado Authorization.')
  }

  const token = authorization.replace('Bearer ', '').trim()
  const client = createServiceClient()
  const { data, error } = await client.auth.getUser(token)

  if (error || !data.user) {
    throw new Error('No se pudo validar la sesión del usuario.')
  }

  return { client, user: data.user, token }
}
