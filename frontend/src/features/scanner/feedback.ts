// Sensory feedback for the scanner operator: a short beep (Web Audio) plus a
// vibration pattern (Vibration API). Both degrade silently where unsupported.

let ctx: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    // Some browsers suspend the context until a user gesture; resume best-effort.
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Plays a short tone. `kind` chooses a pleasant chime vs a low error buzz. */
export function beep(kind: 'ok' | 'warn' | 'error') {
  const ac = audioContext()
  if (!ac) return
  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)

  if (kind === 'ok') {
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(1320, now + 0.08)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
    osc.start(now)
    osc.stop(now + 0.24)
  } else if (kind === 'warn') {
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(560, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)
    osc.start(now)
    osc.stop(now + 0.32)
  } else {
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(200, now)
    osc.frequency.linearRampToValueAtTime(120, now + 0.3)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36)
    osc.start(now)
    osc.stop(now + 0.38)
  }
}

/** Vibrates the device if supported. */
export function vibrate(kind: 'ok' | 'warn' | 'error') {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    if (kind === 'ok') navigator.vibrate(60)
    else if (kind === 'warn') navigator.vibrate([40, 60, 40])
    else navigator.vibrate([120, 80, 120])
  } catch {
    // ignore
  }
}

/** Combined: sound + haptics in one call. */
export function feedback(kind: 'ok' | 'warn' | 'error') {
  beep(kind)
  vibrate(kind)
}
