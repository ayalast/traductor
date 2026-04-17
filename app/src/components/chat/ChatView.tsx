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
  onSwitchSibling?: (messageId: string, index: number) => void
  getCanEdit?: (message: ChatMessage) => boolean
  getCanRetry?: (message: ChatMessage) => boolean
  getCanBranch?: (message: ChatMessage) => boolean
  containerRef?: React.RefObject<HTMLDivElement | null>
}

export function ChatView({
  messages,
  onEditMessage,
  onRetryMessage,
  onBranchMessage,
  onSwitchSibling,
  getCanEdit,
  getCanRetry,
  getCanBranch,
  containerRef,
}: ChatViewProps) {
  return (
    <div className="chat-thread" ref={containerRef}>
      <MessageList
        messages={messages}
        onEditMessage={onEditMessage}
        onRetryMessage={onRetryMessage}
        onBranchMessage={onBranchMessage}
        onSwitchSibling={onSwitchSibling}
        getCanEdit={getCanEdit}
        getCanRetry={getCanRetry}
        getCanBranch={getCanBranch}
        containerRef={containerRef}
      />
      
      <div style={{ height: '4rem', flexShrink: 0 }} />
    </div>
  )
}
