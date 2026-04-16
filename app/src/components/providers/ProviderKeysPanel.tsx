import { useMemo, useState } from 'react'

import { deleteProviderKey, upsertProviderKey, validateProviderKey } from '../../lib/api'
import { PROVIDER_LIST, type ProviderId } from '../../lib/providers'
import type { ProviderCredentialRecord } from '../../hooks/useProviderCredentials'

type ProviderKeysPanelProps = {
  credentials: ProviderCredentialRecord[]
  onRefresh?: () => Promise<void> | void
}

export function ProviderKeysPanel({ credentials, onRefresh }: ProviderKeysPanelProps) {
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const credentialsMap = useMemo(
    () => new Map(credentials.map((credential) => [credential.provider, credential])),
    [credentials],
  )

  const handleSave = async (provider: ProviderId) => {
    const apiKey = draftKeys[provider]?.trim()

    if (!apiKey) {
      setFeedback(`Escribe una API key válida para ${provider}.`)
      return
    }

    try {
      setIsSubmitting(provider)
      setFeedback(null)
      await upsertProviderKey({ provider, apiKey })
      setDraftKeys((current) => ({ ...current, [provider]: '' }))
      await onRefresh?.()
      setFeedback(`API key actualizada para ${provider}.`)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo guardar la API key.')
    } finally {
      setIsSubmitting(null)
    }
  }

  const handleValidate = async (provider: ProviderId) => {
    try {
      setIsSubmitting(provider)
      setFeedback(null)
      const result = await validateProviderKey(provider)
      await onRefresh?.()
      setFeedback(result?.validation?.message ?? `Validación completada para ${provider}.`)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo validar la API key.')
    } finally {
      setIsSubmitting(null)
    }
  }

  const handleDelete = async (provider: ProviderId) => {
    try {
      setIsSubmitting(provider)
      setFeedback(null)
      await deleteProviderKey({ provider })
      await onRefresh?.()
      setFeedback(`API key eliminada para ${provider}.`)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo eliminar la API key.')
    } finally {
      setIsSubmitting(null)
    }
  }

  return (
    <section className="panel-card">
      <div className="panel-card__head">
        <div>
          <p className="eyebrow">API keys</p>
          <h3>Credenciales por proveedor</h3>
        </div>
      </div>
      <div className="provider-grid">
        {PROVIDER_LIST.map((provider) => {
          const credential = credentialsMap.get(provider.id)

          return (
            <article key={provider.id} className="provider-card">
              <strong>{provider.label}</strong>
              <span>{credential?.key_hint ?? 'Sin key guardada'}</span>
              <small>
                Estado: {credential?.validation_status ?? 'unknown'}
              </small>
              <input
                type="password"
                placeholder={provider.keyPlaceholder}
                value={draftKeys[provider.id] ?? ''}
                onChange={(event) =>
                  setDraftKeys((current) => ({
                    ...current,
                    [provider.id]: event.target.value,
                  }))
                }
              />
              <div className="message__actions">
                <button type="button" onClick={() => void handleSave(provider.id)} disabled={isSubmitting === provider.id}>
                  Guardar key
                </button>
                <button
                  type="button"
                  onClick={() => void handleValidate(provider.id)}
                  disabled={isSubmitting === provider.id || !credential?.key_hint}
                >
                  Validar key
                </button>
                <button type="button" onClick={() => void handleDelete(provider.id)} disabled={isSubmitting === provider.id}>
                  Eliminar key
                </button>
              </div>
            </article>
          )
        })}
      </div>
      {feedback ? <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>{feedback}</p> : null}
    </section>
  )
}
