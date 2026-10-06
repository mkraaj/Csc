export type ToolCategory = 'Image' | 'PDF' | 'ZIP' | 'File' | 'Document' | 'Utility'

export interface ToolDef {
  id: string
  name: string
  desc: string
  category: ToolCategory
  icon: string // emoji
  popular?: boolean
}

export const TOOLS: ToolDef[] = [
  // Image
  { id: 'image-compressor', name: 'Image Compressor', desc: 'Compress JPG/PNG/WEBP to a target size (KB/MB) with quality control.', category: 'Image', icon: '🗜️', popular: true },
  { id: 'image-resizer', name: 'Image Resizer', desc: 'Resize by width, height or percentage with aspect-ratio lock.', category: 'Image', icon: '📐', popular: true },
  { id: 'image-enlarger', name: 'Image Enlarger', desc: 'Upscale small images to larger dimensions with smoothing.', category: 'Image', icon: '🔍' },
  { id: 'image-crop', name: 'Image Cropper', desc: 'Free crop or fixed ratios: square, 4:3, 16:9, custom.', category: 'Image', icon: '✂️' },
  { id: 'image-converter', name: 'Image Converter', desc: 'Convert between JPG, PNG and WEBP instantly.', category: 'Image', icon: '🔄', popular: true },
  { id: 'image-rotate', name: 'Rotate & Flip Image', desc: 'Rotate 90°/180°/270°/custom and flip horizontally/vertically.', category: 'Image', icon: '🔃' },
  { id: 'image-metadata', name: 'Image Metadata Viewer', desc: 'Inspect dimensions, type, size and EXIF metadata.', category: 'Image', icon: 'ℹ️' },
  { id: 'file-rename', name: 'File Rename', desc: 'Rename any file before downloading it back.', category: 'Image', icon: '✏️' },
  { id: 'image-to-pdf', name: 'Image to PDF', desc: 'Combine photos into a PDF — reorder, page size, margins, quality.', category: 'Image', icon: '🖼️', popular: true },
  { id: 'image-watermark', name: 'Image Watermark', desc: 'Add a text watermark with position, size and opacity.', category: 'Image', icon: '💧' },
  // PDF
  { id: 'pdf-merge', name: 'Merge PDF', desc: 'Combine multiple PDFs into one, in your chosen order.', category: 'PDF', icon: '🔗', popular: true },
  { id: 'pdf-split', name: 'Split PDF', desc: 'Extract page ranges into separate PDF files.', category: 'PDF', icon: '✂️', popular: true },
  { id: 'pdf-compressor', name: 'PDF Compressor', desc: 'Reduce PDF size by re-rendering pages at lower quality.', category: 'PDF', icon: '🗜️', popular: true },
  { id: 'pdf-editor', name: 'PDF Editor', desc: 'Add text, drawings, highlights, shapes and images onto PDF pages.', category: 'PDF', icon: '📝', popular: true },
  { id: 'pdf-rotate', name: 'Rotate PDF', desc: 'Rotate all or selected pages by 90°/180°/270°.', category: 'PDF', icon: '🔃' },
  { id: 'pdf-delete-pages', name: 'Delete PDF Pages', desc: 'Remove unwanted pages and download the result.', category: 'PDF', icon: '🗑️' },
  { id: 'pdf-organize', name: 'Organize PDF Pages', desc: 'Reorder pages visually with up/down controls.', category: 'PDF', icon: '📑' },
  { id: 'pdf-watermark', name: 'PDF Watermark', desc: 'Stamp diagonal text watermark on every page.', category: 'PDF', icon: '💧' },
  { id: 'pdf-page-numbers', name: 'PDF Page Numbers', desc: 'Add page numbers with position and format options.', category: 'PDF', icon: '🔢' },
  { id: 'pdf-to-image', name: 'PDF to Image', desc: 'Render PDF pages to JPG/PNG/WEBP, download as ZIP.', category: 'PDF', icon: '🖼️' },
  { id: 'pdf-to-text', name: 'PDF to Text', desc: 'Extract all text content from a PDF.', category: 'PDF', icon: '📄' },
  { id: 'pdf-ocr', name: 'OCR — Image/PDF to Text', desc: 'Recognize text in scanned images & PDFs (Tesseract OCR).', category: 'PDF', icon: '👁️' },
  { id: 'pdf-metadata', name: 'PDF Metadata', desc: 'View title, author, page count, sizes and more.', category: 'PDF', icon: 'ℹ️' },
  // ZIP
  { id: 'zip-create', name: 'Create ZIP', desc: 'Pack multiple files into a single ZIP archive.', category: 'ZIP', icon: '📦', popular: true },
  { id: 'zip-extract', name: 'ZIP Extractor / Unzip', desc: 'Browse a ZIP, preview files and extract individually or all.', category: 'ZIP', icon: '📂', popular: true },
  { id: 'text-to-zip', name: 'Text to ZIP', desc: 'Type or paste text → TXT file → ZIP download.', category: 'ZIP', icon: '📝' },
  // Document
  { id: 'txt-viewer', name: 'TXT Viewer', desc: 'Open and read .txt / text files with word stats.', category: 'Document', icon: '👀' },
  { id: 'txt-to-pdf', name: 'Text to PDF', desc: 'Convert plain text into a clean multi-page PDF.', category: 'Document', icon: '📄' },
  { id: 'doc-converter', name: 'Document Converter', desc: 'Convert TXT ⇄ PDF and extract text from PDFs.', category: 'Document', icon: '🔄' },
  // Utility
  { id: 'base64', name: 'Base64 Encoder / Decoder', desc: 'Encode/decode text and files to and from Base64.', category: 'Utility', icon: '🔤' },
  { id: 'photo-locker', name: 'Photo Locker', desc: 'Sign in with Google and keep your photos safe in the cloud — open them from any device, only you can see them.', category: 'Utility', icon: '🔐', popular: true },
  { id: 'calculator', name: 'Calculator', desc: 'A fast, keyboard-friendly scientific-style calculator.', category: 'Utility', icon: '🧮' },
  { id: 'text-counter', name: 'Character & Word Counter', desc: 'Count characters, words, sentences, lines and reading time.', category: 'Utility', icon: '🔢' },
  { id: 'file-size-checker', name: 'File Size Checker', desc: 'Check exact size and type of any file without uploading.', category: 'Utility', icon: '⚖️' },
]

export const CATEGORIES: ToolCategory[] = ['Image', 'PDF', 'ZIP', 'File', 'Document', 'Utility']

export function toolsByCategory(cat: ToolCategory) {
  if (cat === 'File') return TOOLS.filter((t) => ['file-rename', 'file-size-checker', 'base64'].includes(t.id))
  return TOOLS.filter((t) => t.category === cat)
}

export function fmtSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (!isFinite(bytes)) return '—'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(3, Math.floor(Math.log(bytes) / Math.log(k)))
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : bytes / Math.pow(k, i) >= 100 ? 0 : 1)} ${sizes[i]}`
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
