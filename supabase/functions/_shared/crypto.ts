// @ts-nocheck
/**
 * Cifrado seguro de secretos usando AES-256-GCM
 * Requiere variable de entorno ENCRYPTION_KEY (base64, 32 bytes)
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits recomendado para GCM

async function getEncryptionKey() {
  const keyBase64 = Deno.env.get('ENCRYPTION_KEY')
  
  if (!keyBase64) {
    throw new Error('ENCRYPTION_KEY no está configurada en las variables de entorno')
  }

  try {
    // Decodificar la clave desde base64
    const keyData = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0))
    
    if (keyData.length !== 32) {
      throw new Error('ENCRYPTION_KEY debe ser de 32 bytes (256 bits)')
    }

    // Importar la clave para uso con Web Crypto API
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  } catch (error) {
    throw new Error(`Error al cargar ENCRYPTION_KEY: ${error.message}`)
  }
}

export async function encryptSecret(plainText: string) {
  if (!plainText) {
    throw new Error('El texto a cifrar no puede estar vacío')
  }

  try {
    const key = await getEncryptionKey()
    
    // Generar IV aleatorio
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    
    // Convertir texto a bytes
    const encoder = new TextEncoder()
    const data = encoder.encode(plainText)
    
    // Cifrar
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    )
    
    // Convertir a base64 para almacenamiento
    const encryptedArray = new Uint8Array(encryptedBuffer)
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray))
    const ivBase64 = btoa(String.fromCharCode(...iv))
    
    return {
      encryptedText: encryptedBase64,
      iv: ivBase64,
      algorithm: ALGORITHM,
    }
  } catch (error) {
    throw new Error(`Error al cifrar: ${error.message}`)
  }
}

export async function decryptSecret(encryptedText: string, iv: string = null, algorithm: string = ALGORITHM) {
  if (!encryptedText) {
    throw new Error('El texto cifrado no puede estar vacío')
  }

  // Si no hay IV, asumir que es texto plano (para compatibilidad con datos antiguos)
  if (!iv || iv === 'placeholder-iv') {
    console.warn('Descifrando texto sin IV - posiblemente datos no cifrados')
    return encryptedText
  }

  try {
    const key = await getEncryptionKey()
    
    // Decodificar desde base64
    const encryptedArray = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0))
    const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0))
    
    // Descifrar
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: algorithm, iv: ivArray },
      key,
      encryptedArray
    )
    
    // Convertir bytes a texto
    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (error) {
    throw new Error(`Error al descifrar: ${error.message}`)
  }
}

export function maskSecret(secret: string) {
  if (!secret || secret.length < 4) {
    return '••••'
  }
  const suffix = secret.slice(-4)
  return `••••${suffix}`
}

/**
 * Genera una nueva clave de cifrado aleatoria en formato base64
 * Útil para configuración inicial
 */
export function generateEncryptionKey() {
  const key = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...key))
}
