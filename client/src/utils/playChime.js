// Web Audio API pure synthesizer chime (no external audio files required)
let audioCtx = null

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (AudioContext) {
      audioCtx = new AudioContext()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

// 🔔 High-priority order chime (e.g. for sellers, riders, admins when a new order arrives)
export function playOrderAlertChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // 1st note (880 Hz - A5)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)
    gain1.gain.setValueAtTime(0.3, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // 2nd note (1174.66 Hz - D6)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1174.66, now + 0.15)
    gain2.gain.setValueAtTime(0.35, now + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.6)

    // 3rd note (1760 Hz - A6)
    const osc3 = ctx.createOscillator()
    const gain3 = ctx.createGain()
    osc3.type = 'triangle'
    osc3.frequency.setValueAtTime(1760, now + 0.3)
    gain3.gain.setValueAtTime(0.4, now + 0.3)
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
    osc3.connect(gain3)
    gain3.connect(ctx.destination)
    osc3.start(now + 0.3)
    osc3.stop(now + 0.9)

    // Trigger phone vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300])
    }
  } catch (err) {
    console.warn('[playOrderAlertChime] audio error:', err?.message)
  }
}

// 💬 Pleasant notification pop (for order status changes & messages)
export function playNotificationDing() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(987.77, now) // B5
    osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15) // E6
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.4)

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([150, 80, 150])
    }
  } catch (err) {
    console.warn('[playNotificationDing] audio error:', err?.message)
  }
}
