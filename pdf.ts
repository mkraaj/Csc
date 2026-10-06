import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export { pdfjsLib }

export async function loadPdfJs(data: ArrayBuffer) {
  return pdfjsLib.getDocument({ data }).promise
}

export async function renderPageToCanvas(pdf: pdfjsLib.PDFDocumentProxy, pageNum: number, scale: number) {
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width; canvas.height = viewport.height
  await page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas }).promise
  return canvas
}

export async function parsePageRanges(spec: string, total: number): Promise<number[]> {
  const pages = new Set<number>()
  for (const part of spec.split(',')) {
    const p = part.trim()
    if (!p) continue
    const m = p.match(/^(\d+)(?:-(\d+))?$/)
    if (!m) throw new Error(`Invalid page range: "${p}"`)
    const a = parseInt(m[1]), b = m[2] ? parseInt(m[2]) : a
    if (a < 1 || b > total || a > b) throw new Error(`Page range "${p}" is out of 1–${total}.`)
    for (let i = a; i <= b; i++) pages.add(i)
  }
  if (pages.size === 0) throw new Error('Enter at least one page, e.g. "1-3, 5".')
  return [...pages].sort((x, y) => x - y)
}
