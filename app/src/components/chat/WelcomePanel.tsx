import { useEffect, useState } from 'react'

import {
  VOCABULARY_LEVELS,
  buildVocabularyPrompt,
  getRandomVocabulary,
  type VocabularyLevel,
  type VocabularyWord,
} from '../../lib/vocabulary'

type WelcomePanelProps = {
  vocabularyLevel: VocabularyLevel
  onQuickPrompt?: (text: string) => void
}

export function WelcomePanel({ vocabularyLevel, onQuickPrompt }: WelcomePanelProps) {
  const [words, setWords] = useState<VocabularyWord[]>([])
  const level = VOCABULARY_LEVELS[vocabularyLevel]

  const shuffleWords = () => {
    setWords(getRandomVocabulary(vocabularyLevel))
  }

  useEffect(() => {
    setWords(getRandomVocabulary(vocabularyLevel))
  }, [vocabularyLevel])

  return (
    <div className="welcome-container">
      <section className="vocab-practice" aria-labelledby="vocab-practice-title">
        <div className="vocab-practice__header">
          <div>
            <p className="eyebrow">Mi Traductor · práctica rápida</p>
            <h1 id="vocab-practice-title">Palabras para practicar hoy</h1>
            <p>
              Vocabulario frecuente para aprender inglés de forma útil. Toca una tarjeta y lanzaré una práctica guiada.
            </p>
          </div>
          <span className="vocab-practice__level" title="Cambia este nivel desde Configuración">
            <span>{level.icon}</span>
            <strong>{vocabularyLevel}</strong>
            <small>{level.label}</small>
          </span>
        </div>

        <div className="vocab-practice__words" aria-label={`Palabras sugeridas para nivel ${vocabularyLevel}`}>
          {words.map((item) => (
            <button
              key={`${vocabularyLevel}-${item.word}`}
              type="button"
              className="vocab-word-card"
              onClick={() => onQuickPrompt?.(buildVocabularyPrompt(item, vocabularyLevel))}
            >
              <strong>{item.word}</strong>
              <span>{item.hint}</span>
            </button>
          ))}
        </div>

        <div className="vocab-practice__footer">
          <p>El nivel se cambia en Configuración para mantener limpia la pantalla principal.</p>
          <button type="button" className="vocab-shuffle-btn" onClick={shuffleWords}>
            <span aria-hidden="true">↻</span>
            Otras palabras
          </button>
        </div>
      </section>
    </div>
  )
}
