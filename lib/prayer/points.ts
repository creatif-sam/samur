// Prayer points in diary entries are a checklist inside the note's HTML, in the same
// format the Notes editor uses, so they tick both on the Prayer tab and in Notes.
// Parsing uses the browser's DOMParser, so these run in the browser only.

export interface PrayerPoint {
  text: string
  checked: boolean
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// A new diary entry: free text as paragraphs, then the points as an unticked (or ticked) checklist
export function buildDiaryHtml(text: string, points: { text: string; checked?: boolean }[]) {
  const body = text.trim()
    ? text.trim().split(/\n{2,}/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')
    : ''
  const items = points.map(p => p.text.trim()).filter(Boolean).length
    ? `<ul data-type="taskList">${points
        .filter(p => p.text.trim())
        .map(p => `<li data-type="taskItem" data-checked="${p.checked ? 'true' : 'false'}"><p>${escapeHtml(p.text.trim())}</p></li>`)
        .join('')}</ul>`
    : ''
  return body + items
}

function parse(html: string) {
  return new DOMParser().parseFromString(`<body>${html ?? ''}</body>`, 'text/html')
}

// Every checklist item in document order (nested items included, each counted once)
const itemsOf = (doc: Document) => [...doc.querySelectorAll('li[data-type="taskItem"]')]

// The item's own words, without the checkbox markup or any list nested inside it
function ownText(li: Element) {
  const copy = li.cloneNode(true) as Element
  copy.querySelectorAll('ul, ol, label, input').forEach(n => n.remove())
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function extractPoints(html: string): PrayerPoint[] {
  if (!html || !html.includes('taskItem')) return []
  return itemsOf(parse(html)).map(li => ({ text: ownText(li), checked: li.getAttribute('data-checked') === 'true' }))
}

// Flip (or set) one point; returns the updated HTML, or the same HTML if there is no such point
export function togglePoint(html: string, index: number, checked?: boolean): string {
  const doc = parse(html)
  const li = itemsOf(doc)[index]
  if (!li) return html
  const next = checked ?? li.getAttribute('data-checked') !== 'true'
  li.setAttribute('data-checked', next ? 'true' : 'false')
  // The editor's own markup also carries a checkbox; keep it in step
  const box = li.querySelector(':scope > label > input[type="checkbox"]')
  if (box) {
    if (next) box.setAttribute('checked', 'checked')
    else box.removeAttribute('checked')
  }
  return doc.body.innerHTML
}

// The entry's text without its checklist, for the short preview on the card
export function diaryPreview(html: string) {
  if (!html) return ''
  const doc = parse(html)
  doc.querySelectorAll('ul[data-type="taskList"]').forEach(n => n.remove())
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}
