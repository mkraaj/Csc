import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { TOOLS } from '@/lib/tools'
import { Moon, Sun, Search, Menu, X } from 'lucide-react'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 grid place-items-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
        <svg width="20" height="20" viewBox="0 0 64 64" fill="none"><path d="M14 44V20l10 14 8-11 8 11 10-14v24" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
      <span className="font-display font-extrabold text-xl tracking-tight">MEGH<span className="text-gradient">RAJ</span></span>
    </Link>
  )
}

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/c/Image', label: 'Image Tools' },
  { to: '/c/PDF', label: 'PDF Tools' },
  { to: '/c/File', label: 'File Tools' },
  { to: '/c/ZIP', label: 'ZIP Tools' },
  { to: '/c/Document', label: 'Document Tools' },
  { to: '/tools', label: 'All Tools' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('meghraj-theme') !== 'light')
  const [menu, setMenu] = useState(false)
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const [progress, setProgress] = useState(0)
  const navigate = useNavigate()
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('meghraj-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const onScroll = () => {
      const d = document.documentElement
      setProgress(d.scrollTop / Math.max(1, d.scrollHeight - d.clientHeight))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (!searchRef.current?.contains(e.target as Node)) setFocus(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return TOOLS.filter((t) => t.name.toLowerCase().includes(s) || t.desc.toLowerCase().includes(s)).slice(0, 8)
  }, [q])

  return (
    <div className="min-h-screen aurora grid-bg flex flex-col">
      {/* scroll progress */}
      <div className="fixed top-0 left-0 h-[3px] z-[70] bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-400 transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />

      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">
          <Logo />
          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'}
                className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex-1" />
          <div ref={searchRef} className="relative hidden sm:block w-56 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={q} onFocus={() => setFocus(true)} onChange={(e) => setQ(e.target.value)}
              placeholder="Search tools…" aria-label="Search tools"
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-secondary/70 border border-transparent focus:border-primary/50 focus:bg-background outline-none text-sm transition-all" />
            {focus && results.length > 0 && (
              <div className="absolute top-11 left-0 right-0 glass rounded-xl shadow-2xl overflow-hidden animate-pop">
                {results.map((t) => (
                  <button key={t.id} onClick={() => { navigate(`/tool/${t.id}`); setQ(''); setFocus(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors">
                    <span className="text-lg">{t.icon}</span>
                    <div className="min-w-0"><p className="text-sm font-medium truncate">{t.name}</p><p className="text-xs text-muted-foreground truncate">{t.category}</p></div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setDark(!dark)} className="p-2 rounded-xl hover:bg-accent transition-colors" aria-label="Toggle theme">
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setMenu(!menu)} className="lg:hidden p-2 rounded-xl hover:bg-accent" aria-label="Menu">
            {menu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menu && (
          <div className="lg:hidden border-t px-4 py-3 space-y-1 glass animate-pop">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools…"
              className="w-full h-10 px-3 mb-2 rounded-xl bg-secondary/70 outline-none text-sm sm:hidden" />
            {(q ? results : []).map((t) => (
              <button key={t.id} onClick={() => { navigate(`/tool/${t.id}`); setQ(''); setMenu(false) }} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm sm:hidden">{t.icon} {t.name}</button>
            ))}
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setMenu(false)}
                className={({ isActive }) => `block px-3 py-2.5 rounded-xl text-sm font-medium ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}>
                {n.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t mt-20 glass">
        <div className="max-w-7xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-4">
          <div>
            <Logo />
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">All your file tools in one place. Tools run locally in your browser — your files never leave your device (except the optional Photo Locker).</p>
          </div>
          <div>
            <p className="font-display font-semibold mb-3">Popular Tools</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {TOOLS.filter((t) => t.popular).slice(0, 6).map((t) => (
                <li key={t.id}><Link className="hover:text-primary transition-colors" to={`/tool/${t.id}`}>{t.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-display font-semibold mb-3">Explore</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/tools" className="hover:text-primary">All Tools A–Z</Link></li>
              <li><Link to="/c/Image" className="hover:text-primary">Image Tools</Link></li>
              <li><Link to="/c/PDF" className="hover:text-primary">PDF Tools</Link></li>
              <li><Link to="/c/ZIP" className="hover:text-primary">ZIP Tools</Link></li>
              <li><Link to="/formats" className="hover:text-primary">Supported Formats</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-display font-semibold mb-3">Company</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-primary">About</Link></li>
              <li><Link to="/privacy" className="hover:text-primary">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-primary">Terms</Link></li>
              <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} MEGHRAJ — Crafted with privacy in mind. Files processed 100% in-browser.</div>
      </footer>
    </div>
  )
}
