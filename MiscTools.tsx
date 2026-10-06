import { useState } from 'react'
import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import { UploadZone, FileChip, ProgressBar } from '@/components/UploadZone'
import { ToolShell, ResultPanel, ErrorBox, ActionButton, type ResultFile } from '@/components/ToolShell'
import { TOOLS, fmtSize, download } from '@/lib/tools'

const T = (id: string) => TOOLS.find((t) => t.id === id)!
const base = (n: string) => n.replace(/\.[^.]+$/, '')

/* ---------------- Create ZIP ---------------- */
export function ZipCreate() {
  const tool = T('zip-create')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false); const [prog, setProg] = useState(0)
  const [result, setResult] = useState<ResultFile[] | null>(null)
  const [stats, setStats] = useState('')

  const run = async () => {
    if (files.length === 0) return
    setBusy(true)
    const zip = new JSZip()
    files.forEach((f) => zip.file(f.name, f))
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, (m) => setProg(m.percent))
    const total = files.reduce((a, f) => a + f.size, 0)
    setStats(`${files.length} files • ${fmtSize(total)} → ${fmtSize(blob.size)}`)
    setResult([{ name: 'meghraj-archive.zip', blob }])
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => { setResult(null); setFiles([]) }} note={stats} /> : (
        <div className="space-y-5">
          <UploadZone multiple onFiles={(f) => setFiles((p) => [...p, ...f])} label="Drop files to pack into a ZIP" />
          {files.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((f, i) => <FileChip key={i} file={f} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />)}
            </div>
          )}
          {busy && <ProgressBar value={prog} label="Creating ZIP…" />}
          <ActionButton onClick={run} disabled={busy || files.length === 0}>{busy ? 'Packing…' : `📦 Create ZIP (${files.length} files)`}</ActionButton>
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Unzip ---------------- */
interface ZipEntry { name: string; size: number; blob: () => Promise<Blob>; dir: boolean }

