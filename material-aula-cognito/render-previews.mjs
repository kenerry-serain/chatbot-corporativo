import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const source = JSON.parse(readFileSync(new URL('./cognito-autoatende.excalidraw', import.meta.url), 'utf8'))
const outputDir = new URL('./previews/', import.meta.url)
mkdirSync(outputDir, { recursive: true })

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

function renderText(element, frame) {
  const x = element.x - frame.x
  const y = element.y - frame.y
  const anchor = element.textAlign === 'center' ? 'middle' : element.textAlign === 'right' ? 'end' : 'start'
  const anchorX = anchor === 'middle' ? x + element.width / 2 : anchor === 'end' ? x + element.width : x
  const family = element.fontFamily === 3 ? "'Courier New', monospace" : 'Arial, Helvetica, sans-serif'
  const lines = element.text.split('\n')
  return `<text x="${anchorX}" y="${y + element.fontSize}" fill="${element.strokeColor}" font-family="${family}" font-size="${element.fontSize}" font-weight="500" text-anchor="${anchor}">${lines.map((line, index) => `<tspan x="${anchorX}" dy="${index === 0 ? 0 : element.fontSize * element.lineHeight}">${escapeXml(line)}</tspan>`).join('')}</text>`
}

function renderElement(element, frame) {
  const x = element.x - frame.x
  const y = element.y - frame.y
  const fill = element.backgroundColor === 'transparent' ? 'none' : element.backgroundColor
  const dash = element.strokeStyle === 'dashed' ? 'stroke-dasharray="12 8"' : ''
  const opacity = `opacity="${(element.opacity ?? 100) / 100}"`
  if (element.type === 'text') return renderText(element, frame)
  if (element.type === 'rectangle') return `<rect x="${x}" y="${y}" width="${element.width}" height="${element.height}" rx="${element.roundness ? 14 : 0}" fill="${fill}" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}" ${opacity} ${dash}/>`
  if (element.type === 'ellipse') return `<ellipse cx="${x + element.width / 2}" cy="${y + element.height / 2}" rx="${element.width / 2}" ry="${element.height / 2}" fill="${fill}" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}" ${opacity}/>`
  if (element.type === 'diamond') return `<polygon points="${x + element.width / 2},${y} ${x + element.width},${y + element.height / 2} ${x + element.width / 2},${y + element.height} ${x},${y + element.height / 2}" fill="${fill}" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}" ${opacity}/>`
  if (element.type === 'line' || element.type === 'arrow') {
    const [endX, endY] = element.points.at(-1)
    const marker = element.strokeColor === '#dc2626' ? 'arrow-red' : element.strokeColor === '#38bdf8' ? 'arrow-cyan' : 'arrow-blue'
    return `<line x1="${x}" y1="${y}" x2="${x + endX}" y2="${y + endY}" stroke="${element.strokeColor}" stroke-width="${element.strokeWidth}" ${opacity} ${dash} ${element.type === 'arrow' ? `marker-end="url(#${marker})"` : ''}/>`
  }
  return ''
}

function renderFrame(frame) {
  const children = source.elements.filter((element) => element.frameId === frame.id && !element.isDeleted)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <marker id="arrow-blue" markerWidth="12" markerHeight="12" refX="10" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#2563eb"/></marker>
    <marker id="arrow-cyan" markerWidth="12" markerHeight="12" refX="10" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#38bdf8"/></marker>
    <marker id="arrow-red" markerWidth="12" markerHeight="12" refX="10" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#dc2626"/></marker>
  </defs>
  <rect width="1600" height="900" fill="${frame.backgroundColor}"/>
  ${children.map((element) => renderElement(element, frame)).join('\n  ')}
</svg>`
}

const frames = source.elements.filter((element) => element.type === 'frame' && !element.isDeleted)
for (const [index, frame] of frames.entries()) {
  writeFileSync(new URL(`slide-${String(index + 1).padStart(2, '0')}.svg`, outputDir), renderFrame(frame))
}

const contactSheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1640" height="2350" viewBox="0 0 1640 2350">
  <rect width="1640" height="2350" fill="#dbeafe"/>
  ${frames.map((frame, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = 20 + col * 810
    const y = 20 + row * 466
    const children = source.elements.filter((element) => element.frameId === frame.id && !element.isDeleted)
    return `<g transform="translate(${x} ${y}) scale(0.5)"><rect width="1600" height="900" fill="${frame.backgroundColor}" stroke="#2563eb" stroke-width="2"/>${children.map((element) => renderElement(element, frame)).join('')}</g>`
  }).join('\n  ')}
</svg>`

writeFileSync(new URL('contact-sheet.svg', outputDir), contactSheet)
console.log(`Rendered ${frames.length} slide previews and a contact sheet.`)
