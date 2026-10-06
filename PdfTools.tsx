import { useState } from 'react'
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib'
import JSZip from 'jszip'
import { UploadZone, FileChip, ProgressBar } from '@/components/UploadZone'
import { ToolShell, ResultPanel, ErrorBox, ActionButton, type ResultFile } from '@/components/ToolShell'
import { TOOLS, fmtSize } from '@/lib/tools'
import { loadPdfJs, renderPageToCanvas, parsePageRanges } from '@/lib/pdf'
import { MoveUp, MoveDown } from 'lucide-react'

const T = (id: string) => TOOLS.find((t) => t.id === id)!
const base = (n: string) => n.replace(/\.[^.]+$/, '')

async function loadPdfLib(file: File) {
  const buf = await file.arrayBuffer()
  return PDFDocument.load(buf, { ignoreEncryption: true })
}

/* ---------------- Merge ---------------- */
export function PdfMerge() {
  const tool = T('pdf-merge')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const move = (i: number, d: -1 | 1) => {
    const a = [...files]; const j = i + d
    if (j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]; setFiles(a)
  }

  const run = async () => {
    if (files.length < 2) { setErr('Add at least 2 PDF files to merge.'); return }
    setBusy(true); setErr('')
    try {
      const out = await PDFDocument.create()
      for (const f of files) {
        const src = await loadPdfLib(f)
        const pages = await out.copyPages(src, src.getPageIndices())
        pages.forEach((p) => out.addPage(p))
      }
      const bytes = await out.save()
      setResult([{ name: 'merged.pdf', blob: new Blob([bytes as any], { type: 'application/pdf' }) }])
    } catch (e: any) { setErr('Could not merge: ' + (e.message || 'one file may be encrypted or corrupted.')) }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFiles([]) }} note={`${files.length} PDFs merged • ${fmtSize(result[0].blob.size)}`} /> : (
        <div className="space-y-5">
          <UploadZone accept="application/pdf" multiple onFiles={(f) => setFiles((p) => [...p, ...f])} label="Drop PDFs to merge" sublabel="Add 2 or more — arrange order below" />
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 glass rounded-xl px-3 py-2 animate-pop">
                  <span className="text-xs font-bold w-6 h-6 grid place-items-center rounded-full bg-primary/10 text-primary">{i + 1}</span>
                  <span className="flex-1 text-sm truncate">{f.name}</span>
                  <button onClick={() => move(i, -1)} className="p-1.5 hover:bg-accent rounded-lg" aria-label="Move up"><MoveUp className="w-4 h-4" /></button>
                  <button onClick={() => move(i, 1)} className="p-1.5 hover:bg-accent rounded-lg" aria-label="Move down"><MoveDown className="w-4 h-4" /></button>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg" aria-label="Remove">✕</button>
                </div>
              ))}
            </div>
          )}
          <ActionButton onClick={run} disabled={busy || files.length < 2}>{busy ? 'Merging…' : `🔗 Merge ${files.length} PDFs`}</ActionButton>
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Split ---------------- */
export function PdfSplit() {
  const tool = T('pdf-split')
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState(0)
  const [range, setRange] = useState('1')
  const [mode, setMode] = useState<'extract' | 'ranges'>('extract')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const pick = async (f: File) => {
    setErr('')
    try { const d = await loadPdfLib(f); setPages(d.getPageCount()); setFile(f); setRange(`1-${d.getPageCount()}`) }
    catch { setErr('Could not read this PDF (encrypted or corrupted?).') }
  }

  const run = async () => {
    if (!file) return
    setBusy(true); setErr('')
    try {
      const src = await loadPdfLib(file)
      if (mode === 'extract') {
        const idx = await parsePageRanges(range, pages)
        const out = await PDFDocument.create()
        ;(await out.copyPages(src, idx.map((p) => p - 1))).forEach((p) => out.addPage(p))
        const bytes = await out.save()
        setResult([{ name: `${base(file.name)}-pages.pdf`, blob: new Blob([bytes as any], { type: 'application/pdf' }) }])
      } else {
        // split every page into its own PDF, delivered as ZIP
        const zip = new JSZip()
        for (let i = 0; i < pages; i++) {
          const out = await PDFDocument.create()
          ;(await out.copyPages(src, [i])).forEach((p) => out.addPage(p))
          zip.file(`${base(file.name)}-page-${i + 1}.pdf`, await out.save())
        }
        const blob = await zip.generateAsync({ type: 'blob' })
        setResult([{ name: `${base(file.name)}-split.zip`, blob }])
      }
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null) }} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="application/pdf" onFiles={(f) => pick(f[0])} label="Drop a PDF to split" /> : (
            <>
              <FileChip file={file} onRemove={() => setFile(null)} />
              <p className="text-sm text-muted-foreground">This PDF has <b className="text-foreground">{pages}</b> pages.</p>
              <div className="flex gap-2">
                {([['extract', 'Extract pages'], ['ranges', 'Every page → separate PDFs (ZIP)']] as const).map(([m, l]) => (
                  <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-xl text-sm font-medium ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-secondary/70'}`}>{l}</button>
                ))}
              </div>
              {mode === 'extract' && (
                <div>
                  <label className="text-xs text-muted-foreground">Pages to extract (e.g. 1-3, 5, 8-10)</label>
                  <input value={range} onChange={(e) => setRange(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl bg-secondary/70 outline-none focus:ring-2 ring-primary/40 font-mono text-sm" />
                </div>
              )}
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Splitting…' : '✂️ Split PDF'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Compressor ---------------- */
export function PdfCompressor() {
  const tool = T('pdf-compressor')
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<'max' | 'balanced' | 'high'>('balanced')
  const [busy, setBusy] = useState(false); const [prog, setProg] = useState(0); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)
  const [stats, setStats] = useState('')

  const run = async () => {
    if (!file) return
    setBusy(true); setErr(''); setProg(2)
    try {
      // Re-render pages to JPEG at quality per level, rebuild PDF — true visual compression
      const q = level === 'max' ? 0.45 : level === 'balanced' ? 0.65 : 0.82
      const scale = level === 'max' ? 1.1 : level === 'balanced' ? 1.5 : 2
      const pdfjs = await loadPdfJs(await file.arrayBuffer())
      const out = await PDFDocument.create()
      for (let i = 1; i <= pdfjs.numPages; i++) {
        const canvas = await renderPageToCanvas(pdfjs, i, scale)
        const jpg = canvas.toDataURL('image/jpeg', q)
        const img = await out.embedJpg(jpg)
        const page = out.addPage([canvas.width / scale, canvas.height / scale])
        page.drawImage(img, { x: 0, y: 0, width: canvas.width / scale, height: canvas.height / scale })
        setProg(5 + (i / pdfjs.numPages) * 90)
      }
      const bytes = await out.save()
      const blob = new Blob([bytes as any], { type: 'application/pdf' })
      const saved = ((1 - blob.size / file.size) * 100).toFixed(1)
      setStats(`${fmtSize(file.size)} → ${fmtSize(blob.size)} • ${+saved > 0 ? `saved ${saved}%` : 'no reduction — this PDF is already well compressed'}`)
      setResult([{ name: `${base(file.name)}-compressed.pdf`, blob }])
    } catch (e: any) { setErr(e.message || 'Compression failed.') }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null) }} note={stats} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="application/pdf" onFiles={(f) => setFile(f[0])} label="Drop a PDF to compress" /> : (
            <>
              <FileChip file={file} onRemove={() => setFile(null)} />
              <div className="grid grid-cols-3 gap-2">
                {([['max', 'Maximum'], ['balanced', 'Balanced'], ['high', 'High quality']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setLevel(v)} className={`py-3 rounded-xl text-sm font-display font-semibold ${level === v ? 'bg-primary text-primary-foreground' : 'bg-secondary/70'}`}>{l}</button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Pages are re-rendered at the chosen quality — text becomes non-selectable at Maximum. Actual result size is always shown.</p>
              {busy && <ProgressBar value={prog} label="Compressing pages…" />}
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Compressing…' : '🗜️ Compress PDF'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Rotate ---------------- */
export function PdfRotate() {
  const tool = T('pdf-rotate')
  const [file, setFile] = useState<File | null>(null)
  const [angle, setAngle] = useState(90)
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setErr('')
    try {
      const doc = await loadPdfLib(file)
      doc.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + angle) % 360)))
      const bytes = await doc.save()
      setResult([{ name: `${base(file.name)}-rotated.pdf`, blob: new Blob([bytes as any], { type: 'application/pdf' }) }])
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null) }} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="application/pdf" onFiles={(f) => setFile(f[0])} label="Drop a PDF to rotate" /> : (
            <>
              <FileChip file={file} onRemove={() => setFile(null)} />
              <div className="grid grid-cols-3 gap-2">
                {[90, 180, 270].map((a) => (
                  <button key={a} onClick={() => setAngle(a)} className={`py-3 rounded-xl font-display font-semibold ${angle === a ? 'bg-primary text-primary-foreground' : 'bg-secondary/70'}`}>{a}°</button>
                ))}
              </div>
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Rotating…' : '🔃 Rotate All Pages'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Delete pages / Organize ---------------- */
export function PdfOrganize({ deleteMode = false }: { deleteMode?: boolean }) {
  const tool = T(deleteMode ? 'pdf-delete-pages' : 'pdf-organize')
  const [file, setFile] = useState<File | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [removed, setRemoved] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const pick = async (f: File) => {
    setErr('')
    try {
      const d = await loadPdfLib(f)
      setOrder(d.getPageIndices()); setRemoved(new Set()); setFile(f)
    } catch { setErr('Could not read this PDF.') }
  }

  const move = (i: number, d: -1 | 1) => {
    const a = [...order]; const j = i + d
    if (j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]; setOrder(a)
  }

  const run = async () => {
    if (!file) return
    setBusy(true); setErr('')
    try {
      const src = await loadPdfLib(file)
      const keep = order.filter((p) => !removed.has(p))
      if (keep.length === 0) throw new Error('You removed every page — keep at least one.')
      const out = await PDFDocument.create()
      ;(await out.copyPages(src, keep)).forEach((p) => out.addPage(p))
      const bytes = await out.save()
      setResult([{ name: `${base(file.name)}-edited.pdf`, blob: new Blob([bytes as any], { type: 'application/pdf' }) }])
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null) }} note={`${order.length - removed.size} pages kept`} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="application/pdf" onFiles={(f) => pick(f[0])} label={deleteMode ? 'Drop a PDF to delete pages' : 'Drop a PDF to organize pages'} /> : (
            <>
              <FileChip file={file} onRemove={() => setFile(null)} />
              <p className="text-xs text-muted-foreground">{deleteMode ? 'Tap 🗑 to mark pages for deletion.' : 'Use arrows to reorder, 🗑 to remove.'}</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {order.map((p, i) => (
                  <div key={p} className={`rounded-xl border p-2 text-center transition-all ${removed.has(p) ? 'opacity-40 border-destructive/50 bg-destructive/5' : 'glass'}`}>
                    <p className="text-sm font-bold mb-1.5">Page {p + 1}</p>
                    <div className="flex justify-center gap-0.5">
                      <button onClick={() => move(i, -1)} className="p-1 hover:bg-accent rounded" aria-label="Up"><MoveUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => move(i, 1)} className="p-1 hover:bg-accent rounded" aria-label="Down"><MoveDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { const s = new Set(removed); s.has(p) ? s.delete(p) : s.add(p); setRemoved(s) }} className="p-1 hover:bg-destructive/10 text-destructive rounded" aria-label="Toggle delete">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Processing…' : deleteMode ? '🗑️ Delete Marked Pages' : '📑 Save New Order'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Watermark ---------------- */
export function PdfWatermark() {
  const tool = T('pdf-watermark')
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('CONFIDENTIAL')
  const [opacity, setOpacity] = useState(20)
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const run = async () => {
    if (!file || !text.trim()) { setErr('Enter watermark text first.'); return }
    setBusy(true); setErr('')
    try {
      const doc = await loadPdfLib(file)
      const font = await doc.embedFont(StandardFonts.HelveticaBold)
      for (const page of doc.getPages()) {
        const { width, height } = page.getSize()
        const size = Math.min(width, height) / 8
        const tw = font.widthOfTextAtSize(text, size)
        page.drawText(text, {
          x: width / 2 - tw / 2, y: height / 2 - size / 3, size, font,
          color: rgb(0.55, 0.55, 0.65), opacity: opacity / 100, rotate: degrees(38),
        })
      }
      const bytes = await doc.save()
      setResult([{ name: `${base(file.name)}-watermarked.pdf`, blob: new Blob([bytes as any], { type: 'application/pdf' }) }])
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null) }} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="application/pdf" onFiles={(f) => setFile(f[0])} label="Drop a PDF to watermark" /> : (
            <>
              <FileChip file={file} onRemove={() => setFile(null)} />
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Watermark text" className="w-full h-11 px-3 rounded-xl bg-secondary/70 outline-none focus:ring-2 ring-primary/40" />
              <div><label className="text-xs text-muted-foreground">Opacity: {opacity}%</label>
                <input type="range" min={5} max={80} value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="mt-2 w-full accent-indigo-500" /></div>
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Stamping…' : '💧 Add Watermark'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Page numbers ---------------- */
export function PdfPageNumbers() {
  const tool = T('pdf-page-numbers')
  const [file, setFile] = useState<File | null>(null)
  const [pos, setPos] = useState<'bl' | 'bc' | 'br'>('bc')
  const [start, setStart] = useState(1)
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setErr('')
    try {
      const doc = await loadPdfLib(file)
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const pages = doc.getPages()
      pages.forEach((page, i) => {
        const { width } = page.getSize()
        const label = `${i + start}`
        const size = 11
        const tw = font.widthOfTextAtSize(label, size)
        const x = pos === 'bl' ? 30 : pos === 'br' ? width - 30 - tw : width / 2 - tw / 2
        page.drawText(label, { x, y: 18, size, font, color: rgb(0.3, 0.3, 0.35) })
      })
      const bytes = await doc.save()
      setResult([{ name: `${base(file.name)}-numbered.pdf`, blob: new Blob([bytes as any], { type: 'application/pdf' }) }])
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null) }} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="application/pdf" onFiles={(f) => setFile(f[0])} label="Drop a PDF to add page numbers" /> : (
            <>
              <FileChip file={file} onRemove={() => setFile(null)} />
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Position</label>
                  <select value={pos} onChange={(e) => setPos(e.target.value as any)} className="mt-1 w-full h-10 px-2 rounded-xl bg-secondary/70 outline-none">
                    <option value="bl">Bottom left</option><option value="bc">Bottom center</option><option value="br">Bottom right</option>
                  </select></div>
                <div><label className="text-xs text-muted-foreground">Start from</label>
                  <input type="number" value={start} onChange={(e) => setStart(+e.target.value || 1)} className="mt-1 w-full h-10 px-3 rounded-xl bg-secondary/70 outline-none" /></div>
              </div>
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Numbering…' : '🔢 Add Page Numbers'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- PDF → Images ---------------- */
export function PdfToImage() {
  const tool = T('pdf-to-image')
  const [file, setFile] = useState<File | null>(null)
  const [fmt, setFmt] = useState<'jpeg' | 'png' | 'webp'>('png')
  const [busy, setBusy] = useState(false); const [prog, setProg] = useState(0); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setErr(''); setProg(2)
    try {
      const pdf = await loadPdfJs(await file.arrayBuffer())
      const zip = new JSZip()
      for (let i = 1; i <= pdf.numPages; i++) {
        const canvas = await renderPageToCanvas(pdf, i, 2)
        const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('render failed'))), `image/${fmt}`, 0.9))
        zip.file(`page-${i}.${fmt === 'jpeg' ? 'jpg' : fmt}`, blob)
        setProg(5 + (i / pdf.numPages) * 90)
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      setResult([{ name: `${base(file.name)}-images.zip`, blob }])
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null) }} note="All pages rendered at 2× resolution, packed as ZIP" /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="application/pdf" onFiles={(f) => setFile(f[0])} label="Drop a PDF to convert to images" /> : (
            <>
              <FileChip file={file} onRemove={() => setFile(null)} />
              <div className="grid grid-cols-3 gap-2">
                {(['png', 'jpeg', 'webp'] as const).map((f) => (
                  <button key={f} onClick={() => setFmt(f)} className={`py-3 rounded-xl font-display font-semibold text-sm ${fmt === f ? 'bg-primary text-primary-foreground' : 'bg-secondary/70'}`}>{f.toUpperCase()}</button>
                ))}
              </div>
              {busy && <ProgressBar value={prog} label="Rendering pages…" />}
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Rendering…' : '🖼️ Convert to Images (ZIP)'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- PDF → Text ---------------- */
export function PdfToText() {
  const tool = T('pdf-to-text')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false); const [prog, setProg] = useState(0); const [err, setErr] = useState('')
  const [text, setText] = useState<string | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setErr(''); setProg(2)
    try {
      const pdf = await loadPdfJs(await file.arrayBuffer())
      let out = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const tc = await page.getTextContent()
        out += `--- Page ${i} ---\n` + tc.items.map((it: any) => it.str).join(' ') + '\n\n'
        setProg(5 + (i / pdf.numPages) * 90)
      }
      setText(out.trim() || '(No selectable text found — this may be a scanned PDF. Try the OCR tool.)')
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {text !== null ? (
        <div className="animate-pop space-y-4">
          <textarea readOnly value={text} className="w-full h-72 rounded-2xl bg-secondary/50 p-4 text-sm font-mono outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <ActionButton onClick={() => import('@/lib/tools').then(({ download }) => download(new Blob([text], { type: 'text/plain' }), `${base(file!.name)}.txt`))}>📄 Download .TXT</ActionButton>
            <button onClick={() => { setText(null); setFile(null) }} className="py-3.5 rounded-2xl border hover:bg-accent font-medium text-sm">Process another</button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="application/pdf" onFiles={(f) => setFile(f[0])} label="Drop a PDF to extract text" /> : (
            <>
              <FileChip file={file} onRemove={() => setFile(null)} />
              {busy && <ProgressBar value={prog} label="Extracting text…" />}
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Extracting…' : '📄 Extract Text'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Metadata ---------------- */
export function PdfMetadata() {
  const tool = T('pdf-metadata')
  const [meta, setMeta] = useState<Record<string, string> | null>(null)
  const [err, setErr] = useState('')

  const pick = async (f: File) => {
    setErr('')
    try {
      const pdf = await loadPdfJs(await f.arrayBuffer())
      const info = (await pdf.getMetadata()).info as any
      const m: Record<string, string> = {
        'File name': f.name, 'Size': fmtSize(f.size), 'Pages': String(pdf.numPages),
        'Title': info?.Title || '—', 'Author': info?.Author || '—', 'Creator': info?.Creator || '—',
        'Producer': info?.Producer || '—', 'PDF version': info?.PDFFormatVersion || '—',
        'Created': info?.CreationDate || '—', 'Modified': info?.ModDate || '—',
      }
      setMeta(m)
    } catch { setErr('Could not read this PDF (encrypted or corrupted?).') }
  }

  return (
    <ToolShell tool={tool}>
      {meta ? (
        <div className="animate-pop">
          <div className="rounded-2xl border overflow-hidden mb-5">
            {Object.entries(meta).map(([k, v], i) => (
              <div key={k} className={`flex gap-3 px-4 py-2.5 text-sm ${i % 2 ? 'bg-secondary/40' : ''}`}>
                <span className="w-32 shrink-0 text-muted-foreground">{k}</span><span className="font-medium break-all">{v}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setMeta(null)} className="w-full py-3 rounded-xl border hover:bg-accent text-sm font-medium">Check another PDF</button>
        </div>
      ) : (
        <div><UploadZone accept="application/pdf" onFiles={(f) => pick(f[0])} label="Drop a PDF to inspect" /><ErrorBox msg={err} /></div>
      )}
    </ToolShell>
  )
}
