// Is this device's clock right? Compares it with the server's clock.
// A phone whose time zone is set wrong, with its clock then moved by hand to look right,
// shows the right time on its home screen but is an hour (or more) off underneath. The app
// then labels an 11:00 meditation as noon, files late-evening entries under the next day
// (which breaks streaks), and would send that wrong time zone to the server.

export const SKEW_LIMIT_MS = 2 * 60_000

// How far the device clock is ahead (+) or behind (−) the server, allowing for the round trip
export function measureSkew(sentAt: number, receivedAt: number, serverNow: number) {
  return (sentAt + receivedAt) / 2 - serverNow
}

export const clockIsOff = (skewMs: number) => Math.abs(skewMs) > SKEW_LIMIT_MS

// "1 hour ahead", "45 minutes behind", "2 hours 30 minutes ahead"
export function describeSkew(skewMs: number) {
  const mins = Math.round(Math.abs(skewMs) / 60_000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const parts = [
    h ? `${h} hour${h === 1 ? '' : 's'}` : '',
    m ? `${m} minute${m === 1 ? '' : 's'}` : '',
  ].filter(Boolean)
  return `${parts.join(' ') || 'less than a minute'} ${skewMs > 0 ? 'ahead' : 'behind'}`
}

// The notice can be hidden for a day
export const CLOCK_NOTICE_KEY = 'clock-notice-hidden-until'
