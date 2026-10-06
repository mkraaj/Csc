// Client-side image processing helpers (Canvas-based, privacy-first)

export async function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('Could not decode this image. Unsupported or corrupted file.'))
      img.src = url
    })
    return img
  } finally { /* caller may still need url? we revoke after load */ }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Export failed — format not supported by this browser.'))), type, quality)
  })
}

export function drawToCanvas(img: HTMLImageElement, w: number, h: number, smoothing = true): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h))
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = smoothing
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return c
}

/** Compress toward a target byte size using binary search on quality, then dimension scaling. */
export async function compressToTarget(
  img: HTMLImageElement,
  targetBytes: number,
  format: 'image/jpeg' | 'image/webp' | 'image/png',
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const w = img.naturalWidth, h = img.naturalHeight
  const canvas = drawToCanvas(img, w, h)
  if (format === 'image/jpeg' || format === 'image/webp') {
    // flatten transparency for jpeg
    if (format === 'image/jpeg') {
      const c2 = document.createElement('canvas'); c2.width = canvas.width; c2.height = canvas.height
      const x2 = c2.getContext('2d')!
      x2.fillStyle = '#ffffff'; x2.fillRect(0, 0, c2.width, c2.height)
      x2.drawImage(canvas, 0, 0)
      canvas.width = c2.width; canvas.height = c2.height
      canvas.getContext('2d')!.putImageData(x2.getImageData(0, 0, c2.width, c2.height), 0, 0)
    }
    let lo = 0.02, hi = 1, best: Blob | null = null
    for (let i = 0; i < 8; i++) {
      const q = (lo + hi) / 2
      const b = await canvasToBlob(canvas, format, q)
      onProgress?.(10 + i * 8)
      if (b.size <= targetBytes) { best = b; lo = q } else { hi = q }
    }
    if (best) return best
    // still too big at min quality → scale down dimensions
    let scale = 0.85
    while (scale > 0.05) {
      const c = drawToCanvas(img, w * scale, h * scale)
      const b = await canvasToBlob(c, format, 0.6)
      onProgress?.(75 + (0.85 - scale) * 30)
      if (b.size <= targetBytes) return b
      scale *= 0.7
    }
    const c = drawToCanvas(img, Math.max(16, w * 0.05), Math.max(16, h * 0.05))
    return canvasToBlob(c, format, 0.5)
  }
  // PNG: lossless — only dimension scaling can reach target
  const b0 = await canvasToBlob(canvas, 'image/png')
  if (b0.size <= targetBytes) return b0
  let scale = Math.sqrt(targetBytes / b0.size) * 0.95
  while (scale > 0.03) {
    const c = drawToCanvas(img, w * scale, h * scale)
    const b = await canvasToBlob(c, 'image/png')
    if (b.size <= targetBytes) return b
    scale *= 0.75
  }
  return canvasToBlob(drawToCanvas(img, 32, 32), 'image/png')
}

/** Simple EXIF-lite metadata extraction (JPEG APP1) */
export async function readExif(file: File): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  try {
    const buf = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer())
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let off = 2
      while (off + 4 < buf.length) {
        if (buf[off] !== 0xff) break
        const marker = buf[off + 1]
        const len = (buf[off + 2] << 8) | buf[off + 3]
        if (marker === 0xe1) {
          const seg = buf.slice(off + 4, off + 2 + len)
          const head = String.fromCharCode(...seg.slice(0, 6))
          if (head.startsWith('Exif')) {
            // minimal parse: look for ASCII strings
            const txt = Array.from(seg).map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '|')).join('')
            const strs = txt.split('|').filter((s) => s.length >= 6).slice(0, 12)
            strs.forEach((s, i) => (out[`EXIF string ${i + 1}`] = s.trim()))
          }
        }
        if (marker === 0xda) break
        off += 2 + len
      }
    }
  } catch { /* ignore */ }
  return out
}
