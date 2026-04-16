import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'

export type AuthUser = {
  id: string
  name: string
  email: string
  avatarFallback: string
}

function mapSessionToUser(session: Session | null): AuthUser | null {
  const user = session?.user

  if (!user) {
    return null
  }

  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    'Usuario'

  return {
    id: user.id,
    name: fullName,
    email: user.email ?? '',
    avatarFallback: fullName.slice(0, 1).toUpperCase() || 'U',
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session ?? null)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const user = useMemo(() => mapSessionToUser(session), [session])

  const signInWithGoogle = async () => {
    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }
  }

  return {
    isAuthenticated: Boolean(user),
    isLoading,
    user,
    session,
    signInWithGoogle,
    signOut,
  }
}