export function ZipExtract() {
  const tool = T('zip-extract')
  const [file, setFile] = useState<File | null>(null)
  const [entries, setEntries] = useState<ZipEntry[]>([])
  const [preview, setPreview] = useState<{ name: string; url: string; kind: string } | null>(null)
  const [err, setErr] = useState('')

  const pick = async (f: File) => {
    setErr('')
    try {
      const zip = await JSZip.loadAsync(f)
      const list: ZipEntry[] = []
      zip.forEach((_, e) => list.push({ name: e.name, size: (e as any)._data?.uncompressedSize ?? 0, dir: e.dir, blob: () => e.async('blob') }))
      setEntries(list); setFile(f)
    } catch { setErr('Could not open this archive — is it a valid .zip file?') }
  }

  const showPreview = async (e: ZipEntry) => {
    const b = await e.blob()
    const kind = /\.(png|jpe?g|webp|gif|svg)$/i.test(e.name) ? 'image' : /\.(txt|md|json|csv|log)$/i.test(e.name) ? 'text' : ''
    if (kind === 'text') { const t = await b.text(); setPreview({ name: e.name, url: t.slice(0, 5000), kind }) }
    else if (kind === 'image') setPreview({ name: e.name, url: URL.createObjectURL(b), kind })
  }

  const total = entries.filter((e) => !e.dir).reduce((a, e) => a + e.size, 0)

  return (
    <ToolShell tool={tool}>
      {!file ? (
        <div><UploadZone accept=".zip,application/zip" onFiles={(f) => pick(f[0])} label="Drop a ZIP to browse & extract" /><ErrorBox msg={err} /></div>
      ) : (
        <div className="space-y-4 animate-pop">
          <FileChip file={file} onRemove={() => { setFile(null); setEntries([]); setPreview(null) }} />
          <p className="text-sm text-muted-foreground">{entries.filter((e) => !e.dir).length} files • total uncompressed {fmtSize(total)}</p>
          <div className="rounded-2xl border divide-y max-h-80 overflow-y-auto">
            {entries.filter((e) => !e.dir).map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent/50">
                <span>📄</span>
                <span className="flex-1 truncate font-mono text-xs sm:text-sm">{e.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{fmtSize(e.size)}</span>
                {/\.(png|jpe?g|webp|gif|svg|txt|md|json|csv|log)$/i.test(e.name) && (
                  <button onClick={() => showPreview(e)} className="text-xs text-primary hover:underline shrink-0">Preview</button>
                )}
                <button onClick={async () => download(await e.blob(), e.name.split('/').pop() || e.name)} className="text-xs text-primary hover:underline shrink-0">Save</button>
              </div>
            ))}
          </div>
          {preview && (
            <div className="fixed inset-0 z-[80] bg-black/70 grid place-items-center p-4" onClick={() => setPreview(null)}>
              <div className="glass rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-3"><p className="font-medium text-sm truncate">{preview.name}</p><button onClick={() => setPreview(null)} className="text-xl px-2">✕</button></div>
                {preview.kind === 'image' ? <img src={preview.url} className="max-w-full rounded-xl" alt={preview.name} /> : <pre className="text-xs whitespace-pre-wrap font-mono">{preview.url}</pre>}
              </div>
            </div>
          )}
          <ActionButton onClick={async () => {
            for (const e of entries.filter((x) => !x.dir)) download(await e.blob(), e.name.split('/').pop() || e.name)
          }}>📂 Extract All ({entries.filter((e) => !e.dir).length} files)</ActionButton>
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Text → ZIP ---------------- */
export function TextToZip() {
  const tool = T('text-to-zip')
  const [text, setText] = useState('')
  const [name, setName] = useState('notes.txt')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const run = async () => {
    setBusy(true)
    const zip = new JSZip()
    zip.file(name.trim() || 'notes.txt', text)
    const blob = await zip.generateAsync({ type: 'blob' })
    setResult([{ name: `${base(name) || 'notes'}.zip`, blob }])
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => setResult(null)} /> : (
        <div className="space-y-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="filename.txt" className="w-full h-11 px-3 rounded-xl bg-secondary/70 outline-none focus:ring-2 ring-primary/40 font-mono text-sm" />
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Type or paste your text here…" className="w-full rounded-2xl bg-secondary/70 p-4 outline-none focus:ring-2 ring-primary/40 text-sm" />
          <ActionButton onClick={run} disabled={busy || !text.trim()}>📝 Create TXT → ZIP</ActionButton>
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- TXT Viewer ---------------- */
export function TxtViewer() {
  const tool = T('txt-viewer')
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')

  const pick = async (f: File) => {
    try { setText(await f.text()); setFile(f) } catch { setErr('Could not read this file as text.') }
  }
  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <ToolShell tool={tool}>
      {file ? (
        <div className="animate-pop space-y-4">
          <FileChip file={file} onRemove={() => { setFile(null); setText('') }} />
          <p className="text-xs text-muted-foreground">{text.length} characters • {words} words • {text.split('\n').length} lines</p>
          <pre className="w-full h-80 overflow-auto rounded-2xl bg-secondary/50 p-4 text-sm font-mono whitespace-pre-wrap">{text || '(empty file)'}</pre>
          <ActionButton onClick={() => download(new Blob([text], { type: 'text/plain' }), file.name)}>⬇️ Download</ActionButton>
        </div>
      ) : (
        <div><UploadZone accept=".txt,.md,.csv,.json,.log,text/plain" onFiles={(f) => pick(f[0])} label="Drop a text file to view" /><ErrorBox msg={err} /></div>
      )}
    </ToolShell>
  )
}

/* ---------------- Text → PDF ---------------- */
export function TxtToPdf() {
  const tool = T('txt-to-pdf')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('document.pdf')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ResultFile[] | null>(null)

  const run = () => {
    setBusy(true)
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11)
    const lines = pdf.splitTextToSize(text, 180)
    let y = 18
    lines.forEach((line: string) => {
      if (y > 282) { pdf.addPage(); y = 18 }
      pdf.text(line, 15, y); y += 6
    })
    setResult([{ name: fileName.trim().endsWith('.pdf') ? fileName.trim() : `${fileName.trim() || 'document'}.pdf`, blob: pdf.output('blob') }])
    setBusy(false)
  }

  return (
    <ToolShell tool={tool}>
      {result ? <ResultPanel files={result} onReset={() => setResult(null)} /> : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="document.pdf" className="flex-1 h-11 px-3 rounded-xl bg-secondary/70 outline-none font-mono text-sm" />
            <label className="h-11 px-4 rounded-xl bg-secondary/70 grid place-items-center text-sm cursor-pointer hover:bg-accent">
              Load .txt
              <input type="file" accept=".txt,text/plain" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()) }} />
            </label>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder="Type or paste text…" className="w-full rounded-2xl bg-secondary/70 p-4 outline-none focus:ring-2 ring-primary/40 text-sm" />
          <ActionButton onClick={run} disabled={busy || !text.trim()}>📄 Create PDF</ActionButton>
        </div>
      )}
    </ToolShell>
  )
}

/* ---------------- Base64 ---------------- */
export function Base64Tool() {
  const tool = T('base64')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [err, setErr] = useState('')

  const enc = () => { setErr(''); try { setOutput(btoa(unescape(encodeURIComponent(input)))) } catch { setErr('Could not encode this input.') } }
  const dec = () => { setErr(''); try { setOutput(decodeURIComponent(escape(atob(input.trim())))) } catch { setErr('Invalid Base64 input.') } }

  return (
    <ToolShell tool={tool}>
      <div className="space-y-4">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={6} placeholder="Enter text or Base64…" className="w-full rounded-2xl bg-secondary/70 p-4 outline-none focus:ring-2 ring-primary/40 font-mono text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <ActionButton onClick={enc}>→ Encode</ActionButton>
          <button onClick={dec} className="py-3.5 rounded-2xl border font-display font-semibold hover:bg-accent transition-colors">← Decode</button>
        </div>
        <ErrorBox msg={err} />
        {output && (
          <div className="animate-pop">
            <textarea readOnly value={output} rows={6} className="w-full rounded-2xl bg-secondary/50 p-4 font-mono text-sm outline-none" />
            <button onClick={() => navigator.clipboard.writeText(output)} className="mt-2 w-full py-3 rounded-xl bg-secondary/70 hover:bg-accent text-sm font-medium">📋 Copy to clipboard</button>
          </div>
        )}
      </div>
    </ToolShell>
  )
}

