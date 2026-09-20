/* Loads the catalogue from Supabase, then starts the shop.
 *
 * The pieces written into index.html stay as the fallback: if the database
 * is asleep, unreachable or empty, visitors still see a full shop rather
 * than a blank page. Nothing here throws — a failure is a quiet downgrade.
 */
(function () {
  'use strict';

  const CURRENCY = '৳';           // ৳
  const FIELDS = 'slug,name,price,shape,description,size,holds,glaze,care,photos,stock,sort_order,is_preorder';

  function formatPrice(taka) {
    const n = Number(taka);
    if (!Number.isFinite(n) || n <= 0) return '';
    return CURRENCY + n.toLocaleString('en-US');
  }

  /* A database row is untrusted input like any other: coerce every field. */
  function toPiece(row) {
    return {
      slug:        String(row.slug || ''),
      name:        String(row.name || ''),
      price:       formatPrice(row.price),
      shape:       String(row.shape || 'mug'),
      photos:      Array.isArray(row.photos) ? row.photos.map(String) : [],
      description: String(row.description || ''),
      size:        String(row.size || ''),
      holds:       String(row.holds || ''),
      glaze:       String(row.glaze || ''),
      care:        String(row.care || ''),
      /* A preorder is brought in per order, so stock does not gate it. */
      available:   row.is_preorder === true || Number(row.stock) > 0
    };
  }

  async function fetchPieces(cfg) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    try {
      const url = cfg.url + '/rest/v1/pieces?select=' + FIELDS + '&order=sort_order.asc';
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey }
      });
      if (!res.ok) throw new Error('catalogue request failed: HTTP ' + res.status);
      const rows = await res.json();
      return Array.isArray(rows) ? rows : [];
    } finally {
      clearTimeout(timer);
    }
  }

  async function start() {
    const cfg = window.SUPABASE;
    const startShop = window.__startShop;

    if (typeof startShop !== 'function') {
      console.error('[পছন্দ] shop script missing; nothing to start');
      return;
    }

    if (cfg && cfg.url && cfg.anonKey) {
      try {
        const rows = await fetchPieces(cfg);
        const pieces = rows.map(toPiece).filter((p) => p.name && p.price);
        if (pieces.length) {
          window.PIECES = pieces;
          console.info('[পছন্দ] catalogue: ' + pieces.length + ' pieces from the database');
        } else {
          console.info('[পছন্দ] catalogue: database listed nothing, using the built-in pieces');
        }
      } catch (err) {
        console.warn('[পছন্দ] catalogue: database unreachable, using the built-in pieces', err);
      }
    }

    startShop();
  }

  start();
}());
