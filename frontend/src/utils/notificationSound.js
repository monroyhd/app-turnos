/**
 * Generador de tono de notificación usando Web Audio API
 * Reemplaza el archivo MP3 corrupto con un "ding-dong" hospitalario
 */

let audioContext = null
let isUnlocked = false

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioContext
}

/**
 * Desbloquea el AudioContext (requiere interacción del usuario en Chrome/Safari)
 */
export async function unlockAudio() {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  isUnlocked = true
}

/**
 * Indica si el AudioContext está desbloqueado y listo para reproducir
 */
export function isAudioUnlocked() {
  return isUnlocked && audioContext && audioContext.state === 'running'
}

/**
 * Intenta desbloquear el audio automáticamente (modo kiosco con --autoplay-policy=no-user-gesture-required).
 * Retorna true si el AudioContext ya está en estado 'running', false si necesita interacción del usuario.
 */
export async function tryAutoUnlock() {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'running') {
      isUnlocked = true
      return true
    }
    // Intentar resume por si el contexto está suspendido pero permitido
    await ctx.resume()
    if (ctx.state === 'running') {
      isUnlocked = true
      return true
    }
  } catch (e) {
    console.warn('Auto-unlock de audio no disponible:', e)
  }
  return false
}

/**
 * Reproduce un tono "ding-dong" hospitalario de dos notas
 * Nota 1: Do5 (523 Hz) — Nota 2: Mi5 (659 Hz)
 */
export function playNotificationChime() {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime

    // --- Nota 1: Do5 (523 Hz) ---
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.value = 523.25
    gain1.gain.setValueAtTime(0, now)
    gain1.gain.linearRampToValueAtTime(0.4, now + 0.02)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.4)

    // --- Nota 2: Mi5 (659 Hz) ---
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.value = 659.25
    gain2.gain.setValueAtTime(0, now + 0.4)
    gain2.gain.linearRampToValueAtTime(0.4, now + 0.42)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.4)
    osc2.stop(now + 0.8)
  } catch (e) {
    console.warn('No se pudo reproducir sonido de notificación:', e)
  }
}