/* ---------------- Calculator ---------------- */
export function Calculator() {
  const tool = T('calculator')
  const [expr, setExpr] = useState('')
  const [ans, setAns] = useState('')
  const [err, setErr] = useState('')

  const calc = (s: string) => {
    try {
      if (!/^[-+*/().%\d\s^]*$/.test(s)) throw new Error('bad')
      const fn = new Function(`return (${s.replace(/\^/g, '**').replace(/%/g, '/100')})`)
      const v = fn()
      if (typeof v !== 'number' || !isFinite(v)) throw new Error('bad')
      setErr(''); return String(Math.round(v * 1e10) / 1e10)
    } catch { setErr('Invalid expression'); return '' }
  }

  const keys = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '(', ')', '+', '^', 'C', '⌫', '=']
  return (
    <ToolShell tool={tool}>
      <div className="max-w-sm mx-auto space-y-4">
        <div className="rounded-2xl bg-secondary/70 p-5 text-right">
          <p className="text-sm text-muted-foreground min-h-5 break-all">{expr || '0'}</p>
          <p className="font-display text-3xl font-bold break-all">{ans}</p>
        </div>
        <ErrorBox msg={err} />
        <div className="grid grid-cols-4 gap-2">
          {keys.map((k) => (
            <button key={k} onClick={() => {
              if (k === 'C') { setExpr(''); setAns(''); setErr('') }
              else if (k === '⌫') setExpr(expr.slice(0, -1))
              else if (k === '=') { const r = calc(expr); if (r) { setAns(r); setExpr(r) } }
              else { setExpr(expr + k); const r = calc(expr + k); if (r) setAns(r) }
            }}
              className={`py-4 rounded-2xl font-display font-semibold text-lg transition-all active:scale-95 ${k === '=' ? 'col-span-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white' : k === 'C' || k === '⌫' ? 'bg-destructive/10 text-destructive' : 'bg-secondary/70 hover:bg-accent'}`}>
              {k}
            </button>
          ))}
        </div>
      </div>
    </ToolShell>
  )
}

/* ---------------- Text counter ---------------- */
export function TextCounter() {
  const tool = T('text-counter')
  const [text, setText] = useState('')
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const sentences = (text.match(/[.!?…]+(\s|$)/g) || []).length
  const stats: [string, string | number][] = [
    ['Characters', text.length], ['Characters (no spaces)', text.replace(/\s/g, '').length],
    ['Words', words], ['Sentences', sentences], ['Lines', text ? text.split('\n').length : 0],
    ['Reading time', words ? `~${Math.max(1, Math.round(words / 200))} min` : '0 min'],
  ]
  return (
    <ToolShell tool={tool}>
      <div className="space-y-4">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Start typing or paste your text…" className="w-full rounded-2xl bg-secondary/70 p-4 outline-none focus:ring-2 ring-primary/40" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stats.map(([k, v]) => (
            <div key={k} className="glass rounded-2xl p-4 text-center">
              <p className="font-display text-2xl font-bold text-gradient">{v}</p>
              <p className="text-xs text-muted-foreground mt-1">{k}</p>
            </div>
          ))}
        </div>
      </div>
    </ToolShell>
  )
}

/* ---------------- File size checker ---------------- */
export function FileSizeChecker() {
  const tool = T('file-size-checker')
  const [infos, setInfos] = useState<{ name: string; size: number; type: string; mod: string }[]>([])
  return (
    <ToolShell tool={tool}>
      <div className="space-y-5">
        <UploadZone multiple onFiles={(fs) => setInfos((p) => [...p, ...fs.map((f) => ({ name: f.name, size: f.size, type: f.type || 'unknown', mod: new Date(f.lastModified).toLocaleString() }))])} label="Drop any files to check size & type" />
        {infos.length > 0 && (
          <div className="rounded-2xl border divide-y animate-pop">
            {infos.map((f, i) => (
              <div key={i} className="flex flex-wrap gap-x-6 gap-y-1 px-4 py-3 text-sm">
                <span className="font-medium truncate flex-1 min-w-40">{f.name}</span>
                <span className="text-primary font-bold">{fmtSize(f.size)}</span>
                <span className="text-muted-foreground text-xs">{f.size.toLocaleString()} bytes • {f.type} • {f.mod}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolShell>
  )
}
