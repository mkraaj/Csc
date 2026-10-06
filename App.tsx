import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useParams, Link, useLocation } from 'react-router'
import Layout from '@/components/Layout'
import Bird from '@/components/Bird'
import Home from '@/pages/Home'
import { TOOLS, CATEGORIES, toolsByCategory } from '@/lib/tools'
import { useSmoothScroll, useReveal } from '@/hooks/useSmoothScroll'
import { Toaster } from '@/components/ui/sonner'
// Lazy-loaded tool modules (code splitting — fast first paint)
const L = (loader: () => Promise<any>, name: string) => lazy(() => loader().then((m) => ({ default: m[name] }))) as React.ComponentType<any>
const imgL = () => import('@/pages/tools/ImageTools')
const pdfL = () => import('@/pages/tools/PdfTools')
const edL = () => import('@/pages/tools/PdfEditor')
const miscL = () => import('@/pages/tools/MiscTools')
const ImageCompressor = L(imgL, 'ImageCompressor'), ImageCrop = L(imgL, 'ImageCrop'), ImageConverter = L(imgL, 'ImageConverter')
const ImageRotateFlip = L(imgL, 'ImageRotateFlip'), ImageMetadata = L(imgL, 'ImageMetadata'), FileRename = L(imgL, 'FileRename')
const ImageToPdf = L(imgL, 'ImageToPdf'), ImageWatermark = L(imgL, 'ImageWatermark'), ImageResizer = L(imgL, 'ImageResizer')
const PdfMerge = L(pdfL, 'PdfMerge'), PdfSplit = L(pdfL, 'PdfSplit'), PdfCompressor = L(pdfL, 'PdfCompressor'), PdfRotate = L(pdfL, 'PdfRotate')
const PdfOrganize = L(pdfL, 'PdfOrganize'), PdfWatermark = L(pdfL, 'PdfWatermark'), PdfPageNumbers = L(pdfL, 'PdfPageNumbers')
const PdfToImage = L(pdfL, 'PdfToImage'), PdfToText = L(pdfL, 'PdfToText'), PdfMetadata = L(pdfL, 'PdfMetadata')
const PdfEditor = L(edL, 'PdfEditor'), PdfOcr = L(edL, 'PdfOcr')
const ZipCreate = L(miscL, 'ZipCreate'), ZipExtract = L(miscL, 'ZipExtract'), TextToZip = L(miscL, 'TextToZip')
const TxtViewer = L(miscL, 'TxtViewer'), TxtToPdf = L(miscL, 'TxtToPdf'), Base64Tool = L(miscL, 'Base64Tool')
const PhotoLocker = L(() => import('@/pages/tools/PhotoLocker'), 'PhotoLocker')
const Calculator = L(miscL, 'Calculator'), TextCounter = L(miscL, 'TextCounter'), FileSizeChecker = L(miscL, 'FileSizeChecker')

const TOOL_PAGES: Record<string, React.ComponentType> = {
  'image-compressor': ImageCompressor,
  'image-resizer': () => <ImageResizer />,
  'image-enlarger': () => <ImageResizer enlarge />,
  'image-crop': ImageCrop,
  'image-converter': ImageConverter,
  'image-rotate': ImageRotateFlip,
  'image-metadata': ImageMetadata,
  'file-rename': FileRename,
  'image-to-pdf': ImageToPdf,
  'image-watermark': ImageWatermark,
  'pdf-merge': PdfMerge,
  'pdf-split': PdfSplit,
  'pdf-compressor': PdfCompressor,
  'pdf-editor': PdfEditor,
  'pdf-rotate': PdfRotate,
  'pdf-delete-pages': () => <PdfOrganize deleteMode />,
  'pdf-organize': () => <PdfOrganize />,
  'pdf-watermark': PdfWatermark,
  'pdf-page-numbers': PdfPageNumbers,
  'pdf-to-image': PdfToImage,
  'pdf-to-text': PdfToText,
  'pdf-ocr': PdfOcr,
  'pdf-metadata': PdfMetadata,
  'zip-create': ZipCreate,
  'zip-extract': ZipExtract,
  'text-to-zip': TextToZip,
  'txt-viewer': TxtViewer,
  'txt-to-pdf': TxtToPdf,
  'doc-converter': TxtToPdf,
  'base64': Base64Tool,
  'photo-locker': PhotoLocker,
  'calculator': Calculator,
  'text-counter': TextCounter,
  'file-size-checker': FileSizeChecker,
}

function ToolRoute() {
  const { id } = useParams()
  const tool = TOOLS.find((t) => t.id === id)
  const Page = id ? TOOL_PAGES[id] : undefined
  if (!tool || !Page) return <NotFound />
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-20 text-center"><div className="w-12 h-12 mx-auto rounded-full border-4 border-primary/30 border-t-primary animate-spin" /><p className="text-sm text-muted-foreground mt-4">Loading tool…</p></div>}>
      <Page />
    </Suspense>
  )
}

