const quickPrompts = [
  'Traduce esta frase y explícamela con ejemplos',
  'Ayúdame a practicar phrasal verbs de nivel B1',
  'Corrige este texto en inglés y dime por qué',
]

export function WelcomePanel() {
  return (
    <section className="panel-card">
      <div className="panel-card__head">
        <div>
          <p className="eyebrow">Inicio guiado</p>
          <h3>Qué puedes hacer aquí</h3>
        </div>
      </div>
      <div className="preset-list">
        {quickPrompts.map((prompt) => (
          <button key={prompt} className="preset-item" type="button">
            <span>{prompt}</span>
            <small>Prompt sugerido</small>
          </button>
        ))}
      </div>
    </section>
  )
}
