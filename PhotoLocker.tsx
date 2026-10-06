import { useCallback, useEffect, useState } from 'react'
import {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User,
} from 'firebase/auth'
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp,
  startAfter, writeBatch, type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '@/lib/firebase'
import { ToolShell, ErrorBox } from '@/components/ToolShell'
import { UploadZone, ProgressBar } from '@/components/UploadZone'
import { TOOLS, fmtSize, download } from '@/lib/tools'
import { loadImage, compressToTarget, drawToCanvas, canvasToBlob } from '@/lib/imaging'

const tool = TOOLS.find((t) => t.id === 'photo-locker')!

/** Firestore doc limit = 1 MiB. Base64 adds ~33%, so keep each stored photo under ~650 KB. */
const MAX_PHOTO_BYTES = 650 * 1024
const THUMB_SIDE = 320
const PAGE = 48

interface Thumb { id: string; name: string; size: number; thumb: string }

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = () => rej(new Error('Could not read the image.'))
    r.readAsDataURL(b)
  })
}

function friendlyError(e: any): string {
  const code = e?.code || ''
  if (code === 'auth/popup-blocked') return 'Popup blocked by your browser. Allow popups for this site and try again.'
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return ''
  if (code === 'auth/unauthorized-domain') return 'This website address is not added in Firebase → Authentication → Authorized domains.'
  if (code === 'permission-denied') return 'Permission denied. Check that firestore.rules is published in Firebase.'
  if (code === 'unavailable') return 'No internet connection. Please try again.'
  return e?.message || 'Something went wrong. Please try again.'
}

