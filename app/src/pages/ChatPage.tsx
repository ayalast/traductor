import { useEffect, useMemo, useRef, useState } from 'react'
import { logger } from '../lib/logger'

import { GoogleLoginButton } from '../components/auth/GoogleLoginButton'
import { SettingsDrawer } from '../components/layout/SettingsDrawer'
import { ChatView } from '../components/chat/ChatView'
import { Composer } from '../components/chat/Composer'
import { WelcomePanel } from '../components/chat/WelcomePanel'
import { ConversationList } from '../components/history/ConversationList'
import { AppShell } from '../components/layout/AppShell'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { PromptPresetList } from '../components/prompts/PromptPresetList'
import { UserNotesPanel } from '../components/prompts/UserNotesPanel'
import { ModelCombobox } from '../components/providers/ModelCombobox'
import { ProviderKeysPanel } from '../components/providers/ProviderKeysPanel'
import { ProviderSelect } from '../components/providers/ProviderSelect'
import { branchConversation } from '../features/branch-conversation'
import { streamChatMessage } from '../features/send-message'
import { useAuth } from '../hooks/useAuth'
import { useConversationBranch } from '../hooks/useConversationBranch'
import { useConversations } from '../hooks/useConversations'
import { useMessages } from '../hooks/useMessages'
import { usePromptPresets } from '../hooks/usePromptPresets'
import { useProviderCatalog } from '../hooks/useProviderCatalog'
import { useProviderCredentials } from '../hooks/useProviderCredentials'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { PROVIDERS } from '../lib/providers'
import { LoadingState, ErrorState, EmptyState } from '../components/common'

type DisplayMessage = {
  id: string
  role: 'user' | 'assistant'
  author: string
  content: string
  reasoning?: string
  turnIndex?: number
}

type EditTarget = {
  messageId: string
  turnIndex: number
}

const fallbackMessages: DisplayMessage[] = [
  {
    id: 'm1',
    role: 'user',
    author: 'Tú',
    content:
      'Explícame la diferencia entre "actually", "currently" y "eventually" con ejemplos claros en español e inglés.',
    turnIndex: 1,
  },
  {
    id: 'm2',
    role: 'assistant',
    author: 'Mi Traductor',
    content:
      '## Traducción y matices\n\n- **actually** = en realidad\n- **currently** = actualmente\n- **eventually** = finalmente / con el tiempo\n\n### Ejemplos\n1. *Actually, I agree with you.* → En realidad, estoy de acuerdo contigo.\n2. *I am currently studying English.* → Actualmente estoy estudiando inglés.\n3. *She eventually found the answer.* → Finalmente ella encontró la respuesta.',
    reasoning:
      'Se separaron los términos porque suelen confundirse por parecido visual. La respuesta prioriza falsos amigos, contraste semántico y ejemplos cortos para aprendizaje rápido.',
    turnIndex: 1,
  },
]

function isUuidLike(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
}