function CategoryPage() {
  const { cat } = useParams()
  useReveal()
  const c = CATEGORIES.find((x) => x === cat)
  if (!c) return <NotFound />
  const list = toolsByCategory(c)
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Category</p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">{c} Tools</h1>
      <p className="text-muted-foreground mb-8">{list.length} tools • all run privately in your browser</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {list.map((t, i) => (
          <Link key={t.id} to={`/tool/${t.id}`} className="glass rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all reveal" style={{ transitionDelay: `${i * 40}ms` }}>
            <span className="text-3xl">{t.icon}</span>
            <p className="font-display font-semibold mt-3">{t.name}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function AllTools() {
  useReveal()
  const letters = [...new Set(TOOLS.map((t) => t.name[0].toUpperCase()))].sort()
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">All Tools <span className="text-gradient">A–Z</span></h1>
      <p className="text-muted-foreground mb-8">{TOOLS.length} genuinely useful tools — no fillers, no fake buttons.</p>
      <div className="flex flex-wrap gap-2 mb-10">
        {letters.map((l) => <a key={l} href={`#l-${l}`} className="w-9 h-9 grid place-items-center rounded-xl glass text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-colors">{l}</a>)}
      </div>
      {letters.map((l) => (
        <div key={l} id={`l-${l}`} className="mb-10 reveal">
          <h2 className="font-display text-xl font-bold text-primary mb-4">{l}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {TOOLS.filter((t) => t.name[0].toUpperCase() === l).sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
              <Link key={t.id} to={`/tool/${t.id}`} className="glass rounded-xl px-4 py-3.5 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-3">
                <span className="text-xl">{t.icon}</span>
                <div className="min-w-0"><p className="text-sm font-medium truncate">{t.name}</p><p className="text-[11px] text-muted-foreground">{t.category}</p></div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl sm:text-4xl font-bold mb-6">{title}</h1>
      <div className="glass rounded-3xl p-6 sm:p-8 space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <p className="font-display text-8xl font-extrabold text-gradient mb-4">404</p>
      <p className="text-xl font-display font-semibold mb-2">This page flew away 🕊️</p>
      <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
      <Link to="/" className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-display font-semibold shadow-lg shadow-indigo-500/30">← Back to Home</Link>
    </div>
  )
}

export default function App() {
  useSmoothScroll()
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])

  return (
    <Layout>
      <Bird />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tools" element={<AllTools />} />
        <Route path="/c/:cat" element={<CategoryPage />} />
        <Route path="/tool/:id" element={<ToolRoute />} />
        <Route path="/about" element={<StaticPage title="About MEGHRAJ">
          <p><b className="text-foreground">MEGHRAJ</b> is an all-in-one file utility platform: {TOOLS.length} tools for images, PDFs, ZIP archives and documents — completely free, with no sign-up.</p>
          <p>Unlike most online tools, MEGHRAJ processes everything <b className="text-foreground">locally in your browser</b> using modern web technologies (Canvas, pdf-lib, PDF.js, JSZip, Tesseract OCR). Your files are never uploaded to any server — the only exception is the optional <b className="text-foreground">Photo Locker</b>, which saves photos to your own private cloud space after you sign in with Google.</p>
        </StaticPage>} />
        <Route path="/privacy" element={<StaticPage title="Privacy">
          <p><b className="text-foreground">Your files never leave your device.</b> Every tool on MEGHRAJ (except the optional Photo Locker) runs 100% client-side. There are no uploads, no server-side processing, no temporary files, and nothing is exposed publicly.</p>
          <p>The one exception is <b className="text-foreground">Photo Locker</b> (optional): if you sign in with Google and add photos, they are stored in your private cloud space (Google Firebase) and are visible only to your account. You can delete them anytime.</p>
          <p>Apart from that, we store only your theme preference in your browser's local storage. No tracking cookies and no analytics on file contents.</p>
        </StaticPage>} />
        <Route path="/terms" element={<StaticPage title="Terms of Use">
          <p>MEGHRAJ is provided "as is", free of charge. While every tool is built and tested carefully, results depend on your browser and input files — always keep a copy of important originals.</p>
          <p>Do not use this service for unlawful content. Large files may be limited by your device's memory.</p>
        </StaticPage>} />
        <Route path="/contact" element={<StaticPage title="Contact">
          <p>Found a bug or want to request a tool? We'd love to hear from you.</p>
          <p>Email: <a href="mailto:meghrajkumarv@gmail.com" className="font-bold text-primary hover:underline">meghrajkumarv@gmail.com</a></p>
          <p>Phone / WhatsApp: <a href="tel:+916392307751" className="font-bold text-primary hover:underline">+91 63923 07751</a></p>
          <p>WhatsApp Channel: <a href="https://whatsapp.com/channel/0029Vb25egi7oQhbkaBNse2o" target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">Join our WhatsApp Channel</a></p>
        </StaticPage>} />
        <Route path="/formats" element={<StaticPage title="Supported Formats">
          <p><b className="text-foreground">Images:</b> JPG, JPEG, PNG, WEBP (input & output), plus GIF/SVG viewing in ZIP previews.</p>
          <p><b className="text-foreground">PDF:</b> merge, split, rotate, compress, watermark, page numbers, organize, extract text, render to images, OCR (first 10 pages).</p>
          <p><b className="text-foreground">Archives:</b> ZIP create & extract. <b className="text-foreground">Documents:</b> TXT view/convert, text-to-PDF, text-to-ZIP.</p>
          <p>Encrypted/password-protected PDFs cannot be modified — password protection and removal are not offered, as browser libraries can't perform real PDF encryption.</p>
        </StaticPage>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster richColors position="bottom-center" />
    </Layout>
  )
}
