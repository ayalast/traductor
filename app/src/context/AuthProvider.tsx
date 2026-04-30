import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import { AuthContext, type AuthContextValue, type AuthUser } from './authContext'
import { supabase } from '../lib/supabase'

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

function getInitialSession(): Session | null {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    if (!supabaseUrl) return null

    const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
    const projectRef = match?.[1]
    if (!projectRef) return null

    const key = `sb-${projectRef}-auth-token`
    const stored = localStorage.getItem(key)
    if (!stored) return null

    const parsed = JSON.parse(stored)
    if (!parsed?.access_token || !parsed?.user) return null

    if (parsed.expires_at && parsed.expires_at * 1000 < Date.now()) return null

    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token ?? '',
      expires_in: parsed.expires_in ?? 3600,
      expires_at: parsed.expires_at ?? 0,
      token_type: parsed.token_type ?? 'bearer',
      user: parsed.user,
    } as Session
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(getInitialSession)
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session ?? null)
      setIsVerifying(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setIsVerifying(false)
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

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(user),
      isLoading: isVerifying && !user,
      user,
      session,
      signInWithGoogle,
      signOut,
    }),
    [user, session, isVerifying],
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
