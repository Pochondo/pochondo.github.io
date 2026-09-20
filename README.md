# Pottery site

A single-file static website for a handmade pottery studio, published with GitHub Pages.

## Editing

**Day to day, see [docs/MANAGING.md](docs/MANAGING.md)** — prices, stock,
photos and new pieces are all edited in the Supabase dashboard and need no
push.

In the code, `index.html` holds:

- `window.STUDIO` — studio name, tagline, contact details, colour
- `window.PIECES` — the fallback catalogue, shown only when the database
  is unreachable, asleep or empty

Database setup lives in `supabase/`, run in order 01 → 05.

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
