import { useRef, useState } from 'react'
import { UploadZone, FileChip, ProgressBar } from '@/components/UploadZone'
import { ToolShell, ResultPanel, ErrorBox, ActionButton, type ResultFile } from '@/components/ToolShell'
import { TOOLS, fmtSize } from '@/lib/tools'
import { loadImage, drawToCanvas, canvasToBlob, compressToTarget, readExif } from '@/lib/imaging'
import { jsPDF } from 'jspdf'
import { MoveUp, MoveDown, Trash2 } from 'lucide-react'

const T = (id: string) => TOOLS.find((t) => t.id === id)!
const ext = (fmt: string) => fmt.split('/')[1].replace('jpeg', 'jpg')
const base = (n: string) => n.replace(/\.[^.]+$/, '')

/* ---------------- Image Compressor ---------------- */
export function ImageCompressor() {
  const tool = T('image-compressor')
  const [file, setFile] = useState<File | null>(null)
  const [target, setTarget] = useState('50')
  const [unit, setUnit] = useState<'KB' | 'MB'>('KB')
  const [format, setFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg')
  const [busy, setBusy] = useState(false)
  const [prog, setProg] = useState(0)
  const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)
  const [stats, setStats] = useState('')

  const run = async () => {
    if (!file) return
    setBusy(true); setErr(''); setProg(5)
    try {
      const img = await loadImage(file)
      const bytes = (parseFloat(target) || 50) * (unit === 'KB' ? 1024 : 1024 * 1024)
      const blob = await compressToTarget(img, bytes, format, setProg)
      const saved = ((1 - blob.size / file.size) * 100).toFixed(1)
      setStats(`${fmtSize(file.size)} → ${fmtSize(blob.size)} • saved ${saved}%`)
      setResult([{ name: `${base(file.name)}-compressed.${ext(format)}`, blob }])
    } catch (e: any) { setErr(e.message || 'Compression failed.') }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null) }} note={stats} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="image/jpeg,image/png,image/webp" onFiles={(f) => setFile(f[0])} label="Drop an image to compress" /> : (
            <>
              <div className="flex flex-col sm:flex-row gap-4">
                <img src={URL.createObjectURL(file)} alt="preview" className="w-full sm:w-44 h-44 object-cover rounded-2xl border" />
                <div className="flex-1 space-y-4">
                  <FileChip file={file} onRemove={() => setFile(null)} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Target size</label>
                      <div className="flex gap-2 mt-1">
                        <input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-secondary/70 outline-none focus:ring-2 ring-primary/40" />
                        <select value={unit} onChange={(e) => setUnit(e.target.value as any)} className="h-10 px-2 rounded-xl bg-secondary/70 outline-none">
                          <option>KB</option><option>MB</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Output format</label>
                      <select value={format} onChange={(e) => setFormat(e.target.value as any)} className="mt-1 w-full h-10 px-3 rounded-xl bg-secondary/70 outline-none">
                        <option value="image/jpeg">JPG (best compression)</option>
                        <option value="image/webp">WEBP</option>
                        <option value="image/png">PNG (lossless)</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Original: {fmtSize(file.size)}. Quality and resolution are auto-tuned to reach your target; actual size is shown after processing.</p>
                </div>
              </div>
              {busy && <ProgressBar value={prog} label="Compressing…" />}
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Compressing…' : '🗜️ Compress Image'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Resizer / Enlarger ---------------- */
export function ImageResizer({ enlarge = false }: { enlarge?: boolean }) {
  const tool = T(enlarge ? 'image-enlarger' : 'image-resizer')
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [w, setW] = useState(0); const [h, setH] = useState(0)
  const [pct, setPct] = useState(enlarge ? '200' : '50')
  const [lock, setLock] = useState(true)
  const [mode, setMode] = useState<'pct' | 'dim'>(enlarge ? 'pct' : 'dim')
  const [format, setFormat] = useState('image/png')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)
  const [stats, setStats] = useState('')

  const pick = async (f: File) => {
    setErr('')
    try { const im = await loadImage(f); setImg(im); setW(im.naturalWidth); setH(im.naturalHeight); setFile(f) }
    catch (e: any) { setErr(e.message) }
  }

  const run = async () => {
    if (!img || !file) return
    setBusy(true); setErr('')
    try {
      let tw = w, th = h
      if (mode === 'pct') { const p = (parseFloat(pct) || 100) / 100; tw = Math.round(img.naturalWidth * p); th = Math.round(img.naturalHeight * p) }
      if (!enlarge && (tw > img.naturalWidth * 4 || th > img.naturalHeight * 4)) throw new Error('Target too large.')
      const c = drawToCanvas(img, tw, th)
      const blob = await canvasToBlob(c, format, format === 'image/png' ? undefined : 0.92)
      setStats(`${img.naturalWidth}×${img.naturalHeight} → ${tw}×${th} • ${fmtSize(file.size)} → ${fmtSize(blob.size)}`)
      setResult([{ name: `${base(file.name)}-${tw}x${th}.${ext(format)}`, blob }])
    } catch (e: any) { setErr(e.message || 'Resize failed.') }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null); setImg(null) }} note={stats} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="image/*" onFiles={(f) => pick(f[0])} label={enlarge ? 'Drop a small image to enlarge' : 'Drop an image to resize'} /> : (
            <>
              <div className="flex flex-col sm:flex-row gap-4">
                <img src={URL.createObjectURL(file)} className="w-full sm:w-44 h-44 object-contain rounded-2xl border bg-secondary/40" alt="preview" />
                <div className="flex-1 space-y-4">
                  <FileChip file={file} onRemove={() => { setFile(null); setImg(null) }} />
                  <div className="flex gap-2">
                    {(['dim', 'pct'] as const).map((m) => (
                      <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-secondary/70'}`}>
                        {m === 'dim' ? 'Dimensions' : 'Percentage'}
                      </button>
                    ))}
                  </div>
                  {mode === 'dim' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs text-muted-foreground">Width (px)</label>
                        <input type="number" value={w} onChange={(e) => { const v = +e.target.value; setW(v); if (lock && img) setH(Math.round(v * img.naturalHeight / img.naturalWidth)) }} className="mt-1 w-full h-10 px-3 rounded-xl bg-secondary/70 outline-none focus:ring-2 ring-primary/40" /></div>
                      <div><label className="text-xs text-muted-foreground">Height (px)</label>
                        <input type="number" value={h} onChange={(e) => { const v = +e.target.value; setH(v); if (lock && img) setW(Math.round(v * img.naturalWidth / img.naturalHeight)) }} className="mt-1 w-full h-10 px-3 rounded-xl bg-secondary/70 outline-none focus:ring-2 ring-primary/40" /></div>
                    </div>
                  ) : (
                    <div><label className="text-xs text-muted-foreground">Scale: {pct}%</label>
                      <input type="range" min={enlarge ? 100 : 5} max={enlarge ? 800 : 200} value={pct} onChange={(e) => setPct(e.target.value)} className="mt-2 w-full accent-indigo-500" /></div>
                  )}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} className="accent-indigo-500 w-4 h-4" /> Lock aspect ratio</label>
                    <select value={format} onChange={(e) => setFormat(e.target.value)} className="h-9 px-2 rounded-xl bg-secondary/70 text-sm outline-none">
                      <option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WEBP</option>
                    </select>
                  </div>
                </div>
              </div>
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Processing…' : enlarge ? '🔍 Enlarge Image' : '📐 Resize Image'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Crop ---------------- */
export function ImageCrop() {
  const tool = T('image-crop')
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [ratio, setRatio] = useState<'free' | '1:1' | '4:3' | '16:9'>('free')
  const [sel, setSel] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const dragRef = useRef<{ sx: number; sy: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const pick = async (f: File) => {
    setErr('')
    try { const im = await loadImage(f); setImg(im); setFile(f); setSel(null) } catch (e: any) { setErr(e.message) }
  }

  const pt = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect()
    const x = Math.min(Math.max(0, e.clientX - r.left), r.width)
    const y = Math.min(Math.max(0, e.clientY - r.top), r.height)
    return { x, y, r }
  }
  const down = (e: React.PointerEvent) => {
    const p = pt(e); dragRef.current = { sx: p.x, sy: p.y }
    setSel({ x: p.x, y: p.y, w: 0, h: 0 })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d) return
    const p = pt(e)
    let w = p.x - d.sx, h = p.y - d.sy
    if (ratio !== 'free') {
      const [a, b] = ratio.split(':').map(Number)
      h = (Math.sign(h || 1) * Math.abs(w) * b) / a
    }
    setSel({ x: w < 0 ? d.sx + w : d.sx, y: h < 0 ? d.sy + h : d.sy, w: Math.abs(w), h: Math.abs(h) })
  }
  const up = () => { dragRef.current = null }

  const crop = async () => {
    if (!img || !file || !sel || sel.w < 4 || sel.h < 4) { setErr('Drag on the image to select a crop area first.'); return }
    setErr('')
    const r = boxRef.current!.getBoundingClientRect()
    const kx = img.naturalWidth / r.width, ky = img.naturalHeight / r.height
    const c = document.createElement('canvas')
    c.width = Math.round(sel.w * kx); c.height = Math.round(sel.h * ky)
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, sel.x * kx, sel.y * ky, sel.w * kx, sel.h * ky, 0, 0, c.width, c.height)
    const blob = await canvasToBlob(c, 'image/png')
    setResult([{ name: `${base(file.name)}-cropped.png`, blob }])
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null); setImg(null) }} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="image/*" onFiles={(f) => pick(f[0])} label="Drop an image to crop" /> : (
            <>
              <div className="flex flex-wrap gap-2">
                {(['free', '1:1', '4:3', '16:9'] as const).map((r) => (
                  <button key={r} onClick={() => setRatio(r)} className={`px-4 py-2 rounded-xl text-sm font-medium ${ratio === r ? 'bg-primary text-primary-foreground' : 'bg-secondary/70'}`}>{r === 'free' ? 'Free' : r}</button>
                ))}
              </div>
              <div ref={boxRef} className="relative select-none touch-none rounded-2xl overflow-hidden border cursor-crosshair mx-auto w-fit max-w-full"
                onPointerDown={down} onPointerMove={move} onPointerUp={up}>
                <img src={URL.createObjectURL(file)} className="max-w-full max-h-[55vh] block pointer-events-none" alt="crop" draggable={false} />
                {sel && <div className="absolute border-2 border-sky-400 bg-sky-400/20 rounded" style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }} />}
              </div>
              <p className="text-xs text-muted-foreground text-center">Drag on the image to select the crop area{sel ? ` • ${Math.round(sel.w)}×${Math.round(sel.h)} px (screen)` : ''}</p>
              <ActionButton onClick={crop}>✂️ Crop & Download</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Converter ---------------- */
