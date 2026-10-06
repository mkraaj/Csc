import { useEffect, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { UploadZone, ProgressBar } from '@/components/UploadZone'
import { ToolShell, ResultPanel, ErrorBox, ActionButton, type ResultFile } from '@/components/ToolShell'
import { TOOLS } from '@/lib/tools'
import { loadPdfJs, renderPageToCanvas } from '@/lib/pdf'
import { ChevronLeft, ChevronRight, Type, Pen, Highlighter, Square, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import Tesseract from 'tesseract.js'

const T = (id: string) => TOOLS.find((t) => t.id === id)!
const base = (n: string) => n.replace(/\.[^.]+$/, '')

type Mode = 'text' | 'draw' | 'highlight' | 'rect' | 'whiteout'
interface Stroke { mode: Mode; color: string; size: number; points: { x: number; y: number }[]; text?: string }

/* =================== PDF EDITOR ===================
   Overlay editor: pages rendered as background, user adds text / freehand draw /
   highlight / rectangles / whiteout on a canvas layer. On save, overlays are
   baked onto the page render and written into a new PDF with pdf-lib. */
export function PdfEditor() {
  const tool = T('pdf-editor')
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [zoom, setZoom] = useState(1.4)
  const [mode, setMode] = useState<Mode>('draw')
  const [color, setColor] = useState('#ef4444')
  const [size, setSize] = useState(3)
  const [textVal, setTextVal] = useState('')
  const [busy, setBusy] = useState(false); const [prog, setProg] = useState(0); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)
  const [dirtyPages, setDirtyPages] = useState<Set<number>>(new Set())

  const bgRef = useRef<HTMLCanvasElement>(null)
  const fgRef = useRef<HTMLCanvasElement>(null)
  const pdfRef = useRef<any>(null)
  const strokes = useRef<Map<number, Stroke[]>>(new Map())
  const current = useRef<Stroke | null>(null)
  const drawing = useRef(false)

  useEffect(() => { if (file) renderPage() }, [file, pageNum, zoom])

  const redrawFg = () => {
    const fg = fgRef.current; if (!fg) return
    const ctx = fg.getContext('2d')!
    ctx.clearRect(0, 0, fg.width, fg.height)
    for (const s of strokes.current.get(pageNum) || []) paintStroke(ctx, s)
  }

  const paintStroke = (ctx: CanvasRenderingContext2D, s: Stroke) => {
    if (s.points.length === 0) return
    if (s.mode === 'text') {
      ctx.font = `bold ${s.size * 6}px Sora, sans-serif`
      ctx.fillStyle = s.color
      ctx.fillText(s.text || '', s.points[0].x, s.points[0].y)
      return
    }
    if (s.mode === 'rect' || s.mode === 'whiteout') {
      const [a, b] = [s.points[0], s.points[s.points.length - 1]]
      ctx.fillStyle = s.mode === 'whiteout' ? '#ffffff' : s.color
      ctx.globalAlpha = s.mode === 'rect' ? 0.35 : 1
      ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
      ctx.globalAlpha = 1
      return
    }
    ctx.strokeStyle = s.color
    ctx.lineWidth = s.mode === 'highlight' ? s.size * 5 : s.size
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.globalAlpha = s.mode === 'highlight' ? 0.35 : 1
    ctx.beginPath()
    s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  const renderPage = async () => {
    const pdf = pdfRef.current; if (!pdf) return
    const canvas = await renderPageToCanvas(pdf, pageNum, zoom)
    const bg = bgRef.current!, fg = fgRef.current!
    bg.width = fg.width = canvas.width; bg.height = fg.height = canvas.height
    bg.getContext('2d')!.drawImage(canvas, 0, 0)
    redrawFg()
  }

  const pick = async (f: File) => {
    setErr('')
    try {
      pdfRef.current = await loadPdfJs(await f.arrayBuffer())
      setPageCount(pdfRef.current.numPages); setPageNum(1); setFile(f)
      strokes.current.clear(); setDirtyPages(new Set())
    } catch { setErr('Could not open this PDF (encrypted or corrupted?).') }
  }

  const pos = (e: React.PointerEvent) => {
    const r = fgRef.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * fgRef.current!.width, y: ((e.clientY - r.top) / r.height) * fgRef.current!.height }
  }

  const down = (e: React.PointerEvent) => {
    const p = pos(e)
    if (mode === 'text') {
      const t = textVal.trim() || prompt('Text to add:') || ''
      if (!t) return
      const s: Stroke = { mode, color, size, points: [p], text: t }
      strokes.current.set(pageNum, [...(strokes.current.get(pageNum) || []), s])
      setDirtyPages((d) => new Set(d).add(pageNum)); redrawFg()
      return
    }
    drawing.current = true
    current.current = { mode, color, size, points: [p] }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !current.current) return
    current.current.points.push(pos(e))
    redrawFg(); paintStroke(fgRef.current!.getContext('2d')!, current.current)
  }
  const up = () => {
    if (!drawing.current || !current.current) return
    drawing.current = false
    strokes.current.set(pageNum, [...(strokes.current.get(pageNum) || []), current.current])
    setDirtyPages((d) => new Set(d).add(pageNum))
    current.current = null
  }

  const undo = () => {
    const arr = strokes.current.get(pageNum) || []
    arr.pop(); redrawFg()
  }

  const save = async () => {
    if (!file) return
    setBusy(true); setErr(''); setProg(2)
    try {
      const pdf = pdfRef.current
      const out = await PDFDocument.create()
      for (let i = 1; i <= pageCount; i++) {
        const st = strokes.current.get(i) || []
        const canvas = await renderPageToCanvas(pdf, i, zoom)
        if (st.length) {
          // bake overlays
          const c2 = document.createElement('canvas'); c2.width = canvas.width; c2.height = canvas.height
          const ctx = c2.getContext('2d')!
          ctx.drawImage(canvas, 0, 0)
          st.forEach((s) => paintStroke(ctx, s))
          canvas.width = c2.width; canvas.height = c2.height
          canvas.getContext('2d')!.drawImage(c2, 0, 0)
        }
        if (st.length) {
          const img = await out.embedPng(canvas.toDataURL('image/png'))
          const page = out.addPage([canvas.width / zoom, canvas.height / zoom])
          page.drawImage(img, { x: 0, y: 0, width: canvas.width / zoom, height: canvas.height / zoom })
        } else {
          // keep original page vectors untouched
          const srcDoc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
          const [copied] = await out.copyPages(srcDoc, [i - 1])
          out.addPage(copied)
        }
        setProg(5 + (i / pageCount) * 92)
      }
      const bytes = await out.save()
      setResult([{ name: `${base(file.name)}-edited.pdf`, blob: new Blob([bytes as any], { type: 'application/pdf' }) }])
    } catch (e: any) { setErr(e.message || 'Save failed.') }
    setBusy(false)
  }

  const modes: { m: Mode; icon: React.ReactNode; label: string }[] = [
    { m: 'draw', icon: <Pen className="w-4 h-4" />, label: 'Draw' },
    { m: 'highlight', icon: <Highlighter className="w-4 h-4" />, label: 'Highlight' },
    { m: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' },
    { m: 'rect', icon: <Square className="w-4 h-4" />, label: 'Shape' },
    { m: 'whiteout', icon: <span className="text-xs font-bold">▦</span>, label: 'Whiteout' },
  ]

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null) }} note={`${dirtyPages.size} page(s) modified — edited pages are saved as high-res images; untouched pages keep original quality`} /> : !file ? (
        <div className="space-y-4">
          <UploadZone accept="application/pdf" onFiles={(f) => pick(f[0])} label="Open a PDF to edit" sublabel="Add text, draw, highlight, shapes & whiteout on any page" />
          <p className="text-xs text-muted-foreground rounded-xl bg-secondary/50 p-3">ℹ️ Browser-based editing adds content <b>on top of</b> pages. Rewriting existing embedded text is not technically possible in the browser — use whiteout + text to cover and replace content. Scanned PDFs: use the OCR tool.</p>
          <ErrorBox msg={err} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {modes.map(({ m, icon, label }) => (
              <button key={m} onClick={() => setMode(m)} title={label}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-secondary/70 hover:bg-accent'}`}>
                {icon} <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer bg-transparent" aria-label="Color" />
            <input type="range" min={1} max={10} value={size} onChange={(e) => setSize(+e.target.value)} className="w-20 accent-indigo-500" aria-label="Brush size" />
            <button onClick={undo} className="p-2 rounded-xl bg-secondary/70 hover:bg-accent" aria-label="Undo"><Undo2 className="w-4 h-4" /></button>
            <div className="flex-1" />
            <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))} className="p-2 rounded-xl bg-secondary/70" aria-label="Zoom out"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="p-2 rounded-xl bg-secondary/70" aria-label="Zoom in"><ZoomIn className="w-4 h-4" /></button>
          </div>
          {mode === 'text' && <input value={textVal} onChange={(e) => setTextVal(e.target.value)} placeholder="Text to place (then tap on the page)" className="w-full h-10 px-3 rounded-xl bg-secondary/70 outline-none text-sm" />}
          {/* page */}
          <div className="overflow-auto rounded-2xl border bg-secondary/30 max-h-[60vh] grid place-items-center p-2">
            <div className="relative">
              <canvas ref={bgRef} className="block rounded shadow-xl" />
              <canvas ref={fgRef} className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                onPointerDown={down} onPointerMove={move} onPointerUp={up} />
            </div>
          </div>
          {/* pager */}
          <div className="flex items-center justify-center gap-4">
            <button disabled={pageNum <= 1} onClick={() => setPageNum(pageNum - 1)} className="p-2 rounded-xl bg-secondary/70 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-sm font-medium">Page {pageNum} / {pageCount} {dirtyPages.has(pageNum) && <span className="text-primary">• edited</span>}</span>
            <button disabled={pageNum >= pageCount} onClick={() => setPageNum(pageNum + 1)} className="p-2 rounded-xl bg-secondary/70 disabled:opacity-40" aria-label="Next page"><ChevronRight className="w-5 h-5" /></button>
          </div>
          {busy && <ProgressBar value={prog} label="Building edited PDF…" />}
          <ActionButton onClick={save} disabled={busy || dirtyPages.size === 0}>{busy ? 'Saving…' : '💾 Save & Download Edited PDF'}</ActionButton>
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* =================== OCR =================== */
export function PdfOcr() {
  const tool = T('pdf-ocr')
  const [file, setFile] = useState<File | null>(null)
  const [lang, setLang] = useState('eng')
  const [busy, setBusy] = useState(false); const [prog, setProg] = useState(0); const [status, setStatus] = useState('')
  const [err, setErr] = useState('')
  const [text, setText] = useState<string | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setErr(''); setProg(1)
    try {
      let images: Blob[] = []
      if (file.type === 'application/pdf') {
        const pdf = await loadPdfJs(await file.arrayBuffer())
        const n = Math.min(pdf.numPages, 10)
        for (let i = 1; i <= n; i++) {
          const canvas = await renderPageToCanvas(pdf, i, 2)
          images.push(await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej()), 'image/png')))
          setStatus(`Rendering page ${i}/${n}`)
        }
      } else images = [file]
      let out = ''
      for (let i = 0; i < images.length; i++) {
        setStatus(`Recognizing text — image ${i + 1}/${images.length}`)
        const r = await Tesseract.recognize(images[i], lang, {
          logger: (m) => { if (m.status === 'recognizing text') setProg((i / images.length) * 100 + m.progress * (100 / images.length)) },
        })
        out += (images.length > 1 ? `--- Page ${i + 1} ---\n` : '') + r.data.text.trim() + '\n\n'
      }
      setText(out.trim() || '(No text detected in this file.)')
    } catch (e: any) { setErr(e.message || 'OCR failed.') }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {text !== null ? (
        <div className="animate-pop space-y-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full h-72 rounded-2xl bg-secondary/50 p-4 text-sm font-mono outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <ActionButton onClick={() => import('@/lib/tools').then(({ download }) => download(new Blob([text], { type: 'text/plain' }), `${base(file!.name)}-ocr.txt`))}>⬇️ Download .TXT</ActionButton>
            <button onClick={() => { setText(null); setFile(null) }} className="py-3.5 rounded-2xl border hover:bg-accent font-medium text-sm">Process another</button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="application/pdf,image/*" onFiles={(f) => setFile(f[0])} label="Drop a scanned PDF or image" sublabel="First 10 pages of a PDF are processed" /> : (
            <>
              <div className="flex items-center gap-3">
                <span className="text-lg">📄</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{file.name}</p></div>
                <select value={lang} onChange={(e) => setLang(e.target.value)} className="h-9 px-2 rounded-xl bg-secondary/70 text-sm outline-none">
                  <option value="eng">English</option><option value="hin">हिन्दी (Hindi)</option><option value="eng+hin">English + Hindi</option>
                </select>
              </div>
              {busy && <ProgressBar value={prog} label={status} />}
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Recognizing…' : '👁️ Run OCR'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}
