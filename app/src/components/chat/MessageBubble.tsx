import { useMemo, useState } from 'react'
import { marked } from 'marked'
import katex from 'katex'

import { SiblingSwitch } from './SiblingSwitch'

type MessageBubbleProps = {
  id: string
  role: 'user' | 'assistant'
  author: string
  content: string
  reasoning?: string
  canEdit?: boolean
  canRetry?: boolean
  canBranch?: boolean
  siblingIdx?: number
  siblingCount?: number
  onEdit?: (messageId: string) => void
  onRetry?: (messageId: string) => void
  onBranch?: (messageId: string) => void
  onSwitchSibling?: (index: number) => void
}

export function MessageBubble({
  id,
  role,
  author,
  content,
  reasoning,
  canEdit = false,
  canRetry = false,
  canBranch = false,
  siblingIdx = 0,
  siblingCount = 1,
  onEdit,
  onRetry,
  onBranch,
  onSwitchSibling,
}: MessageBubbleProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Error al copiar:', err)
    }
  }

  const htmlContent = useMemo(() => {
    try {
      let processed = content
      const mathBlocks: string[] = []
      
      // 1. Protegemos los bloques LaTeX con un delimitador que Markdown ignore
      processed = processed.replace(/(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$)/g, (match) => {
        const placeholder = `@@@MATH_BLOCK_${mathBlocks.length}@@@`
        mathBlocks.push(match)
        return placeholder
      })

      // Inline
      processed = processed.replace(/(\\\([\s\S]*?\\\))|(?<!\\)\$[\s\S]*?(?<!\\)\$/g, (match) => {
        const placeholder = `@@@MATH_INLINE_${mathBlocks.length}@@@`
        mathBlocks.push(match)
        return placeholder
      })

      // 2. Parseamos Markdown con renderer personalizado
      const renderer = new marked.Renderer()
      renderer.code = ({ text, lang }) => {
        const language = lang || 'text'
        return `
          <div class="code-block">
            <div class="code-block__header">
              <span>${language}</span>
              <button class="copy-code-btn" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText)">Copiar</button>
            </div>
            <pre><code class="language-${language}">${text}</code></pre>
          </div>
        `
      }

      let html = marked.parse(processed, { renderer, async: false, breaks: true }) as string

      // 3. Restauramos y renderizamos con KaTeX
      mathBlocks.forEach((original, index) => {
        const isBlock = original.startsWith('\\\[') || original.startsWith('$$')
        const isSlashDelimited = original.startsWith('\\\[') || original.startsWith('\\\(')
        
        let rawMath = original
        if (isSlashDelimited) {
          rawMath = original.slice(2, -2)
        } else {
          rawMath = original.startsWith('$$') ? original.slice(2, -2) : original.slice(1, -1)
        }

        try {
          const rendered = katex.renderToString(rawMath, {
            displayMode: isBlock,
            throwOnError: false,
            trust: true,
          })
          
          const placeholder = isBlock 
            ? `@@@MATH_BLOCK_${index}@@@` 
            : `@@@MATH_INLINE_${index}@@@`
            
          html = html.split(placeholder).join(rendered)
        } catch (e) {
          console.error('KaTeX error:', e)
        }
      })

      return html
    } catch (e) {
      console.error('Render error:', e)
      return content
    }
  }, [content])

  return (
    <article className={`message-row message-row--${role} ${role === 'assistant' ? 'agent-turn' : 'user-turn'}`}>
      <div className="message-row__container">
        <div className="message-row__avatar">
          <div className={`avatar-icon avatar-icon--${role === 'assistant' ? 'ai' : 'user'}`}>
            {role === 'assistant' ? 'MT' : author.charAt(0).toUpperCase()}
          </div>
        </div>
        
        <div className="message-row__body">
          <h2 className="message-row__author">{author}</h2>
          
          <div className="message-row__content-wrapper">
            <div 
              className="message-row__content" 
              dangerouslySetInnerHTML={{ __html: htmlContent }} 
            />
          </div>

          <div className="message-row__actions-container">
            <div className="message-row__actions">
              <SiblingSwitch 
                siblingIdx={siblingIdx} 
                siblingCount={siblingCount} 
                onSwitch={onSwitchSibling || (() => {})} 
              />
              {siblingCount > 1 && <div className="divider" />}
              <button 
                type="button" 
                onClick={handleCopy}
                title="Copiar mensaje"
                aria-label="Copiar"
              >
                {isCopied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                )}
              </button>
              <button 
                type="button" 
                disabled={!canEdit} 
                onClick={() => onEdit?.(id)}
                title="Editar"
                aria-label="Editar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button 
                type="button" 
                disabled={!canRetry} 
                onClick={() => onRetry?.(id)}
                title="Reintentar"
                aria-label="Reintentar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 18 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              </button>
              <button 
                type="button" 
                disabled={!canBranch} 
                onClick={() => onBranch?.(id)}
                title="Ramificar"
                aria-label="Ramificar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
