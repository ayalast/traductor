import { useEffect, useRef } from 'react'
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
  onSwitchSibling?: (messageId: string, index: number) => void
  getCanEdit?: (message: MessageItem) => boolean
  getCanRetry?: (message: MessageItem) => boolean
  getCanBranch?: (message: MessageItem) => boolean
  containerRef?: React.RefObject<HTMLDivElement | null>
}

export function MessageList({
  messages,
  onEditMessage,
  onRetryMessage,
  onBranchMessage,
  onSwitchSibling,
  getCanEdit,
  getCanRetry,
  getCanBranch,
  containerRef,
}: MessageListProps) {
  const lastUserMessageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!messages.length || !containerRef?.current) return

    const lastMessage = messages[messages.length - 1]
    
    // Si el asistente está respondiendo (streaming) o acaba de terminar,
    // forzamos que el último mensaje del usuario se desplace hasta el tope superior del contenedor.
    if (lastMessage.role === 'assistant' && lastUserMessageRef.current) {
      const container = containerRef.current
      const userMsgElement = lastUserMessageRef.current
      
      // Ajustamos el scroll para que el mensaje del usuario quede justo arriba
      container.scrollTop = userMsgElement.offsetTop - container.offsetTop
    } 
    // Si el usuario acaba de enviar su mensaje (es el último), 
    // hacemos un scroll rápido al final para que vea su entrada.
    else if (lastMessage.role === 'user') {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, containerRef])

  return (
    <>
      {messages.map((message, index) => {
        const stableKey = message.turnIndex 
          ? `${message.role}-${message.turnIndex}` 
          : `${message.role}-${index}-${message.id}`

        // Identificamos el último mensaje de usuario de toda la lista
        const isLastUserMessage = message.role === 'user' && 
          !messages.slice(index + 1).some(m => m.role === 'user')

        return (
          <div 
            key={stableKey} 
            ref={isLastUserMessage ? lastUserMessageRef : null}
            className="message-wrapper"
            style={{ width: '100%', flexShrink: 0 }}
          >
            <MessageBubble
              id={message.id}
              role={message.role}
              author={message.author}
              content={message.content}
              reasoning={message.reasoning}
              canEdit={getCanEdit?.(message) ?? false}
              canRetry={getCanRetry?.(message) ?? false}
              canBranch={getCanBranch?.(message) ?? false}
              siblingIdx={(message as any).siblingIdx}
              siblingCount={(message as any).siblingCount}
              onEdit={onEditMessage}
              onRetry={onRetryMessage}
              onBranch={onBranchMessage}
              onSwitchSibling={(idx) => onSwitchSibling?.(message.id, idx)}
            />
          </div>
        )
      })}
    </>
  )
}
