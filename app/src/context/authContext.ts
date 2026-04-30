import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthUser = {
  id: string
  name: string
  email: string
  avatarFallback: string
}

export type AuthContextValue = {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  session: Session | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
