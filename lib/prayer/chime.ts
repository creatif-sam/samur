// A soft chime when a guided prayer moves to the next request.
// iOS only lets a page play sound after a tap, so unlockChime() runs inside the Start tap.
// Vibration is not used: iPhones ignore it in the browser.

let audio: HTMLAudioElement | null = null
const MUTE_KEY = 'guided-chime-muted'

export function unlockChime() {
  try {
    if (!audio) {
      audio = new Audio('/sounds/notification.mp3')
      audio.volume = 0.5
    }
    // A silent play and pause inside the tap unlocks later plays
    audio.muted = true
    void audio.play().then(() => { audio!.pause(); audio!.currentTime = 0; audio!.muted = false }).catch(() => { if (audio) audio.muted = false })
  } catch {}
}

export function playChime() {
  if (chimeMuted() || !audio) return
  try {
    audio.currentTime = 0
    void audio.play().catch(() => {})
  } catch {}
}

export function chimeMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false }
}
export function setChimeMuted(muted: boolean) {
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0') } catch {}
}
