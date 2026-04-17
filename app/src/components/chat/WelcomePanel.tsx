const quickPrompts = [
  { icon: '🌎', text: 'Traduce esta frase y explícamela con ejemplos' },
  { icon: '📚', text: 'Ayúdame a practicar phrasal verbs de nivel B1' },
  { icon: '✏️', text: 'Corrige este texto en inglés y dime por qué' },
]

export function WelcomePanel({ onQuickPrompt }: { onQuickPrompt?: (text: string) => void }) {
  return (
    <div className="welcome-container">
      <section className="welcome-screen">
        <div className="welcome-screen__header">
          <div className="welcome-screen__logo">
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="m5 8 6 6 6-6" />
              <path d="m5 16 6-6 6 6" />
            </svg>
          </div>
          <h1>¿Cómo puedo ayudarte hoy?</h1>
        </div>
        
        <div className="welcome-screen__grid">
          {quickPrompts.map((prompt, index) => (
            <button 
              key={index} 
              className="welcome-card" 
              type="button"
              onClick={() => onQuickPrompt?.(prompt.text)}
            >
              <span className="welcome-card__icon">{prompt.icon}</span>
              <p>{prompt.text}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