export function PhotoLocker() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!isFirebaseConfigured)
  const [items, setItems] = useState<Thumb[]>([])
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [prog, setProg] = useState(0)
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState<{ id: string; name: string; url: string } | null>(null)
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (u) => { setUser(u); setReady(true) })
  }, [])

  const load = useCallback(async (uid: string, after: QueryDocumentSnapshot<DocumentData> | null) => {
    if (!db) return
    setLoading(true); setErr('')
    try {
      const base = collection(db, 'users', uid, 'thumbs')
      const q = after
        ? query(base, orderBy('createdAt', 'desc'), startAfter(after), limit(PAGE))
        : query(base, orderBy('createdAt', 'desc'), limit(PAGE))
      const snap = await getDocs(q)
      const next: Thumb[] = snap.docs.map((d) => {
        const v = d.data()
        return { id: d.id, name: v.name, size: v.size, thumb: v.thumb }
      })
      setItems((prev) => (after ? [...prev, ...next] : next))
      setCursor(snap.docs.length ? snap.docs[snap.docs.length - 1] : after)
      setHasMore(snap.docs.length === PAGE)
    } catch (e: any) { setErr(friendlyError(e)) }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user) load(user.uid, null)
    else { setItems([]); setCursor(null); setHasMore(false) }
  }, [user, load])

  const login = async () => {
    if (!auth) return
    setErr('')
    try { await signInWithPopup(auth, new GoogleAuthProvider()) }
    catch (e: any) { setErr(friendlyError(e)) }
  }

  const upload = async (files: File[]) => {
    if (!user || !db) return
    setErr(''); setProg(1)
    let done = 0
    const failed: string[] = []
    for (const file of files) {
      setStatus(`Saving ${done + 1}/${files.length}: ${file.name}`)
      try {
        if (!file.type.startsWith('image/')) throw new Error('not an image')
        const img = await loadImage(file)
        const full = await compressToTarget(img, MAX_PHOTO_BYTES, 'image/jpeg')
        const scale = Math.min(1, THUMB_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
        const tcanvas = drawToCanvas(img, img.naturalWidth * scale, img.naturalHeight * scale)
        const thumb = await canvasToBlob(tcanvas, 'image/jpeg', 0.7)
        const [fullUrl, thumbUrl] = await Promise.all([blobToDataUrl(full), blobToDataUrl(thumb)])
        const id = doc(collection(db, 'users', user.uid, 'photos')).id
        const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
        const batch = writeBatch(db)
        batch.set(doc(db, 'users', user.uid, 'photos', id), { name, size: full.size, data: fullUrl, createdAt: serverTimestamp() })
        batch.set(doc(db, 'users', user.uid, 'thumbs', id), { name, size: full.size, thumb: thumbUrl, createdAt: serverTimestamp() })
        await batch.commit()
      } catch (e: any) {
        if (e?.code === 'permission-denied') { setErr(friendlyError(e)); break }
        failed.push(file.name)
      }
      done++
      setProg((done / files.length) * 100)
    }
    setProg(0); setStatus('')
    if (failed.length) setErr(`Could not save: ${failed.join(', ')}`)
    await load(user.uid, null)
  }

  const view = async (t: Thumb) => {
    if (!user || !db) return
    setOpening(true); setErr('')
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'photos', t.id))
      if (!snap.exists()) throw new Error('Photo not found.')
      setOpen({ id: t.id, name: t.name, url: snap.data().data })
    } catch (e: any) { setErr(friendlyError(e)) }
    setOpening(false)
  }

  const remove = async (id: string) => {
    if (!user || !db) return
    if (!window.confirm('Delete this photo permanently?')) return
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'users', user.uid, 'photos', id))
      batch.delete(doc(db, 'users', user.uid, 'thumbs', id))
      await batch.commit()
      setItems((prev) => prev.filter((x) => x.id !== id))
      setOpen(null)
    } catch (e: any) { setErr(friendlyError(e)) }
  }

  const save = async () => {
    if (!open) return
    const blob = await (await fetch(open.url)).blob()
    download(blob, open.name)
  }

  /* ---------- not configured ---------- */
  if (!isFirebaseConfigured) {
    return (
      <ToolShell tool={tool}>
        <div className="text-center py-6 space-y-3">
          <p className="text-4xl">🛠️</p>
          <p className="font-display font-semibold text-lg">Photo Locker is not set up yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Paste your Firebase config in <code className="font-mono">src/lib/firebase.ts</code> and publish <code className="font-mono">firestore.rules</code>.
            Full steps are in <code className="font-mono">SETUP_PHOTO_LOCKER.md</code>.
          </p>
        </div>
      </ToolShell>
    )
  }

  if (!ready) {
    return <ToolShell tool={tool}><div className="py-10 text-center"><div className="w-10 h-10 mx-auto rounded-full border-4 border-primary/30 border-t-primary animate-spin" /></div></ToolShell>
  }

  /* ---------- signed out ---------- */
  if (!user) {
    return (
      <ToolShell tool={tool}>
        <div className="text-center py-8 space-y-5">
          <p className="text-5xl">🔐</p>
          <div>
            <p className="font-display font-semibold text-xl">Your private photo locker</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Sign in with Google to save photos to the cloud. Open it from any phone or computer with the same account — only you can see your photos.</p>
          </div>
          <button onClick={login} className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white text-slate-800 font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all">
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
            Continue with Google
          </button>
          <ErrorBox msg={err} />
        </div>
      </ToolShell>
    )
  }

  /* ---------- signed in ---------- */
  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3">
          {user.photoURL
            ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full" />
            : <span className="w-10 h-10 rounded-full bg-primary/20 grid place-items-center">👤</span>}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user.displayName || 'Signed in'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <button onClick={() => auth && signOut(auth)} className="px-3.5 py-2 rounded-xl border border-border hover:bg-accent text-sm font-medium">Sign out</button>
        </div>

        <UploadZone accept="image/*" multiple maxSizeMB={25} onFiles={upload}
          label="Add photos to your locker"
          sublabel="Photos are saved as JPG (up to ~650 KB each) in your private cloud space" />
        {prog > 0 && <ProgressBar value={prog} label={status} />}
        <ErrorBox msg={err} />

        <div>
          <p className="font-display font-semibold mb-3">Your photos {items.length > 0 && <span className="text-muted-foreground font-normal text-sm">({items.length}{hasMore ? '+' : ''})</span>}</p>
          {items.length === 0 && !loading && <p className="text-sm text-muted-foreground text-center py-8">No photos yet. Add your first photo above.</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((t) => (
              <button key={t.id} onClick={() => view(t)} className="group relative aspect-square overflow-hidden rounded-2xl glass hover:shadow-xl transition-all">
                <img src={t.thumb} alt={t.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[11px] px-2 py-1 truncate">{fmtSize(t.size)}</span>
              </button>
            ))}
          </div>
          {loading && <div className="py-6 text-center"><div className="w-8 h-8 mx-auto rounded-full border-4 border-primary/30 border-t-primary animate-spin" /></div>}
          {hasMore && !loading && (
            <button onClick={() => user && load(user.uid, cursor)} className="mt-4 w-full py-3 rounded-xl border border-border hover:bg-accent text-sm font-medium">Load more</button>
          )}
        </div>
      </div>

      {(open || opening) && (
        <div className="fixed inset-0 z-[100] bg-black/85 grid place-items-center p-4" onClick={() => !opening && setOpen(null)}>
          {opening || !open ? (
            <div className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
          ) : (
            <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
              <img src={open.url} alt={open.name} className="max-h-[70vh] w-auto mx-auto rounded-2xl" />
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <button onClick={save} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">⬇️ Download</button>
                <button onClick={() => remove(open.id)} className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">🗑️ Delete</button>
                <button onClick={() => setOpen(null)} className="px-4 py-2.5 rounded-xl bg-white/15 text-white text-sm font-medium">Close</button>
              </div>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  )
}
