import { lazy, Suspense, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'

import { GoogleLoginButton } from '../components/auth/GoogleLoginButton'
import { Composer } from '../components/chat/Composer'
import { WelcomePanel } from '../components/chat/WelcomePanel'
import { ConversationList } from '../components/history/ConversationList'
import { AppShell } from '../components/layout/AppShell'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { branchConversation } from '../features/branch-conversation'
import { streamChatMessage } from '../features/send-message'
import { useAuth } from '../hooks/useAuth'
import { useConversations } from '../hooks/useConversations'
import { useMessages, type MessageRecord } from '../hooks/useMessages'
import { usePromptPresets } from '../hooks/usePromptPresets'
import { useProviderCatalog } from '../hooks/useProviderCatalog'
import { useProviderCredentials } from '../hooks/useProviderCredentials'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { PROVIDERS } from '../lib/providers'
import { LoadingState } from '../components/common'

const SettingsDrawer = lazy(() => import('../components/layout/SettingsDrawer').then(m => ({ default: m.SettingsDrawer })))
const ChatView = lazy(() => import('../components/chat/ChatView').then(m => ({ default: m.ChatView })))
const ProviderSelect = lazy(() => import('../components/providers/ProviderSelect').then(m => ({ default: m.ProviderSelect })))
const ModelCombobox = lazy(() => import('../components/providers/ModelCombobox').then(m => ({ default: m.ModelCombobox })))
const ProviderKeysPanel = lazy(() => import('../components/providers/ProviderKeysPanel').then(m => ({ default: m.ProviderKeysPanel })))
const PromptPresetList = lazy(() => import('../components/prompts/PromptPresetList').then(m => ({ default: m.PromptPresetList })))
const UserNotesPanel = lazy(() => import('../components/prompts/UserNotesPanel').then(m => ({ default: m.UserNotesPanel })))

type DisplayMessage = {
  id: string
  role: 'user' | 'assistant'
  author: string
  content: string
  reasoning?: string
  turnIndex?: number
  createdAt?: string
  siblingIdx?: number
  siblingCount?: number
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
    createdAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
  },
]

function isUuidLike(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
}

const mobileSidebarQuery = '(max-width: 768px)'
const interactiveTargetSelector = 'button, a, input, textarea, select, summary, [contenteditable="true"], [role="button"]'

function isMobileViewport() {
  return window.matchMedia(mobileSidebarQuery).matches
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(interactiveTargetSelector))
}

