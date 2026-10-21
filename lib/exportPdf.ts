// "Export PDF": renders content in a clean print layout and opens the system
// print dialog, where "Save as PDF" is available on phones and desktops.
// Uses a hidden iframe so it also works inside the installed app.

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export function exportPdf({ title, subtitle, html }: { title: string; subtitle?: string; html: string }) {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.6; font-size: 12pt; }
  h1 { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; font-size: 20pt; margin: 0 0 4pt; }
  .subtitle { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; color: #666; font-size: 10pt; margin-bottom: 16pt; }
  h2, h3 { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; margin: 14pt 0 4pt; }
  h2 { font-size: 13pt; color: #5b21b6; text-transform: uppercase; letter-spacing: .04em; }
  blockquote { border-left: 3px solid #c4b5fd; margin: 8pt 0; padding: 2pt 10pt; color: #333; font-style: italic; }
  ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  ul[data-type="taskList"] li { display: flex; gap: 6pt; }
  a { color: #5b21b6; }
  .footer { margin-top: 24pt; font-family: Arial, sans-serif; font-size: 8pt; color: #999; }
</style></head><body>
<h1>${escapeHtml(title)}</h1>
${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
${html}
<div class="footer">Exported from Mastery · ${escapeHtml(new Date().toLocaleDateString())}</div>
</body></html>`

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  document.body.appendChild(iframe)
  const frameDoc = iframe.contentWindow?.document
  if (!frameDoc || !iframe.contentWindow) {
    iframe.remove()
    return
  }
  frameDoc.open()
  frameDoc.write(doc)
  frameDoc.close()
  const cleanup = () => setTimeout(() => iframe.remove(), 1000)
  iframe.contentWindow.addEventListener('afterprint', cleanup)
  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(cleanup, 60_000) // fallback if afterprint never fires
  }, 250)
}

export function textToHtml(text: string) {
  return escapeHtml(text).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
}
