# Running the shop

**Day to day, use the admin page: https://pochondo.github.io/admin/**

Sign in with your email and password. It covers adding and editing pieces,
uploading photos, stock, and reading orders — on a phone as well as a
laptop. Nothing here needs code or a git push.

The Supabase dashboard below is the fallback for anything the admin page
does not cover, and for looking at the raw tables.

Dashboard: https://supabase.com/dashboard/project/slnmhiiwuudqqxnkqusk

---

## Editing a piece

**Table Editor → `pieces`** → click a cell → type → Enter.

| Column | What it is | Example |
|---|---|---|
| `name` | Shown as the title | `Everyday mug` |
| `price` | Whole taka, no symbol | `850` |
| `description` | A sentence or two | `A mug with a comfortable handle.` |
| `size` | Height × width | `9 × 8 cm` |
| `holds` | Volume, for cups and bowls | `300 ml` |
| `glaze` | Glaze name | `Ash white` |
| `care` | Washing advice | `Dishwasher safe` |
| `stock` | How many you have | `4` |
| `is_listed` | `true` shows it on the site | `true` |
| `sort_order` | Lower numbers appear first | `1` |

A piece appears on the site only when `is_listed` is `true` **and** `price`
is above zero. Set `is_listed` to `false` to hide something without losing
its details or its order history.

Stock reaching `0` marks the piece "sold out" on the site; it stays visible.

---

## Adding a new piece

**Table Editor → `pieces` → Insert → Insert row.**

Four columns must be filled; the rest have sensible defaults.

| Column | Rule |
|---|---|
| `slug` | Unique, lowercase, hyphens, no spaces — e.g. `small-teapot`. Never reuse one. |
| `name` | Any text |
| `price` | Whole taka |
| `shape` | One of exactly: `mug`, `bowl`, `vase`, `plates`, `jug`, `tumbler` |

`shape` only decides which line drawing shows **before you add photos**, so
pick whichever looks closest. Once the piece has a photo, the drawing is
never used. Any other value is rejected by the database.

Remember to set `stock` and flip `is_listed` to `true`, or it stays hidden.

---

## Adding photos

**Storage → `photos` bucket → Upload file.**

Upright photos work best — about 4 wide by 5 tall, 1200px wide is plenty.
Large files make the shop slow to load on phone data, so keep each one
under roughly 300 KB.

After uploading, click the file → **Copy URL**. It looks like:

```
https://slnmhiiwuudqqxnkqusk.supabase.co/storage/v1/object/public/photos/mug-1.jpg
```

Then paste it into the piece's `photos` column. That column holds a *list*,
so the format is:

```
{"https://.../mug-1.jpg","https://.../mug-2.jpg"}
```

Curly braces, each URL in double quotes, commas between. One photo is fine:

```
{"https://.../mug-1.jpg"}
```

The first photo in the list is the one shown on the shop page; the rest
appear on the piece's own page.

---

## Orders

**Table Editor → `orders`** — newest first.

Each order has a matching set of rows in `order_items` showing what was
bought, at the price charged at the time. Use `status` to track it:
`new` → `confirmed` → `shipped` → `done`, or `cancelled`.

Customers cannot read this table. Nobody can, except through this dashboard.

---

## If the shop looks out of date

The site caches for up to 10 minutes. Hard-refresh, or wait.

If the site shows the six original template pieces instead of yours, the
database was unreachable and the built-in fallback took over. Check the
project is not paused: free projects sleep after 7 days without traffic,
and the dashboard shows a **Restore** button when that happens.
