import { MessageList } from './MessageList'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  author: string
  content: string
  reasoning?: string
}

type ChatViewProps = {
  messages: ChatMessage[]
  onEditMessage?: (messageId: string) => void
  onRetryMessage?: (messageId: string) => void
  onBranchMessage?: (messageId: string) => void
  getCanEdit?: (message: ChatMessage) => boolean
  getCanRetry?: (message: ChatMessage) => boolean
  getCanBranch?: (message: ChatMessage) => boolean
}

export function ChatView({
  messages,
  onEditMessage,
  onRetryMessage,
  onBranchMessage,
  getCanEdit,
  getCanRetry,
  getCanBranch,
}: ChatViewProps) {
  return (
    <MessageList
      messages={messages}
      onEditMessage={onEditMessage}
      onRetryMessage={onRetryMessage}
      onBranchMessage={onBranchMessage}
      getCanEdit={getCanEdit}
      getCanRetry={getCanRetry}
      getCanBranch={getCanBranch}
    />
  )
}