export function ChatPage() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth()
  const {
    conversations,
    isLoading: conversationsLoading,
    error: conversationsError,
    refresh: refreshConversations,
  } = useConversations(isAuthenticated)
  const { presets, isLoading: presetsLoading, error: presetsError, refresh: refreshPresets } = usePromptPresets(isAuthenticated)
  const { preferences, refresh: refreshPreferences } = useUserPreferences(isAuthenticated)

  const activeProvider = preferences?.active_provider ?? 'groq'
  const activeModel =
    (activeProvider === 'groq'
      ? preferences?.active_model_groq
      : activeProvider === 'deepseek'
        ? preferences?.active_model_deepseek
        : preferences?.active_model_openrouter) || PROVIDERS[activeProvider].defaultModel
  const activeTemperature = preferences?.active_temperature ?? 0.5
  const activePresetId = preferences?.active_preset_id ?? null

  const {
    models,
    isLoading: modelsLoading,
    error: modelsError,
    refresh: refreshModels,
  } = useProviderCatalog(activeProvider, isAuthenticated)
  const {
    credentials,
    isLoading: credentialsLoading,
    error: credentialsError,
    refresh: refreshCredentials,
  } = useProviderCredentials(isAuthenticated)

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [optimisticMessages, setOptimisticMessages] = useState<DisplayMessage[]>([])
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isStartingNewChat, setIsStartingNewChat] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleTemperatureChange = async (temp: number) => {
    try {
      const { updateTemperature } = await import('../lib/api')
      await updateTemperature(temp)
      await refreshPreferences()
    } catch (err) {
      console.error('Error updating temperature:', err)
    }
  }

  useEffect(() => {
    if (!conversations.length) {
      setActiveConversationId(null)
      return
    }

    setActiveConversationId((current) => {
      if (current && conversations.some((conversation) => conversation.id === current)) {
        return current
      }

      if (isStartingNewChat) {
        return null
      }

      return conversations[0].id
    })
  }, [conversations, isStartingNewChat])

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  )

  const {
    messages,
    isLoading: messagesLoading,
    error: messagesError,
    refresh: refreshMessages,
  } = useMessages(activeConversationId, isAuthenticated)

  const {
    current: currentBranch,
    parent: parentBranch,
    children: childBranches,
  } = useConversationBranch(activeConversationId, isAuthenticated)

  const conversationItems = conversations.length
    ? conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        meta: `${conversation.provider} · ${new Date(conversation.updated_at).toLocaleString()}`,
        branch:
          conversation.parent_conversation_id && conversation.branch_depth > 0
            ? `Rama nivel ${conversation.branch_depth}`
            : undefined,
        active: conversation.id === activeConversationId,
      }))
    : [
        {
          id: 'placeholder-chat',
          title: 'Traducir expresiones cotidianas',
          meta: 'Demo local',
          active: true,
        },
      ]


  const providerStatus = isAuthenticated
    ? modelsLoading
      ? 'Cargando catálogo desde Supabase Functions'
      : modelsError
        ? `Sin catálogo remoto: ${modelsError}`
        : models.length
          ? `Modelos disponibles: ${models.length}`
          : 'Sin modelos aún, usando catálogo vacío del backend placeholder'
    : 'Inicia sesión para consultar tu catálogo de modelos'

  const persistedMessages: DisplayMessage[] = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      id: message.id,
      role: message.role === 'assistant' ? 'assistant' : 'user',
      author: message.role === 'assistant' ? 'Mi Traductor' : 'Tú',
      content: message.content,
      reasoning: message.reasoning_summary ?? undefined,
      turnIndex: message.turn_index,
    }))

  const activeMessages: DisplayMessage[] = isAuthenticated
    ? [...persistedMessages, ...optimisticMessages]
    : fallbackMessages

  const lastAssistantMessageId = [...activeMessages]
    .reverse()
    .find((message) => message.role === 'assistant')?.id

  const handleNewChat = () => {
    setActiveConversationId(null)
    setInputValue('')
    setStreamError(null)
    setOptimisticMessages([])
    setEditTarget(null)
    setIsStartingNewChat(true)
  }

  const handleSendMessage = async (mode: 'new' | 'edit' | 'retry' = 'new', targetTurnIndex?: number) => {
    const text = inputValue.trim()

    if (!isAuthenticated || isSending) {
      return
    }

    if ((mode === 'new' || mode === 'edit') && !text) {
      return
    }

    if ((mode === 'edit' || mode === 'retry') && !activeConversationId) {
      setStreamError('Necesitas una conversación activa para editar o reintentar.')
      return
    }

    const temporaryAssistantMessage: DisplayMessage = {
      id: `temp-assistant-${Date.now()}`,
      role: 'assistant',
      author: 'Mi Traductor',
      content: '',
      turnIndex: targetTurnIndex,
    }

    const temporaryUserMessage: DisplayMessage | null =
      mode === 'new' || mode === 'edit'
        ? {
            id: `temp-user-${Date.now()}`,
            role: 'user',
            author: 'Tú',
            content: text,
            turnIndex: targetTurnIndex,
          }
        : null

    const currentConversationId = isUuidLike(activeConversationId) ? activeConversationId : null

    setStreamError(null)
    setInputValue('')
    setIsSending(true)
    setIsStartingNewChat(false)

    if (mode === 'new') {
      setOptimisticMessages([
        ...(isAuthenticated ? persistedMessages : []),
        ...(temporaryUserMessage ? [temporaryUserMessage] : []),
        temporaryAssistantMessage,
      ])
    }

    if (mode === 'edit' && targetTurnIndex != null) {
      const baseMessages = persistedMessages.filter((message) => (message.turnIndex ?? 0) < targetTurnIndex)
      setOptimisticMessages([
        ...baseMessages,
        ...(temporaryUserMessage ? [temporaryUserMessage] : []),
        temporaryAssistantMessage,
      ])
    }

    if (mode === 'retry' && targetTurnIndex != null) {
      const baseMessages = persistedMessages.filter((message) => {
        const turn = message.turnIndex ?? 0
        if (turn < targetTurnIndex) return true
        if (turn === targetTurnIndex && message.role === 'user') return true
        return false
      })
      setOptimisticMessages([...baseMessages, temporaryAssistantMessage])
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    let nextConversationId: string | null = currentConversationId

    try {
      logger.info('chat', 'Iniciando envío de mensaje', {
        mode,
        conversationId: currentConversationId,
        provider: activeProvider,
        model: activeModel,
      })

      await streamChatMessage(
        {
          conversationId: currentConversationId,
          mode,
          input: mode === 'retry' ? '' : text,
          provider: activeProvider,
          model: activeModel,
          temperature: activeTemperature,
          presetId: activePresetId,
          targetTurnIndex,
        },
        {
          onConversation: (conversationId) => {
            if (isUuidLike(conversationId)) {
              nextConversationId = conversationId
              setActiveConversationId(conversationId)
            }
          },
          onDelta: (partialText) => {
            setOptimisticMessages((current) => {
              if (!current.length) return current
              const next = [...current]
              next[next.length - 1] = {
                ...next[next.length - 1],
                content: partialText,
              }
              return next
            })
          },
          onDone: ({ conversationId }) => {
            if (conversationId && isUuidLike(conversationId)) {
              nextConversationId = conversationId
              setActiveConversationId(conversationId)
            }
          },
          onError: (message) => {
            setStreamError(message)
          },
        },
        abortController.signal,
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        logger.warn('chat', 'Generación detenida por el usuario')
        setStreamError('La generación fue detenida por el usuario.')
      } else {
        logger.error('chat', 'Error al enviar mensaje', error)
        setStreamError(error instanceof Error ? error.message : 'No se pudo completar el envío del mensaje.')
      }
    } finally {
      abortControllerRef.current = null
      setIsSending(false)
      setOptimisticMessages([])
      setEditTarget(null)
      await refreshConversations()

      if (nextConversationId && nextConversationId !== activeConversationId) {
        setActiveConversationId(nextConversationId)
      }

      await refreshMessages()
    }
  }

  const handleStopMessage = () => {
    abortControllerRef.current?.abort()
  }

  const handleEditMessage = (messageId: string) => {
    const target = persistedMessages.find((message) => message.id === messageId && message.role === 'user')

    if (!target?.turnIndex) {
      return
    }

    setEditTarget({
      messageId: target.id,
      turnIndex: target.turnIndex,
    })
    setInputValue(target.content)
    setStreamError(null)
  }

  const handleRetryMessage = async (messageId: string) => {
    const target = persistedMessages.find((message) => message.id === messageId && message.role === 'assistant')

    if (!target?.turnIndex) {
      return
    }

    await handleSendMessage('retry', target.turnIndex)
  }

  const handleBranchMessage = async (messageId: string) => {
    if (!activeConversationId || !activeConversation) {
      setStreamError('Necesitas una conversación activa para crear una rama.')
      return
    }

    const target = persistedMessages.find((message) => message.id === messageId)

    if (!target?.turnIndex || !activePresetId) {
      setStreamError('No se pudo determinar el punto exacto para crear la rama.')
      return
    }

    try {
      setStreamError(null)
      logger.info('chat', 'Creando rama de conversación', {
        sourceConversationId: activeConversationId,
        sourceTurnIndex: target.turnIndex,
      })

      const branchId = await branchConversation({
        sourceConversationId: activeConversationId,
        sourceMessageId: target.id,
        sourceTurnIndex: target.turnIndex,
        title: `${activeConversation.title} · rama`,
        provider: activeProvider,
        model: activeModel,
        temperature: activeTemperature,
        presetId: activePresetId,
      })

      await refreshConversations()
      setActiveConversationId(branchId)
      setIsStartingNewChat(false)
      logger.info('chat', 'Rama creada exitosamente', { branchId })
    } catch (error) {
      logger.error('chat', 'Error al crear rama', error)
      setStreamError(error instanceof Error ? error.message : 'No se pudo crear la rama.')
    }
  }

  const handleNavigateToParent = () => {
    if (parentBranch) {
      setActiveConversationId(parentBranch.id)
      setIsStartingNewChat(false)
    }
  }

  const handleNavigateToChild = (childId: string) => {
    setActiveConversationId(childId)
    setIsStartingNewChat(false)
  }

  const sidebar = (
    <Sidebar
      header={
        <div className="sidebar__header">
          <div>
            <p className="eyebrow">Mi Traductor</p>
            <h1>Workspace conversacional</h1>
          </div>
          <button className="primary-btn" type="button" onClick={handleNewChat}>
            Nuevo chat
          </button>
        </div>
      }
      search={
        <div className="sidebar__search">
          <input type="text" placeholder="Buscar conversaciones" aria-label="Buscar conversaciones" />
        </div>
      }
      conversations={
        conversationsLoading ? (
          <LoadingState message="Cargando conversaciones..." size="small" />
        ) : conversationsError ? (
          <ErrorState
            title="Error al cargar conversaciones"
            message={conversationsError}
            onRetry={() => void refreshConversations()}
            icon="💬"
          />
        ) : conversationItems.length === 0 ? (
          <EmptyState
            icon="💬"
            title="Sin conversaciones"
            description="Comienza una nueva conversación para empezar a chatear"
          />
        ) : (
          <ConversationList
            conversations={conversationItems}
            onSelectConversation={(conversationId) => {
              setActiveConversationId(conversationId)
              setIsStartingNewChat(false)
            }}
          />
        )
      }
      account={
        <div className="sidebar__account">
          <div className="avatar">{user?.avatarFallback ?? 'G'}</div>
          <div style={{ flex: 1 }}>
            <strong>{user?.name ?? 'Invitado'}</strong>
            <p>{user?.email ?? 'Inicia sesión para sincronizar'}</p>
          </div>
          {isAuthenticated ? (
            <button type="button" onClick={() => void signOut()}>
              Salir
            </button>
          ) : null}
        </div>
      }
    />
  )

  const header = (
    <Topbar
      title={
        <div>
          <p className="eyebrow">Chat activo</p>
          <h2>{activeConversation?.title ?? conversationItems[0]?.title ?? 'Nuevo chat'}</h2>
        </div>
      }
      actions={
        <>
          <button type="button" onClick={() => setIsSettingsOpen(true)}>
            ⚙️ Configurar
          </button>
          <button type="button">Compartir luego</button>
        </>
      }
      banner={
        currentBranch && (parentBranch || childBranches.length > 0) ? (
          <section className="branch-banner" aria-label="Contexto de rama">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {parentBranch ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    ↑ Padre:
                  </span>
                  <button
                    type="button"
                    onClick={handleNavigateToParent}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.875rem',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {parentBranch.title}
                  </button>
                </div>
              ) : null}
              {currentBranch.branch_depth > 0 ? (
                <span style={{ fontSize: '0.875rem', color: 'var(--accent)' }}>
                  Nivel de rama: {currentBranch.branch_depth}
                </span>
              ) : null}
              {childBranches.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    ↓ Ramas hijas ({childBranches.length}):
                  </span>
                  {childBranches.slice(0, 3).map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => handleNavigateToChild(child.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.875rem',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {child.title}
                    </button>
                  ))}
                  {childBranches.length > 3 ? (
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      +{childBranches.length - 3} más
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null
      }
    />
  )

  const content = (
    <>
      {messagesLoading ? (
        <LoadingState message="Cargando mensajes de la conversación..." />
      ) : messagesError ? (
        <ErrorState
          title="Error al cargar mensajes"
          message={messagesError}
          onRetry={() => void refreshMessages()}
          icon="💬"
        />
      ) : activeMessages.length ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {streamError ? (
            <section className="panel-card" style={{ alignSelf: 'start' }}>
              <p style={{ color: '#fda4af' }}>{streamError}</p>
            </section>
          ) : null}
          <ChatView
            messages={activeMessages}
            onEditMessage={handleEditMessage}
            onRetryMessage={(messageId) => void handleRetryMessage(messageId)}
            onBranchMessage={(messageId) => void handleBranchMessage(messageId)}
            getCanEdit={(message) => message.role === 'user' && !isSending}
            getCanRetry={(message) => message.role === 'assistant' && message.id === lastAssistantMessageId && !isSending}
            getCanBranch={(message) => !isSending && Boolean(message.id)}
          />
        </div>
      ) : (
        <EmptyState
          icon="✍️"
          title="Sin mensajes"
          description="Aún no hay mensajes en esta conversación. Escribe el primero para crear o continuar el hilo."
        />
      )}
      <aside className="inspector">
        {isAuthenticated ? (
          <>
            <ProviderSelect
              activeProvider={activeProvider}
              providerStatus={providerStatus}
              onUpdate={async () => {
                await refreshPreferences()
              }}
            />
            <ModelCombobox
              activeProvider={activeProvider}
              activeModel={activeModel}
              models={models}
              isLoading={modelsLoading}
              error={modelsError}
              onUpdate={async () => {
                await refreshPreferences()
              }}
            />
            {credentialsLoading ? (
              <LoadingState message="Cargando credenciales..." size="small" />
            ) : credentialsError ? (
              <ErrorState
                title="Error al cargar credenciales"
                message={credentialsError}
                onRetry={() => void refreshCredentials()}
                icon="🔑"
              />
            ) : (
              <ProviderKeysPanel
                credentials={credentials}
                onRefresh={async () => {
                  await refreshCredentials()
                  await refreshModels()
                }}
              />
            )}
          </>
        ) : (
          <WelcomePanel />
        )}
        {presetsLoading ? (
          <LoadingState message="Cargando presets..." size="small" />
        ) : presetsError ? (
          <ErrorState
            title="Error al cargar presets"
            message={presetsError}
            onRetry={() => void refreshPresets()}
            icon="📝"
          />
        ) : (
          <PromptPresetList
            presets={presets}
            activePresetId={activePresetId}
            onRefresh={async () => {
              await refreshPresets()
              await refreshPreferences()
            }}
          />
        )}

        <UserNotesPanel
          initialNotes={preferences?.notes ?? ''}
          onUpdate={async () => {
            await refreshPreferences()
          }}
        />
      </aside>
    </>
  )

  const composerPlaceholder = editTarget
    ? 'Editando mensaje anterior. Envía para regenerar desde ese punto.'
    : 'Escribe en inglés o español. Luego podrás guardar esta conversación, ramificarla y reutilizar su preset.'

  const composer = isAuthenticated ? (
    <Composer
      placeholder={composerPlaceholder}
      value={inputValue}
      onChange={setInputValue}
      onSubmit={() => void handleSendMessage(editTarget ? 'edit' : 'new', editTarget?.turnIndex)}
      onStop={handleStopMessage}
      onCancelEdit={editTarget ? () => setEditTarget(null) : undefined}
      isSending={isSending}
      disabled={messagesLoading}
      isEditMode={!!editTarget}
    />
  ) : (
    <footer className="composer">
      <div className="composer__input">
        <span className="eyebrow">Sincronización por cuenta</span>
        <div className="panel-card">
          <h3 style={{ marginBottom: '0.5rem' }}>Accede para guardar tu historial y tus presets</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Inicia sesión con Google para activar la persistencia real de conversaciones, API keys y presets.
          </p>
          {isLoading ? <p>Cargando estado de autenticación...</p> : <GoogleLoginButton disabled={false} />}
        </div>
      </div>
    </footer>
  )

  return (
    <>
      <AppShell sidebar={sidebar} header={header} content={content} composer={composer} />
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeProvider={preferences?.active_provider ?? 'openrouter'}
        activeTemperature={preferences?.active_temperature ?? 0.7}
        onTemperatureChange={handleTemperatureChange}
      />
    </>
  )
}
