import { useCallback, useRef, useState } from 'react'
import { fmtSize } from '@/lib/tools'
import { X, UploadCloud } from 'lucide-react'

export interface PickedFile { file: File; id: string }

interface Props {
  accept?: string
  multiple?: boolean
  maxSizeMB?: number
  onFiles: (files: File[]) => void
  label?: string
  sublabel?: string
}

export function UploadZone({ accept, multiple, maxSizeMB = 200, onFiles, label, sublabel }: Props) {
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handle = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return
    setError('')
    const files = Array.from(list)
    const tooBig = files.find((f) => f.size > maxSizeMB * 1024 * 1024)
    if (tooBig) { setError(`"${tooBig.name}" is too large (${fmtSize(tooBig.size)}). Limit: ${maxSizeMB} MB.`); return }
    onFiles(multiple ? files : [files[0]])
  }, [maxSizeMB, multiple, onFiles])

  return (
    <div>
      <div
        role="button" tabIndex={0} aria-label="Upload files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files) }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 glass
          ${drag ? 'border-primary scale-[1.01] shadow-xl shadow-primary/20 bg-primary/5' : 'border-border hover:border-primary/60 hover:shadow-lg'}`}
      >
        <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 grid place-items-center text-white shadow-lg shadow-indigo-500/30 ${drag ? 'animate-float' : ''}`}>
          <UploadCloud className="w-8 h-8" />
        </div>
        <p className="font-display font-semibold text-lg">{label || 'Drop files here or tap to browse'}</p>
        <p className="text-sm text-muted-foreground mt-1">{sublabel || `Up to ${maxSizeMB} MB per file • processed privately in your browser`}</p>
        <input ref={inputRef} type="file" className="hidden" accept={accept} multiple={multiple}
          onChange={(e) => { handle(e.target.files); e.target.value = '' }} />
      </div>
      {error && <p className="mt-3 text-sm text-red-500 animate-pop">{error}</p>}
    </div>
  )
}

export function FileChip({ file, onRemove }: { file: File; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-3 glass rounded-xl px-4 py-2.5 animate-pop">
      <span className="text-lg">📄</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{fmtSize(file.size)}</p>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" aria-label="Remove file">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="w-full">
      {label && <p className="text-xs text-muted-foreground mb-1.5">{label}</p>}
      <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  )
}
