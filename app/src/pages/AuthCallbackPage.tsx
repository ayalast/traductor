import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const completeSession = async () => {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href)

      if (exchangeError) {
        if (!isMounted) return
        setError(exchangeError.message)
        return
      }

      const { data, error: sessionError } = await supabase.auth.getSession()

      if (!isMounted) return

      if (sessionError) {
        setError(sessionError.message)
        return
      }

      if (data.session) {
        navigate('/', { replace: true })
        return
      }

      setError('No se pudo completar la sesión de Google.')
    }

    void completeSession()

    return () => {
      isMounted = false
    }
  }, [navigate])

  return (
    <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '30rem', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '0.75rem' }}>Conectando tu sesión</h1>
        {error ? (
          <p style={{ color: '#fda4af' }}>{error}</p>
        ) : (
          <p>Estamos completando el acceso con Google y preparando tu espacio sincronizado.</p>
        )}
      </div>
    </main>
  )
}
