import { MessageBubble } from './MessageBubble'

type MessageItem = {
  id: string
  role: 'user' | 'assistant'
  author: string
  content: string
  reasoning?: string
}

type MessageListProps = {
  messages: MessageItem[]
  onEditMessage?: (messageId: string) => void
  onRetryMessage?: (messageId: string) => void
  onBranchMessage?: (messageId: string) => void
  getCanEdit?: (message: MessageItem) => boolean
  getCanRetry?: (message: MessageItem) => boolean
  getCanBranch?: (message: MessageItem) => boolean
}

export function MessageList({
  messages,
  onEditMessage,
  onRetryMessage,
  onBranchMessage,
  getCanEdit,
  getCanRetry,
  getCanBranch,
}: MessageListProps) {
  return (
    <div className="chat-thread" aria-label="Mensajes del chat">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          id={message.id}
          role={message.role}
          author={message.author}
          content={message.content}
          reasoning={message.reasoning}
          canEdit={getCanEdit?.(message) ?? false}
          canRetry={getCanRetry?.(message) ?? false}
          canBranch={getCanBranch?.(message) ?? false}
          onEdit={onEditMessage}
          onRetry={onRetryMessage}
          onBranch={onBranchMessage}
        />
      ))}
    </div>
  )
}
