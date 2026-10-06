import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { CATEGORIES, TOOLS, type ToolDef } from '@/lib/tools'
import { Search, Zap, ShieldCheck, Smartphone, Lock } from 'lucide-react'
import { useReveal } from '@/hooks/useSmoothScroll'

function TiltCard({ tool, i }: { tool: ToolDef; i: number }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -10
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 12
    el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`
  }
  const onLeave = () => { if (ref.current) ref.current.style.transform = '' }
  return (
    <Link ref={ref} to={`/tool/${tool.id}`} onMouseMove={onMove} onMouseLeave={onLeave}
      className="tilt-card glass rounded-2xl p-5 block shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 reveal"
      style={{ transitionDelay: `${(i % 8) * 40}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-3xl">{tool.icon}</span>
        {tool.popular && <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-500">Popular</span>}
      </div>
      <p className="font-display font-semibold mt-3">{tool.name}</p>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{tool.desc}</p>
    </Link>
  )
}

export default function Home() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  useReveal()

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return null
    return TOOLS.filter((t) => t.name.toLowerCase().includes(s) || t.desc.toLowerCase().includes(s))
  }, [q])

  const popular = TOOLS.filter((t) => t.popular)
  const catEmoji: Record<string, string> = { Image: '🖼️', PDF: '📕', ZIP: '📦', File: '📁', Document: '📄', Utility: '🧰' }

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium mb-6 animate-pop">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {TOOLS.length} free tools • No sign-up needed • Private by design
          </div>
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] animate-pop">
            MEGHRAJ — All Your <span className="text-gradient">File Tools.</span><br className="hidden sm:block" /> In One Place.
          </h1>
          <p className="mt-5 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto animate-pop" style={{ animationDelay: '80ms' }}>
            Compress, convert, edit, resize, merge and manage your files, images and PDFs quickly and easily.
          </p>
          <div className="mt-9 max-w-xl mx-auto relative animate-pop" style={{ animationDelay: '160ms' }}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What do you want to do? e.g. compress image"
              className="w-full h-14 pl-12 pr-4 rounded-2xl glass shadow-2xl shadow-indigo-500/10 outline-none focus:ring-2 ring-primary/40 text-base" />
            {results && (
              <div className="absolute top-16 left-0 right-0 glass rounded-2xl shadow-2xl overflow-hidden z-20 text-left max-h-80 overflow-y-auto">
                {results.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">No tools found for “{q}”.</p>}
                {results.map((t) => (
                  <button key={t.id} onClick={() => navigate(`/tool/${t.id}`)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-accent transition-colors text-left">
                    <span className="text-xl">{t.icon}</span>
                    <div className="min-w-0"><p className="text-sm font-medium">{t.name}</p><p className="text-xs text-muted-foreground truncate">{t.desc}</p></div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-2 animate-pop" style={{ animationDelay: '240ms' }}>
            {popular.slice(0, 5).map((t) => (
              <Link key={t.id} to={`/tool/${t.id}`} className="glass rounded-full px-4 py-2 text-sm font-medium hover:scale-105 hover:shadow-lg transition-all">
                {t.icon} {t.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-4 -mt-4 mb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Lock className="w-5 h-5" />, t: '100% Private', d: 'Files never leave your device' },
            { icon: <Zap className="w-5 h-5" />, t: 'Blazing Fast', d: 'Local processing, no waiting' },
            { icon: <ShieldCheck className="w-5 h-5" />, t: 'Free Forever', d: 'No sign-up, no watermarks' },
            { icon: <Smartphone className="w-5 h-5" />, t: 'Mobile First', d: 'Feels like a native app' },
          ].map((f, i) => (
            <div key={i} className="glass rounded-2xl p-5 reveal" style={{ transitionDelay: `${i * 60}ms` }}>
              <span className="inline-grid place-items-center w-10 h-10 rounded-xl bg-primary/10 text-primary mb-3">{f.icon}</span>
              <p className="font-display font-semibold text-sm">{f.t}</p>
              <p className="text-xs text-muted-foreground mt-1">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* POPULAR */}
      <section className="max-w-7xl mx-auto px-4 mb-20">
        <div className="flex items-end justify-between mb-6 reveal">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Most used</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Popular Tools</h2>
          </div>
          <Link to="/tools" className="text-sm font-medium text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {popular.map((t, i) => <TiltCard key={t.id} tool={t} i={i} />)}
        </div>
      </section>

      {/* CATEGORIES */}
      {CATEGORIES.map((cat) => {
        const list = TOOLS.filter((t) => t.category === cat)
        if (list.length === 0) return null
        return (
          <section key={cat} className="max-w-7xl mx-auto px-4 mb-20">
            <div className="flex items-end justify-between mb-6 reveal">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">{catEmoji[cat]} Category</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold">{cat} Tools</h2>
              </div>
              <Link to={`/c/${cat}`} className="text-sm font-medium text-primary hover:underline">View all →</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {list.slice(0, 8).map((t, i) => <TiltCard key={t.id} tool={t} i={i} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}
