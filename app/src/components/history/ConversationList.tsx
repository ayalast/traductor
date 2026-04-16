type Conversation = {
  id: string
  title: string
  meta: string
  branch?: string
  active?: boolean
}

type ConversationListProps = {
  conversations: Conversation[]
  onSelectConversation?: (conversationId: string) => void
}

export function ConversationList({ conversations, onSelectConversation }: ConversationListProps) {
  return (
    <nav className="conversation-list" aria-label="Historial de conversaciones">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          className={`conversation-item${conversation.active ? ' conversation-item--active' : ''}`}
          type="button"
          onClick={() => onSelectConversation?.(conversation.id)}
        >
          <span className="conversation-item__title">{conversation.title}</span>
          <span className="conversation-item__meta">{conversation.meta}</span>
          {conversation.branch ? (
            <span className="conversation-item__branch">{conversation.branch}</span>
          ) : null}
        </button>
      ))}
    </nav>
  )
}
