# MEGHRAJ — All Your File Tools. In One Place.

A premium, privacy-first file utility platform. 33 real, working tools for Images, PDFs, ZIP archives and documents — **everything runs 100% in the browser** (no uploads, no server).

## Features
- 🖼️ **Image tools**: compress to target KB/MB, resize/enlarge, crop, convert, rotate/flip, watermark, metadata, image→PDF
- 📕 **PDF tools**: merge, split, compress, editor (text/draw/highlight/shapes/whiteout), rotate, delete/organize pages, watermark, page numbers, PDF→images, PDF→text, OCR (English + Hindi), metadata
- 📦 **ZIP tools**: create, extract/browse/preview, text→ZIP
- 📄 **Docs & utilities**: TXT viewer, text→PDF, Base64, calculator, word counter, file size checker, rename
- 🕊️ Scroll-driven flying bird, buttery smooth scrolling (Lenis), 3D tilt cards, dark/light mode, fully mobile-first

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build   # outputs static site to dist/
```

---

## Deploy on Render (free static hosting)

1. Push this project to a GitHub repository.
2. Go to https://dashboard.render.com → **New → Static Site** → connect your repo.
3. Settings:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Click **Create Static Site** — done. Render auto-deploys on every `git push`.

(No redirect/rewrite rules needed — the app uses hash routing, so all routes work.)

## Deploy on GitHub Pages (free)

1. Push the project to GitHub.
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/deploy-pages@v4
```

4. Push — your site goes live at `https://<username>.github.io/<repo>/`.

Hash routing means no 404 issues on refresh, on any static host.
