# Pottery site

A single-file static website for a handmade pottery studio, published with GitHub Pages.

## Editing

All content lives in the `SETTINGS` block near the top of `index.html`:

- `window.STUDIO` — studio name, tagline, contact details, colour
- `window.PIECES` — the catalogue; copy a block to add a piece

Photos go in `images/`. Upright shots (4:5, ~1200px wide) fit best.

## Publishing

Every push to `main` redeploys the live site automatically.

```
git add -A && git commit -m "update content" && git push
```

## Local preview

```
python3 -m http.server 8765
```

Then open http://localhost:8765
