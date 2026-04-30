import React, { useRef, useState } from 'react'

type Conversation = {
  id: string
  title: string
  updated_at: string
  branch?: string
  active?: boolean
}

type ConversationListProps = {
  conversations: Conversation[]
  onSelectConversation?: (conversationId: string) => void
  onDeleteConversation?: (conversationId: string) => void
  onRenameConversation?: (conversationId: string, newTitle: string) => void
  onOpenConversation?: (conversationId: string) => void
  searchQuery?: string
}

export function ConversationList({ 
  conversations, 
  onSelectConversation, 
  onDeleteConversation,
  onRenameConversation,
  onOpenConversation,
  searchQuery = ''
}: ConversationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const lastTapRef = useRef<{ id: string; time: number }>({ id: '', time: 0 })

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <span key={i} className="search-highlight">{part}</span> 
            : part
        )}
      </>
    )
  }

  const grouped = conversations.reduce((acc, conv) => {
    const date = new Date(conv.updated_at)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24))
    
    let label = 'Anteriores'
    if (diffDays === 0) label = 'Hoy'
    else if (diffDays === 1) label = 'Ayer'
    else if (diffDays < 7) label = 'Últimos 7 días'
    else if (diffDays < 30) label = 'Últimos 30 días'

    if (!acc[label]) acc[label] = []
    acc[label].push(conv)
    return acc
  }, {} as Record<string, Conversation[]>)

  const order = ['Hoy', 'Ayer', 'Últimos 7 días', 'Últimos 30 días', 'Anteriores']

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (window.confirm('¿Eliminar esta conversación?')) {
      onDeleteConversation?.(id)
    }
  }

  const handleStartRename = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation()
    setEditingId(conversation.id)
    setEditValue(conversation.title)
  }

  const handleSaveRename = async (id: string) => {
    if (editValue.trim()) {
      await onRenameConversation?.(id, editValue.trim())
    }
    setEditingId(null)
  }

  const handleSelectConversation = (id: string, event: React.MouseEvent) => {
    const now = event.timeStamp
    const isQuickSecondTap = lastTapRef.current.id === id && now - lastTapRef.current.time < 360

    lastTapRef.current = { id, time: now }
    onSelectConversation?.(id)

    if (isQuickSecondTap) {
      onOpenConversation?.(id)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <nav className="conversation-list" aria-label="Historial de conversaciones" style={{ flex: 1 }}>
        {order.map(label => {
          const items = grouped[label]
          if (!items || items.length === 0) return null
          
          return (
            <div key={label} className="conversation-group">
              <h4 className="conversation-group__label">{label}</h4>
              {items.map((conversation) => (
                <div key={conversation.id} className={`conversation-item-container${conversation.active ? ' conversation-item--active' : ''}`}>
                  {editingId === conversation.id ? (
                    <input
                      className="conversation-item__edit-input"
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleSaveRename(conversation.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(conversation.id)}
                    />
                  ) : (
                    <button
                      className="conversation-item"
                      type="button"
                      onClick={(event) => handleSelectConversation(conversation.id, event)}
                    >
                      <span className="conversation-item__icon">💬</span>
                      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <span className="conversation-item__title">{highlightText(conversation.title, searchQuery)}</span>
                      </div>
                      <div className="conversation-item__actions">
                        <button 
                          className="action-btn" 
                          type="button"
                          onClick={(e) => handleStartRename(e, conversation)}
                          title="Renombrar"
                          aria-label="Renombrar"
                        >
                          ✏️
                        </button>
                        <button 
                          className="action-btn delete-btn" 
                          type="button"
                          onClick={(e) => handleDelete(e, conversation.id)}
                          title="Eliminar"
                          aria-label="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </nav>
      
    </div>
  )
}