export function ImageConverter() {
  const tool = T('image-converter')
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState('image/png')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)
  const [stats, setStats] = useState('')

  const run = async () => {
    if (!file) return
    setBusy(true); setErr('')
    try {
      const img = await loadImage(file)
      const c = drawToCanvas(img, img.naturalWidth, img.naturalHeight)
      if (format === 'image/jpeg') {
        const c2 = document.createElement('canvas'); c2.width = c.width; c2.height = c.height
        const x = c2.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, c2.width, c2.height); x.drawImage(c, 0, 0)
        const blob = await canvasToBlob(c2, format, 0.92)
        setStats(`${fmtSize(file.size)} → ${fmtSize(blob.size)}`); setResult([{ name: `${base(file.name)}.${ext(format)}`, blob }])
      } else {
        const blob = await canvasToBlob(c, format, 0.92)
        setStats(`${fmtSize(file.size)} → ${fmtSize(blob.size)}`); setResult([{ name: `${base(file.name)}.${ext(format)}`, blob }])
      }
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null) }} note={stats} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="image/*" onFiles={(f) => setFile(f[0])} label="Drop an image to convert" /> : (
            <>
              <FileChip file={file} onRemove={() => setFile(null)} />
              <div className="grid grid-cols-3 gap-2">
                {['image/png', 'image/jpeg', 'image/webp'].map((f) => (
                  <button key={f} onClick={() => setFormat(f)} className={`py-3 rounded-xl font-display font-semibold text-sm ${format === f ? 'bg-primary text-primary-foreground' : 'bg-secondary/70'}`}>{ext(f).toUpperCase()}</button>
                ))}
              </div>
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Converting…' : '🔄 Convert'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Rotate / Flip ---------------- */
export function ImageRotateFlip() {
  const tool = T('image-rotate')
  const [file, setFile] = useState<File | null>(null)
  const [rot, setRot] = useState(0)
  const [fx, setFx] = useState(false); const [fy, setFy] = useState(false)
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setErr('')
    try {
      const img = await loadImage(file)
      const rad = (rot * Math.PI) / 180
      const swap = Math.abs(rot % 180) === 90
      const c = document.createElement('canvas')
      c.width = swap ? img.naturalHeight : img.naturalWidth
      c.height = swap ? img.naturalWidth : img.naturalHeight
      const ctx = c.getContext('2d')!
      ctx.translate(c.width / 2, c.height / 2); ctx.rotate(rad)
      ctx.scale(fx ? -1 : 1, fy ? -1 : 1)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      const blob = await canvasToBlob(c, file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.92)
      setResult([{ name: `${base(file.name)}-rotated.${file.type === 'image/jpeg' ? 'jpg' : 'png'}`, blob }])
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null); setRot(0); setFx(false); setFy(false) }} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="image/*" onFiles={(f) => setFile(f[0])} label="Drop an image to rotate or flip" /> : (
            <>
              <FileChip file={file} onRemove={() => setFile(null)} />
              <div className="mx-auto w-fit rounded-2xl border bg-secondary/40 p-3 overflow-hidden">
                <img src={URL.createObjectURL(file)} alt="preview" className="max-h-64 transition-transform duration-300"
                  style={{ transform: `rotate(${rot}deg) scaleX(${fx ? -1 : 1}) scaleY(${fy ? -1 : 1})` }} />
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[90, 180, 270].map((d) => (
                  <button key={d} onClick={() => setRot((rot + 90) % 360)} className="px-4 py-2 rounded-xl bg-secondary/70 text-sm font-medium hover:bg-accent hidden">{d}°</button>
                ))}
                <button onClick={() => setRot((rot + 90) % 360)} className="px-4 py-2 rounded-xl bg-secondary/70 text-sm font-medium hover:bg-accent">↻ Rotate 90° ({rot}°)</button>
                <button onClick={() => setFx(!fx)} className={`px-4 py-2 rounded-xl text-sm font-medium ${fx ? 'bg-primary text-primary-foreground' : 'bg-secondary/70'}`}>⇋ Flip H</button>
                <button onClick={() => setFy(!fy)} className={`px-4 py-2 rounded-xl text-sm font-medium ${fy ? 'bg-primary text-primary-foreground' : 'bg-secondary/70'}`}>⇅ Flip V</button>
                <button onClick={() => { setRot(0); setFx(false); setFy(false) }} className="px-4 py-2 rounded-xl bg-secondary/70 text-sm">Reset</button>
              </div>
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Processing…' : '🔃 Apply & Download'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Metadata ---------------- */
export function ImageMetadata() {
  const tool = T('image-metadata')
  const [meta, setMeta] = useState<Record<string, string> | null>(null)
  const [err, setErr] = useState('')

  const pick = async (f: File) => {
    setErr('')
    try {
      const img = await loadImage(f)
      const m: Record<string, string> = {
        'File name': f.name, 'Type': f.type || 'unknown', 'Size': fmtSize(f.size),
        'Dimensions': `${img.naturalWidth} × ${img.naturalHeight} px`,
        'Megapixels': `${((img.naturalWidth * img.naturalHeight) / 1e6).toFixed(2)} MP`,
        'Aspect ratio': `${(img.naturalWidth / img.naturalHeight).toFixed(3)}`,
        'Last modified': new Date(f.lastModified).toLocaleString(),
      }
      Object.assign(m, await readExif(f))
      setMeta(m)
    } catch (e: any) { setErr(e.message) }
  }

  return (
    <ToolShell tool={tool}>
      {meta ? (
        <div className="animate-pop">
          <div className="rounded-2xl border overflow-hidden mb-5">
            {Object.entries(meta).map(([k, v], i) => (
              <div key={k} className={`flex gap-3 px-4 py-2.5 text-sm ${i % 2 ? 'bg-secondary/40' : ''}`}>
                <span className="w-36 shrink-0 text-muted-foreground">{k}</span>
                <span className="font-medium break-all">{v}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setMeta(null)} className="w-full py-3 rounded-xl border hover:bg-accent text-sm font-medium">Check another image</button>
        </div>
      ) : (
        <div><UploadZone accept="image/*" onFiles={(f) => pick(f[0])} label="Drop an image to inspect" /><ErrorBox msg={err} /></div>
      )}
    </ToolShell>
  )
}

/* ---------------- File Rename ---------------- */
export function FileRename() {
  const tool = T('file-rename')
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null) }} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone onFiles={(f) => { setFile(f[0]); setName(f[0].name) }} label="Drop any file to rename" /> : (
            <>
              <FileChip file={file} onRemove={() => setFile(null)} />
              <div>
                <label className="text-xs font-medium text-muted-foreground">New file name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl bg-secondary/70 outline-none focus:ring-2 ring-primary/40 font-mono text-sm" />
              </div>
              <ActionButton onClick={() => setResult([{ name: name.trim() || file.name, blob: file }])}>✏️ Rename & Download</ActionButton>
            </>
          )}
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Image to PDF ---------------- */
export function ImageToPdf() {
  const tool = T('image-to-pdf')
  const [files, setFiles] = useState<File[]>([])
  const [pageSize, setPageSize] = useState<'a4' | 'fit'>('a4')
  const [orient, setOrient] = useState<'p' | 'l'>('p')
  const [margin, setMargin] = useState(10)
  const [busy, setBusy] = useState(false); const [prog, setProg] = useState(0); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const move = (i: number, d: -1 | 1) => {
    const a = [...files]; const j = i + d
    if (j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]; setFiles(a)
  }

  const run = async () => {
    if (files.length === 0) return
    setBusy(true); setErr(''); setProg(3)
    try {
      let pdf: jsPDF | null = null
      for (let i = 0; i < files.length; i++) {
        const img = await loadImage(files[i])
        const iw = img.naturalWidth, ih = img.naturalHeight
        let pw: number, ph: number
        if (pageSize === 'fit') { pw = iw * 0.2646; ph = ih * 0.2646 } // px→mm @96dpi
        else { pw = orient === 'p' ? 210 : 297; ph = orient === 'p' ? 297 : 210 }
        const maxW = pw - margin * 2, maxH = ph - margin * 2
        const s = Math.min(maxW / (iw * 0.2646), maxH / (ih * 0.2646))
        const w = iw * 0.2646 * s, h = ih * 0.2646 * s
        const c = drawToCanvas(img, iw, ih)
        const data = c.toDataURL('image/jpeg', 0.9)
        if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [pw, ph], orientation: pw > ph ? 'l' : 'p' })
        else pdf.addPage([pw, ph], pw > ph ? 'l' : 'p')
        pdf.addImage(data, 'JPEG', (pw - w) / 2, (ph - h) / 2, w, h)
        setProg(5 + ((i + 1) / files.length) * 90)
      }
      const blob = pdf!.output('blob')
      setResult([{ name: 'images.pdf', blob }])
    } catch (e: any) { setErr(e.message || 'Failed to create PDF.') }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFiles([]) }} note={`${files.length} page(s) • ${fmtSize(result[0].blob.size)}`} /> : (
        <div className="space-y-5">
          <UploadZone accept="image/*" multiple onFiles={(f) => setFiles((p) => [...p, ...f])} label="Drop photos to combine into a PDF" sublabel="Add multiple images — reorder them below" />
          {files.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {files.map((f, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border bg-secondary/40 animate-pop">
                    <img src={URL.createObjectURL(f)} className="w-full h-28 object-cover" alt={f.name} />
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-black/60 text-white rounded-full w-5 h-5 grid place-items-center">{i + 1}</span>
                    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity py-1">
                      <button onClick={() => move(i, -1)} className="p-1 text-white" aria-label="Move up"><MoveUp className="w-4 h-4" /></button>
                      <button onClick={() => move(i, 1)} className="p-1 text-white" aria-label="Move down"><MoveDown className="w-4 h-4" /></button>
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="p-1 text-red-300" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div><label className="text-xs text-muted-foreground">Page size</label>
                  <select value={pageSize} onChange={(e) => setPageSize(e.target.value as any)} className="mt-1 w-full h-10 px-2 rounded-xl bg-secondary/70 outline-none"><option value="a4">A4</option><option value="fit">Fit to image</option></select></div>
                <div><label className="text-xs text-muted-foreground">Orientation</label>
                  <select value={orient} onChange={(e) => setOrient(e.target.value as any)} disabled={pageSize === 'fit'} className="mt-1 w-full h-10 px-2 rounded-xl bg-secondary/70 outline-none disabled:opacity-50"><option value="p">Portrait</option><option value="l">Landscape</option></select></div>
                <div><label className="text-xs text-muted-foreground">Margin: {margin} mm</label>
                  <input type="range" min={0} max={30} value={margin} onChange={(e) => setMargin(+e.target.value)} className="mt-3 w-full accent-indigo-500" /></div>
              </div>
              {busy && <ProgressBar value={prog} label="Building PDF…" />}
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Creating PDF…' : `🖼️ Create PDF from ${files.length} image${files.length > 1 ? 's' : ''}`}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Image Watermark ---------------- */
export function ImageWatermark() {
  const tool = T('image-watermark')
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('© MEGHRAJ')
  const [opacity, setOpacity] = useState(35)
  const [sizePct, setSizePct] = useState(6)
  const [pos, setPos] = useState<'tl' | 'tr' | 'c' | 'bl' | 'br' | 'tile'>('br')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const run = async () => {
    if (!file || !text.trim()) { setErr('Enter watermark text first.'); return }
    setBusy(true); setErr('')
    try {
      const img = await loadImage(file)
      const c = drawToCanvas(img, img.naturalWidth, img.naturalHeight)
      const ctx = c.getContext('2d')!
      const px = Math.max(12, (c.width * sizePct) / 100)
      ctx.font = `bold ${px}px Sora, sans-serif`
      ctx.fillStyle = `rgba(255,255,255,${opacity / 100})`
      ctx.strokeStyle = `rgba(0,0,0,${opacity / 200})`
      ctx.lineWidth = px / 14
      const m = px
      const draw = (x: number, y: number, align: CanvasTextAlign, bl: CanvasTextBaseline) => {
        ctx.textAlign = align; ctx.textBaseline = bl
        ctx.strokeText(text, x, y); ctx.fillText(text, x, y)
      }
      if (pos === 'tile') {
        ctx.save(); ctx.translate(c.width / 2, c.height / 2); ctx.rotate(-Math.PI / 6); ctx.translate(-c.width / 2, -c.height / 2)
        for (let y = -c.height; y < c.height * 2; y += px * 5) for (let x = -c.width; x < c.width * 2; x += ctx.measureText(text).width + px * 3) draw(x, y, 'left', 'alphabetic')
        ctx.restore()
      } else {
        const map = { tl: [m, m, 'left', 'top'], tr: [c.width - m, m, 'right', 'top'], c: [c.width / 2, c.height / 2, 'center', 'middle'], bl: [m, c.height - m, 'left', 'bottom'], br: [c.width - m, c.height - m, 'right', 'bottom'] } as const
        const [x, y, al, bl] = map[pos]
        draw(x, y, al as CanvasTextAlign, bl as CanvasTextBaseline)
      }
      const blob = await canvasToBlob(c, 'image/png')
      setResult([{ name: `${base(file.name)}-watermarked.png`, blob }])
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFile(null) }} /> : (
        <div className="space-y-5">
          {!file ? <UploadZone accept="image/*" onFiles={(f) => setFile(f[0])} label="Drop an image to watermark" /> : (
            <>
              <FileChip file={file} onRemove={() => setFile(null)} />
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Watermark text" className="w-full h-11 px-3 rounded-xl bg-secondary/70 outline-none focus:ring-2 ring-primary/40" />
              <div className="grid sm:grid-cols-3 gap-3">
                <div><label className="text-xs text-muted-foreground">Opacity: {opacity}%</label><input type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="mt-2 w-full accent-indigo-500" /></div>
                <div><label className="text-xs text-muted-foreground">Size: {sizePct}%</label><input type="range" min={2} max={20} value={sizePct} onChange={(e) => setSizePct(+e.target.value)} className="mt-2 w-full accent-indigo-500" /></div>
                <div><label className="text-xs text-muted-foreground">Position</label>
                  <select value={pos} onChange={(e) => setPos(e.target.value as any)} className="mt-1 w-full h-10 px-2 rounded-xl bg-secondary/70 outline-none">
                    <option value="tl">Top left</option><option value="tr">Top right</option><option value="c">Center</option><option value="bl">Bottom left</option><option value="br">Bottom right</option><option value="tile">Tiled</option>
                  </select></div>
              </div>
              <ActionButton onClick={run} disabled={busy}>{busy ? 'Applying…' : '💧 Apply Watermark'}</ActionButton>
            </>
          )}
          <ErrorBox msg={err} />
        </div>
      )}
    </ToolShell>
  )
}