export function ChatPage() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth()
  
  // 1. Estados básicos
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isStartingNewChat, setIsStartingNewChat] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [conversationSearch, setConversationSearch] = useState('')
  const [streamError, setStreamError] = useState<string | null>(null)
  const [optimisticMessages, setOptimisticMessages] = useState<DisplayMessage[]>([])
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobileViewport())
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isCopiedTranscript, setIsCopiedTranscript] = useState(false)
  const [activeSiblings, setActiveSiblings] = useState<Record<string, string>>({})

  const chatThreadRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasMobileComposerFocusAttemptRef = useRef(false)

  // 2. Hooks de datos
  const {
    conversations,
    isLoading: conversationsLoading,
    refresh: refreshConversations,
  } = useConversations(isAuthenticated)
  
  const { presets, refresh: refreshPresets } = usePromptPresets(isAuthenticated && isSettingsOpen)
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
  } = useProviderCatalog(activeProvider, isAuthenticated && isSettingsOpen)
  
  const {
    credentials,
    refresh: refreshCredentials,
  } = useProviderCredentials(isAuthenticated && isSettingsOpen)

  const {
    messages,
    isLoading: messagesLoading,
    refresh: refreshMessages,
  } = useMessages(activeConversationId, isAuthenticated)

  // 3. Lógica de Branching (useMemo) - DESPUÉS de que messages esté disponible
  const { allMessagesById, siblingsByParent } = useMemo(() => {
    const byId: Record<string, MessageRecord> = {}
    const byParent: Record<string, string[]> = {}

    const msgList = messages || []
    msgList.forEach((msg) => {
      byId[msg.id] = msg
      const pId = msg.parent_message_id || 'root'
      if (!byParent[pId]) byParent[pId] = []
      byParent[pId].push(msg.id)
    })

    return { allMessagesById: byId, siblingsByParent: byParent }
  }, [messages])

  const activePath = useMemo(() => {
    const msgList = messages || []
    if (!msgList.length) return []
    const path: MessageRecord[] = []
    let currentParent = 'root'

    let safetyCounter = 0
    while (siblingsByParent[currentParent] && safetyCounter < 1000) {
      safetyCounter++
      const options = siblingsByParent[currentParent]
      const activeId = activeSiblings[currentParent] || options[options.length - 1]
      const msg = allMessagesById[activeId]
      
      if (!msg) break
      path.push(msg)
      currentParent = msg.id
    }

    return path
  }, [messages, siblingsByParent, allMessagesById, activeSiblings])

  // 4. Procesamiento de conversaciones para el Sidebar
  const filteredConversations = useMemo(() => {
    if (!conversationSearch.trim()) return conversations
    const query = conversationSearch.toLowerCase()
    return conversations.filter(c => 
      c.title.toLowerCase().includes(query) || 
      c.provider.toLowerCase().includes(query)
    )
  }, [conversations, conversationSearch])

  const conversationItems = useMemo(() => {
    if (filteredConversations.length > 0) {
      return filteredConversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        updated_at: conversation.updated_at,
        branch:
          conversation.parent_conversation_id && conversation.branch_depth > 0
            ? `Rama nivel ${conversation.branch_depth}`
            : undefined,
        active: conversation.id === activeConversationId,
      }))
    }
    
    if (conversations.length === 0) {
      return [
        {
          id: 'placeholder-chat',
          title: 'Traducir expresiones cotidianas',
          updated_at: new Date().toISOString(),
          active: true,
        },
      ]
    }
    
    return []
  }, [filteredConversations, conversations, activeConversationId])

  const persistedMessages: DisplayMessage[] = useMemo(() => {
    return activePath
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => {
        const pId = message.parent_message_id || 'root'
        const siblings = siblingsByParent[pId] || []
        const currentIdx = siblings.indexOf(message.id)

        return {
          id: message.id,
          role: message.role === 'assistant' ? 'assistant' : 'user',
          author: message.role === 'assistant' ? 'Mi Traductor' : 'Tú',
          content: message.content,
          reasoning: message.reasoning_summary ?? undefined,
          turnIndex: message.turn_index,
          siblingIdx: currentIdx,
          siblingCount: siblings.length,
        }
      })
  }, [activePath, siblingsByParent])

  // 5. Efectos de UI y Teclado
  useEffect(() => {
    const handleScroll = () => {
      if (!chatThreadRef.current) return
      const { scrollTop, scrollHeight, clientHeight } = chatThreadRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom)
    }
    const el = chatThreadRef.current
    el?.addEventListener('scroll', handleScroll)
    return () => el?.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia(mobileSidebarQuery)
    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      setIsSidebarOpen(!event.matches)
    }

    mediaQuery.addEventListener('change', handleBreakpointChange)
    return () => mediaQuery.removeEventListener('change', handleBreakpointChange)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        handleNewChat()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (isMobileViewport()) return

    const timer = setTimeout(() => {
      composerRef.current?.focus()
    }, 150)
    return () => clearTimeout(timer)
  }, [activeConversationId, isStartingNewChat])

  useEffect(() => {
    if (isSending || isStartingNewChat) return

    if (!conversations.length) {
      setActiveConversationId(null)
      return
    }

    if (!activeConversationId || !isUuidLike(activeConversationId)) {
      setActiveConversationId(conversations[0].id)
    }
  }, [conversations, isStartingNewChat, isSending, activeConversationId])

  const activeMessages: DisplayMessage[] = isAuthenticated
    ? optimisticMessages.length > 0
      ? optimisticMessages
      : persistedMessages
    : fallbackMessages

  const lastAssistantMessageId = [...activeMessages]
    .reverse()
    .find((message) => message.role === 'assistant')?.id

  // 6. Manejadores de acciones (Handlers)
  const handleNewChat = () => {
    setActiveConversationId(null)
    setInputValue('')
    setStreamError(null)
    setOptimisticMessages([])
    setEditTarget(null)
    setActiveSiblings({})
    setIsStartingNewChat(true)
  }

  const handleSelectConversation = (id: string, closeSidebar = false) => {
    if (!isUuidLike(id)) return

    setActiveConversationId(id)
    setIsStartingNewChat(false)
    setStreamError(null)
    setOptimisticMessages([])
    setEditTarget(null)
    setActiveSiblings({})
    void refreshMessages(id)

    if (closeSidebar) setIsSidebarOpen(false)
  }

  const handleMobileChatClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isAuthenticated || !isMobileViewport() || hasMobileComposerFocusAttemptRef.current) return
    if (isSidebarOpen || isSettingsOpen || isInteractiveTarget(event.target)) return

    const composerElement = composerRef.current
    if (!composerElement || composerElement.disabled) return

    hasMobileComposerFocusAttemptRef.current = true
    composerElement.focus({ preventScroll: true })
  }

  const handleSendMessage = async (mode: 'new' | 'edit' | 'retry' = 'new', targetTurnIndex?: number, overrideText?: string, targetMessageId?: string) => {
    const text = overrideText !== undefined ? overrideText.trim() : inputValue.trim()

    if (!isAuthenticated || isSending) return
    if ((mode === 'new' || mode === 'edit') && !text) return

    const nextTurnIndex = targetTurnIndex ?? (Math.floor(persistedMessages.length / 2) + 1)
    const temporaryAssistantMessage: DisplayMessage = {
      id: `temp-assistant-${Date.now()}`,
      role: 'assistant',
      author: 'Mi Traductor',
      content: '',
      turnIndex: nextTurnIndex,
    }
    const temporaryUserMessage: DisplayMessage | null = (mode === 'new' || mode === 'edit') ? {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      author: 'Tú',
      content: text,
      turnIndex: nextTurnIndex,
    } : null

    setStreamError(null)
    if (overrideText === undefined) setInputValue('')
    setIsSending(true)

    if (mode === 'new') {
      setOptimisticMessages([...(isAuthenticated ? persistedMessages : []), ...(temporaryUserMessage ? [temporaryUserMessage] : []), temporaryAssistantMessage])
    } else if (mode === 'edit' && targetTurnIndex != null) {
      const baseMessages = persistedMessages.filter((m) => (m.turnIndex ?? 0) < targetTurnIndex)
      setOptimisticMessages([...baseMessages, ...(temporaryUserMessage ? [temporaryUserMessage] : []), temporaryAssistantMessage])
    } else if (mode === 'retry' && targetTurnIndex != null) {
      const baseMessages = persistedMessages.filter((m) => {
        const turn = m.turnIndex ?? 0
        if (turn < targetTurnIndex) return true
        const target = persistedMessages.find(msg => msg.id === targetMessageId)
        if (turn === targetTurnIndex && m.role === 'user' && target?.role === 'assistant') return true
        return false
      })
      setOptimisticMessages([...baseMessages, temporaryAssistantMessage])
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    let nextConversationId: string | null = activeConversationId

    try {
      let parentMessageId = null
      if (mode !== 'new') {
        const target = allMessagesById[targetMessageId!]
        parentMessageId = target?.parent_message_id
      } else if (persistedMessages.length > 0) {
        parentMessageId = persistedMessages[persistedMessages.length - 1].id
      }

      await streamChatMessage(
        {
          conversationId: isUuidLike(activeConversationId) ? activeConversationId : null,
          mode,
          input: mode === 'retry' ? '' : text,
          provider: activeProvider,
          model: activeModel,
          temperature: activeTemperature,
          presetId: activePresetId,
          targetTurnIndex,
          parentMessageId,
          targetMessageId,
        },
        {
          onConversation: async (conversationId) => {
            if (isUuidLike(conversationId)) {
              nextConversationId = conversationId
              setActiveConversationId(conversationId)
              setIsStartingNewChat(false)
              
              if (!activeConversationId) {
                try {
                  const newTitle = text.slice(0, 30).trim() + (text.length > 30 ? '...' : '')
                  const { supabase: sb } = await import('../lib/supabase')
                  await sb.from('conversations').update({ title: newTitle }).eq('id', conversationId)
                  await refreshConversations()
                } catch (e) { console.error('Auto-rename error:', e) }
              }
            }
          },
          onDelta: (partialText) => {
            setOptimisticMessages((current) => {
              if (!current.length) return current
              const next = [...current]
              next[next.length - 1] = { ...next[next.length - 1], content: partialText }
              return next
            })
          },
          onDone: ({ messageId, conversationId: cid, userMessageId }) => {
            if (cid && isUuidLike(cid)) setActiveConversationId(cid)
            
            if (messageId) {
              setActiveSiblings(prev => {
                const next = { ...prev }
                const pId = parentMessageId || 'root'
                
                const target = targetMessageId ? allMessagesById[targetMessageId] : null
                
                if (mode !== 'new' && target?.role === 'assistant') {
                  // Reintentamos asistente: el padre real es el user message (pId) y el hijo es el nuevo assistant message.
                  next[pId] = messageId
                } else {
                  // Nuevo mensaje, editar, o reintentar usuario:
                  // pId apunta al (nuevo) user message, y el user message apunta al assistant message.
                  if (userMessageId) {
                    next[pId] = userMessageId
                    next[userMessageId] = messageId
                  }
                }
                
                return next
              })
            }
          },
          onError: (msg) => setStreamError(msg),
        },
        abortController.signal,
      )
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setStreamError(error instanceof Error ? error.message : 'Error al enviar mensaje.')
      }
    } finally {
      abortControllerRef.current = null
      await refreshConversations()
      if (nextConversationId) setActiveConversationId(nextConversationId)
      await refreshMessages(nextConversationId)
      setIsSending(false)
      setOptimisticMessages([])
      setEditTarget(null)
    }
  }

  const handleRetryMessage = async (messageId: string) => {
    const target = activeMessages.find((m) => m.id === messageId)
    if (target && target.turnIndex !== undefined) {
      await handleSendMessage('retry', target.turnIndex, undefined, messageId)
    }
  }

  const handleSwitchSibling = (parentId: string | null, index: number) => {
    const pId = parentId || 'root'
    const siblings = siblingsByParent[pId]
    if (siblings && siblings[index]) {
      setActiveSiblings(prev => ({ ...prev, [pId]: siblings[index] }))
    }
  }

  const handleEditMessage = (messageId: string) => {
    const target = activeMessages.find((m) => m.id === messageId && m.role === 'user')
    if (target && target.turnIndex !== undefined) {
      setEditTarget({ messageId: target.id, turnIndex: target.turnIndex })
      setInputValue(target.content)
      setTimeout(() => composerRef.current?.focus(), 50)
    }
  }

  const handleBranchMessage = async (messageId: string) => {
    if (!activeConversationId) return
    const target = activeMessages.find((m) => m.id === messageId)
    const effectivePresetId = activePresetId || presets[0]?.id
    if (!target?.turnIndex) return
    if (!effectivePresetId) {
      setStreamError('Selecciona un preset activo antes de crear una rama.')
      return
    }

    try {
      const branchId = await branchConversation({
        sourceConversationId: activeConversationId,
        sourceMessageId: target.id,
        sourceTurnIndex: target.turnIndex,
        title: `${conversations.find(c => c.id === activeConversationId)?.title || 'Chat'} · rama`,
        provider: activeProvider,
        model: activeModel,
        temperature: activeTemperature,
        presetId: effectivePresetId,
      })
      await refreshConversations()
      setActiveConversationId(branchId)
      setIsStartingNewChat(false)
    } catch { setStreamError('Error al crear rama.') }
  }

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
    alert('¡Enlace copiado!')
  }

  const handleCopyConversation = async () => {
    const transcript = activeMessages.map(m => `${m.role === 'user' ? 'Tú' : 'IA'}:\n${m.content}`).join('\n\n---\n\n')
    await navigator.clipboard.writeText(transcript)
    setIsCopiedTranscript(true)
    setTimeout(() => setIsCopiedTranscript(false), 2000)
  }

  const handleTemperatureChange = async (temp: number) => {
    try {
      const { updateTemperature } = await import('../lib/api')
      await updateTemperature(temp)
      await refreshPreferences()
    } catch (err) {
      console.error('Error updating temperature:', err)
    }
  }

  const handleDeleteConversation = async (id: string) => {
    const { supabase: sb } = await import('../lib/supabase')
    if (id === 'ALL') await sb.from('conversations').delete().eq('user_id', user?.id)
    else await sb.from('conversations').delete().eq('id', id)
    await refreshConversations()
  }

  const handleDeleteAllConversations = async () => {
    const confirmed = window.confirm('¿Eliminar todo el historial? Esta acción no se puede deshacer.')
    if (!confirmed) return

    await handleDeleteConversation('ALL')
    handleNewChat()
  }

  const dangerZone = (
    <section className="settings-section settings-danger-zone">
      <details>
        <summary>Opciones avanzadas</summary>
        <div className="settings-danger-zone__content">
          <strong>Borrar todo el historial</strong>
          <p>Elimina permanentemente todas tus conversaciones guardadas.</p>
          <button type="button" className="settings-danger-zone__button" onClick={handleDeleteAllConversations}>
            Borrar todas las conversaciones
          </button>
        </div>
      </details>
    </section>
  )

  // 7. Componentes de renderizado
  const sidebar = (
    <Sidebar
      header={
        <div className="sidebar__header">
          <div className="sidebar__brand-row">
            <p className="eyebrow">Mi Traductor</p>
            <button className="sidebar-toggle-btn" type="button" onClick={() => setIsSidebarOpen(false)} aria-label="Ocultar historial">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
            </button>
          </div>
          <h1>Workspace</h1>
          <button className="primary-btn" type="button" onClick={handleNewChat}>Nuevo chat</button>
        </div>
      }
      search={
        <div className="sidebar__search">
          <div className="sidebar__search-field">
            <input type="text" placeholder="Buscar..." value={conversationSearch} onChange={e => setConversationSearch(e.target.value)} />
            {conversationSearch && (
              <button className="sidebar__search-clear" type="button" onClick={() => setConversationSearch('')} aria-label="Limpiar búsqueda">
                ✕
              </button>
            )}
          </div>
        </div>
      }
      conversations={
        conversationsLoading ? <LoadingState message="Cargando..." size="small" /> :
        <ConversationList
          conversations={conversationItems}
          onSelectConversation={id => handleSelectConversation(id)}
          onOpenConversation={id => handleSelectConversation(id, true)}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={async (id, title) => {
            const { supabase: sb } = await import('../lib/supabase')
            await sb.from('conversations').update({ title }).eq('id', id)
            await refreshConversations()
          }}
          searchQuery={conversationSearch}
        />
      }
      account={
        <div className="sidebar__account">
          <button className="account-card" type="button" onClick={() => setIsSettingsOpen(true)}>
            <span className="account-card__avatar">{user?.avatarFallback || 'U'}</span>
            <span className="account-card__identity">
              <strong>{user?.name || 'Usuario'}</strong>
              <small>{user?.email}</small>
            </span>
            <span className="account-card__settings" aria-hidden="true">⚙️</span>
          </button>
          {isAuthenticated && (
            <button className="account-signout" type="button" onClick={() => signOut()}>
              Salir
            </button>
          )}
        </div>
      }
    />
  )

  const header = (
    <Topbar
      title={
        <>
          {!isSidebarOpen && (
            <div className="topbar__history-slot">
              <button className="sidebar-toggle-btn" type="button" onClick={() => setIsSidebarOpen(true)} aria-label="Mostrar historial">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
              </button>
            </div>
          )}
          <div className="topbar__center-controls">
          <button className="model-selector-btn" onClick={() => setIsSettingsOpen(true)}>
            {activeProvider.toUpperCase()} · {activeModel} ▼
          </button>
          <button className="new-chat-mobile-btn" onClick={handleNewChat}>➕</button>
          </div>
        </>
      }
      actions={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleCopyConversation} className="topbar-action-btn">{isCopiedTranscript ? '✅' : '📋'}</button>
          <button onClick={handleShare} className="topbar-action-btn">🔗</button>
          <button onClick={() => setIsSettingsOpen(true)} className="topbar-action-btn">⚙️</button>
        </div>
      }
    />
  )

  const content = (
    <div onClickCapture={handleMobileChatClick} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', height: '100%', minHeight: 0 }}>
      {streamError && (
        <div style={{ padding: '1rem', background: 'var(--error-bg)', color: 'var(--error-text)', borderBottom: '1px solid var(--error-border)', textAlign: 'center', fontSize: '0.9rem' }}>
          <strong>Error:</strong> {streamError}
        </div>
      )}
      {messagesLoading && !optimisticMessages.length ? <LoadingState message="Cargando..." /> :
       activeMessages.length ? (
        <Suspense fallback={<LoadingState message="Preparando conversación..." />}>
          <ChatView
            messages={activeMessages}
            onEditMessage={handleEditMessage}
            onRetryMessage={handleRetryMessage}
            onBranchMessage={handleBranchMessage}
            onSwitchSibling={(id, idx) => handleSwitchSibling(allMessagesById[id]?.parent_message_id || null, idx)}
            getCanEdit={m => m.role === 'user' && !isSending}
            getCanRetry={m => !isSending && (m.role === 'user' || m.id === lastAssistantMessageId)}
            getCanBranch={m => !isSending && !!m.id}
            containerRef={chatThreadRef}
          />
        </Suspense>
       ) : <WelcomePanel onQuickPrompt={text => handleSendMessage('new', undefined, text)} />}
      
      {showScrollButton && <button className="scroll-bottom-btn" onClick={() => chatThreadRef.current && (chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight)}>↓</button>}
    </div>
  )

  const composer = isAuthenticated ? (
    <Composer
      ref={composerRef}
      placeholder={editTarget ? 'Editando...' : 'Envía un mensaje...'}
      value={inputValue}
      onChange={setInputValue}
      onSubmit={() => handleSendMessage(editTarget ? 'edit' : 'new', editTarget?.turnIndex, undefined, editTarget?.messageId)}
      onStop={() => abortControllerRef.current?.abort()}
      onCancelEdit={editTarget ? () => setEditTarget(null) : undefined}
      isSending={isSending}
      disabled={messagesLoading}
      isEditMode={!!editTarget}
    />
  ) : (
    <footer className="composer"><GoogleLoginButton /></footer>
  )

  if (isLoading) {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState message="Preparando tu espacio..." size="large" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <AppShell sidebar={sidebar} header={header} content={content} composer={composer} isSidebarOpen={isSidebarOpen} onCloseSidebar={() => setIsSidebarOpen(false)} />
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} activeProvider={activeProvider} activeTemperature={activeTemperature} onTemperatureChange={handleTemperatureChange} dangerZone={dangerZone}>
            <ProviderSelect activeProvider={activeProvider} onUpdate={() => refreshPreferences()} />
            <ModelCombobox activeProvider={activeProvider} activeModel={activeModel} models={models} isLoading={modelsLoading} error={modelsError} onUpdate={() => refreshPreferences()} />
            <ProviderKeysPanel credentials={credentials} onRefresh={() => { refreshCredentials(); refreshModels(); }} />
            <PromptPresetList presets={presets} activePresetId={activePresetId} onRefresh={async () => { await refreshPresets(); await refreshPreferences(); }} />
            <UserNotesPanel initialNotes={preferences?.notes || ''} onUpdate={() => refreshPreferences()} />
          </SettingsDrawer>
        </Suspense>
      )}
    </div>
  )
}
