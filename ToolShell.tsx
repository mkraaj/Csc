import { useEffect } from 'react'
import { Link } from 'react-router'
import { TOOLS, type ToolDef } from '@/lib/tools'
import { ArrowLeft, Download, RotateCcw, ShieldCheck } from 'lucide-react'
import { download } from '@/lib/tools'

export function ToolShell({ tool, children }: { tool: ToolDef; children: React.ReactNode }) {
  useEffect(() => {
    document.title = `${tool.name} — MEGHRAJ`
    return () => { document.title = 'MEGHRAJ — All Your File Tools. In One Place.' }
  }, [tool.id])
  const related = TOOLS.filter((t) => t.category === tool.category && t.id !== tool.id).slice(0, 4)
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <Link to={`/c/${tool.category}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> {tool.category} Tools
      </Link>
      <div className="flex items-start gap-4 mb-8 animate-pop">
        <span className="text-4xl sm:text-5xl w-16 h-16 sm:w-20 sm:h-20 grid place-items-center rounded-2xl glass shadow-lg">{tool.icon}</span>
        <div>
          <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">{tool.name}</h1>
          <p className="text-muted-foreground mt-1.5 max-w-2xl">{tool.desc}</p>
          <p className="inline-flex items-center gap-1.5 text-xs text-emerald-500 mt-2"><ShieldCheck className="w-3.5 h-3.5" /> {tool.id === 'photo-locker' ? 'Saved to your private cloud space — only you can see your photos' : '100% private — processed on your device, never uploaded'}</p>
        </div>
      </div>
      <div className="glass rounded-3xl p-5 sm:p-8 shadow-xl">{children}</div>
      {related.length > 0 && (
        <div className="mt-12">
          <p className="font-display font-semibold mb-4">Related tools</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {related.map((t) => (
              <Link key={t.id} to={`/tool/${t.id}`} className="glass rounded-2xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <span className="text-2xl">{t.icon}</span>
                <p className="text-sm font-medium mt-2">{t.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export interface ResultFile { name: string; blob: Blob }

export function ResultPanel({ files, onReset, note }: { files: ResultFile[]; onReset: () => void; note?: string }) {
  return (
    <div className="animate-pop">
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-center mb-5">
        <p className="text-3xl mb-1">✅</p>
        <p className="font-display font-semibold text-emerald-500">Done! Your file{files.length > 1 ? 's are' : ' is'} ready.</p>
        {note && <p className="text-sm text-muted-foreground mt-1">{note}</p>}
      </div>
      <div className="space-y-2.5 mb-5">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
            <span className="text-lg">📦</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{f.name}</p>
              <p className="text-xs text-muted-foreground">{(f.blob.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={() => download(f.blob, f.name)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-95 transition-all">
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
        ))}
      </div>
      <button onClick={onReset} className="w-full py-3 rounded-xl border border-border hover:bg-accent font-medium text-sm inline-flex items-center justify-center gap-2 transition-colors">
        <RotateCcw className="w-4 h-4" /> Process another file
      </button>
    </div>
  )
}

export function ErrorBox({ msg }: { msg: string }) {
  if (!msg) return null
  return <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3 animate-pop">⚠️ {msg}</div>
}

export function ActionButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-display font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all">
      {children}
    </button>
  )
}
