export type VocabularyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export type VocabularyWord = {
  word: string
  hint: string
}

export const VOCABULARY_LEVELS: Record<VocabularyLevel, { label: string; icon: string; description: string }> = {
  A1: { label: 'Inicial', icon: '🌱', description: 'Palabras esenciales para empezar' },
  A2: { label: 'Básico alto', icon: '🌿', description: 'Vocabulario cotidiano y útil' },
  B1: { label: 'Intermedio', icon: '🌻', description: 'Palabras frecuentes para expresarte mejor' },
  B2: { label: 'Intermedio alto', icon: '🌳', description: 'Verbos y matices comunes en conversaciones reales' },
  C1: { label: 'Avanzado', icon: '⛰️', description: 'Vocabulario preciso para ideas complejas' },
  C2: { label: 'Maestría', icon: '🌌', description: 'Palabras naturales para fluidez avanzada' },
}

const STORAGE_KEY = 'vocabulary_practice_level'

export const VOCABULARY_BANK: Record<VocabularyLevel, VocabularyWord[]> = {
  A1: [
    { word: 'people', hint: 'personas' }, { word: 'family', hint: 'familia' }, { word: 'friend', hint: 'amigo' }, { word: 'home', hint: 'hogar' },
    { word: 'school', hint: 'escuela' }, { word: 'work', hint: 'trabajo' }, { word: 'food', hint: 'comida' }, { word: 'water', hint: 'agua' },
    { word: 'money', hint: 'dinero' }, { word: 'time', hint: 'tiempo' }, { word: 'day', hint: 'día' }, { word: 'week', hint: 'semana' },
    { word: 'good', hint: 'bueno' }, { word: 'bad', hint: 'malo' }, { word: 'new', hint: 'nuevo' }, { word: 'old', hint: 'viejo' },
    { word: 'big', hint: 'grande' }, { word: 'small', hint: 'pequeño' }, { word: 'want', hint: 'querer' }, { word: 'need', hint: 'necesitar' },
    { word: 'like', hint: 'gustar' }, { word: 'know', hint: 'saber' }, { word: 'make', hint: 'hacer' }, { word: 'take', hint: 'tomar' },
  ],
  A2: [
    { word: 'always', hint: 'siempre' }, { word: 'usually', hint: 'normalmente' }, { word: 'often', hint: 'a menudo' }, { word: 'sometimes', hint: 'a veces' },
    { word: 'before', hint: 'antes' }, { word: 'after', hint: 'después' }, { word: 'during', hint: 'durante' }, { word: 'because', hint: 'porque' },
    { word: 'enough', hint: 'suficiente' }, { word: 'almost', hint: 'casi' }, { word: 'maybe', hint: 'tal vez' }, { word: 'early', hint: 'temprano' },
    { word: 'late', hint: 'tarde' }, { word: 'easy', hint: 'fácil' }, { word: 'hard', hint: 'difícil' }, { word: 'important', hint: 'importante' },
    { word: 'learn', hint: 'aprender' }, { word: 'travel', hint: 'viajar' }, { word: 'change', hint: 'cambiar' }, { word: 'wait', hint: 'esperar' },
    { word: 'bring', hint: 'traer' }, { word: 'leave', hint: 'salir/dejar' }, { word: 'meet', hint: 'conocer/reunirse' }, { word: 'try', hint: 'intentar' },
  ],
  B1: [
    { word: 'prevent', hint: 'prevenir' }, { word: 'avoid', hint: 'evitar' }, { word: 'remain', hint: 'permanecer' }, { word: 'support', hint: 'apoyar' },
    { word: 'respond', hint: 'responder' }, { word: 'affect', hint: 'afectar' }, { word: 'reduce', hint: 'reducir' }, { word: 'handle', hint: 'manejar' },
    { word: 'improve', hint: 'mejorar' }, { word: 'increase', hint: 'aumentar' }, { word: 'include', hint: 'incluir' }, { word: 'explain', hint: 'explicar' },
    { word: 'consider', hint: 'considerar' }, { word: 'decide', hint: 'decidir' }, { word: 'develop', hint: 'desarrollar' }, { word: 'offer', hint: 'ofrecer' },
    { word: 'provide', hint: 'proveer' }, { word: 'allow', hint: 'permitir' }, { word: 'expect', hint: 'esperar' }, { word: 'suggest', hint: 'sugerir' },
    { word: 'however', hint: 'sin embargo' }, { word: 'although', hint: 'aunque' }, { word: 'instead', hint: 'en lugar de' }, { word: 'therefore', hint: 'por lo tanto' },
  ],
  B2: [
    { word: 'achieve', hint: 'lograr' }, { word: 'assume', hint: 'suponer' }, { word: 'claim', hint: 'afirmar' }, { word: 'compare', hint: 'comparar' },
    { word: 'concern', hint: 'preocupar' }, { word: 'define', hint: 'definir' }, { word: 'encourage', hint: 'animar' }, { word: 'ensure', hint: 'asegurar' },
    { word: 'establish', hint: 'establecer' }, { word: 'involve', hint: 'implicar' }, { word: 'maintain', hint: 'mantener' }, { word: 'obtain', hint: 'obtener' },
    { word: 'perform', hint: 'realizar' }, { word: 'require', hint: 'requerir' }, { word: 'reveal', hint: 'revelar' }, { word: 'suitable', hint: 'adecuado' },
    { word: 'likely', hint: 'probable' }, { word: 'aware', hint: 'consciente' }, { word: 'available', hint: 'disponible' }, { word: 'accurate', hint: 'preciso' },
    { word: 'despite', hint: 'a pesar de' }, { word: 'whereas', hint: 'mientras que' }, { word: 'otherwise', hint: 'de lo contrario' }, { word: 'furthermore', hint: 'además' },
  ],
  C1: [
    { word: 'address', hint: 'abordar' }, { word: 'assess', hint: 'evaluar' }, { word: 'convey', hint: 'transmitir' }, { word: 'derive', hint: 'derivar' },
    { word: 'emphasize', hint: 'enfatizar' }, { word: 'enhance', hint: 'mejorar' }, { word: 'imply', hint: 'implicar' }, { word: 'indicate', hint: 'indicar' },
    { word: 'interpret', hint: 'interpretar' }, { word: 'justify', hint: 'justificar' }, { word: 'neglect', hint: 'descuidar' }, { word: 'perceive', hint: 'percibir' },
    { word: 'pursue', hint: 'perseguir' }, { word: 'rely', hint: 'depender' }, { word: 'shift', hint: 'cambio' }, { word: 'undermine', hint: 'socavar' },
    { word: 'consistent', hint: 'coherente' }, { word: 'crucial', hint: 'crucial' }, { word: 'subtle', hint: 'sutil' }, { word: 'widespread', hint: 'extendido' },
    { word: 'nevertheless', hint: 'no obstante' }, { word: 'namely', hint: 'es decir' }, { word: 'thereby', hint: 'por ello' }, { word: 'ultimately', hint: 'en última instancia' },
  ],
  C2: [
    { word: 'acknowledge', hint: 'reconocer' }, { word: 'articulate', hint: 'expresar claramente' }, { word: 'comply', hint: 'cumplir' }, { word: 'depict', hint: 'representar' },
    { word: 'discern', hint: 'discernir' }, { word: 'elaborate', hint: 'elaborar' }, { word: 'encompass', hint: 'abarcar' }, { word: 'hinder', hint: 'obstaculizar' },
    { word: 'mitigate', hint: 'mitigar' }, { word: 'overlook', hint: 'pasar por alto' }, { word: 'pinpoint', hint: 'localizar con precisión' }, { word: 'reinforce', hint: 'reforzar' },
    { word: 'scrutinize', hint: 'examinar' }, { word: 'withstand', hint: 'resistir' }, { word: 'flawless', hint: 'impecable' }, { word: 'readily', hint: 'fácilmente' },
    { word: 'sheer', hint: 'puro/absoluto' }, { word: 'thorough', hint: 'exhaustivo' }, { word: 'viable', hint: 'viable' }, { word: 'arguably', hint: 'podría decirse' },
    { word: 'hence', hint: 'por ende' }, { word: 'thereafter', hint: 'después de eso' }, { word: 'albeit', hint: 'aunque' }, { word: 'notwithstanding', hint: 'a pesar de' },
  ],
}

export function getStoredVocabularyLevel(): VocabularyLevel {
  const value = localStorage.getItem(STORAGE_KEY)
  return isVocabularyLevel(value) ? value : 'B1'
}

export function setStoredVocabularyLevel(level: VocabularyLevel) {
  localStorage.setItem(STORAGE_KEY, level)
}

export function isVocabularyLevel(value: string | null): value is VocabularyLevel {
  return Boolean(value && value in VOCABULARY_LEVELS)
}

export function getRandomVocabulary(level: VocabularyLevel, count = 8): VocabularyWord[] {
  const pool = [...VOCABULARY_BANK[level]]

  for (let index = pool.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = pool[index]
    pool[index] = pool[randomIndex]
    pool[randomIndex] = current
  }

  return pool.slice(0, count)
}

export function buildVocabularyPrompt(word: VocabularyWord, level: VocabularyLevel) {
  return `Ayúdame a practicar la palabra "${word.word}" (${word.hint}) en nivel ${level}. Dame una explicación corta en español, 3 ejemplos naturales en inglés con traducción, errores comunes y un mini ejercicio para responder.`
}
