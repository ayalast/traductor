import { useState } from 'react'

import { useAuth } from '../../hooks/useAuth'

type GoogleLoginButtonProps = {
  disabled?: boolean
}

export function GoogleLoginButton({ disabled = false }: GoogleLoginButtonProps) {
  const { signInWithGoogle } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    try {
      setIsSubmitting(true)
      setError(null)
      await signInWithGoogle()
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'No se pudo iniciar sesión con Google.')
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <button className="primary-btn" type="button" disabled={disabled || isSubmitting} onClick={handleClick}>
        {isSubmitting ? 'Redirigiendo a Google...' : 'Continuar con Google'}
      </button>
      {error ? <p style={{ color: '#fda4af' }}>{error}</p> : null}
    </div>
  )
}
