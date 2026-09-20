/* The catalogue screen: list, edit, create, photo upload. */
window.Pieces = (function () {
  'use strict';

  const A = window.Admin;
  const FIELDS = 'id,slug,name,price,shape,description,size,holds,glaze,care,photos,stock,is_listed,sort_order,is_preorder,category';

  let rows = [];
  let activeCategory = '';   // '' shows everything
  let editing = null;       // the row being edited, or null when creating
  let photos = [];          // working copy, committed on save

  const dialog = A.$('#piece-dialog');

  function slugify(text) {
    return String(text).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  /* The short id is generated, never typed. A Bengali name slugifies to an
     empty string, so the shape is the fallback before a bare 'piece'. */
  function uniqueSlug(name, shape) {
    const base = slugify(name) || slugify(shape) || 'piece';
    const taken = new Set(rows.map((r) => r.slug));
    if (!taken.has(base)) return base;

    let n = 2;
    while (taken.has(base + '-' + n)) n += 1;
    return base + '-' + n;
  }

  function stockPill(row) {
    if (!row.is_listed) return '<span class="pill off">hidden</span>';
    if (row.is_preorder) return '<span class="pill on">preorder</span>';
    if (Number(row.stock) <= 0) return '<span class="pill zero">sold out</span>';
    return '<span class="pill on">' + row.stock + ' in stock</span>';
  }

  function categoryNames() {
    const names = [];
    rows.forEach((row) => {
      const c = (row.category || '').trim();
      if (c && names.indexOf(c) === -1) names.push(c);
    });
    return names.sort((a, b) => a.localeCompare(b));
  }

  /* Offer the categories already in use, so spelling stays consistent
     without locking the list down. */
  function refreshSuggestions() {
    A.$('#category-options').innerHTML = categoryNames()
      .map((name) => '<option value="' + A.escapeHtml(name) + '">').join('');
  }

  function renderChips() {
    const box = A.$('#admin-chips');
    const names = categoryNames();

    if (!names.length) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }

    box.hidden = false;
    box.innerHTML = [''].concat(names).map((name) => {
      const on = name === activeCategory;
      return '<button type="button" class="chip" data-category="' + A.escapeHtml(name) + '"' +
             ' aria-pressed="' + (on ? 'true' : 'false') + '">' +
             A.escapeHtml(name || 'All') + '</button>';
    }).join('');

    box.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeCategory = chip.dataset.category || '';
        render();
      });
    });
  }

  function itemHtml(row) {
    const i = rows.indexOf(row);
    const photo = Array.isArray(row.photos) && row.photos[0];
    return '<li><button class="item" data-i="' + i + '">' +
      (photo ? '<img class="thumb" src="' + A.escapeHtml(photo) + '" alt="" loading="lazy">'
             : '<span class="thumb"></span>') +
      '<span class="item-main">' +
        '<span class="item-name">' + A.escapeHtml(row.name) + '</span>' +
        '<span class="item-sub">' + A.taka(row.price) + '</span>' +
      '</span>' + stockPill(row) +
    '</button></li>';
  }

  function render() {
    const list = A.$('#piece-list');
    renderChips();
    refreshSuggestions();

    const shown = activeCategory
      ? rows.filter((row) => (row.category || '').trim() === activeCategory)
      : rows;

    /* Ungrouped while a single category is selected; grouped under headings
       when showing everything, so the whole catalogue stays readable. */
    if (activeCategory) {
      list.innerHTML = shown.map(itemHtml).join('');
    } else {
      const groups = [];
      categoryNames().concat(['']).forEach((name) => {
        const members = rows.filter((row) => (row.category || '').trim() === name);
        if (!members.length) return;
        groups.push('<li class="group-head">' + A.escapeHtml(name || 'Uncategorised') + '</li>');
        groups.push(members.map(itemHtml).join(''));
      });
      list.innerHTML = groups.join('');
    }

    list.querySelectorAll('.item').forEach((button) => {
      button.addEventListener('click', () => open(rows[Number(button.dataset.i)]));
    });

    A.setMessage(A.$('#pieces-status'), rows.length ? '' : 'No pieces yet. Add your first one.');
  }

  async function load() {
    try {
      const { data, error } = await A.client
        .from('pieces').select(FIELDS).order('sort_order', { ascending: true });
      if (error) throw error;
      rows = data || [];
      render();
    } catch (error) {
      A.setMessage(A.$('#pieces-status'), A.explain(error), true);
    }
  }

  function renderPhotos() {
    A.$('#photo-list').innerHTML = photos.map((url, i) =>
      '<li><img src="' + A.escapeHtml(url) + '" alt="">' +
      '<button type="button" data-i="' + i + '" aria-label="Remove photo">&times;</button></li>'
    ).join('');

    A.$('#photo-list').querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        photos = photos.filter((_, i) => i !== Number(button.dataset.i));
        renderPhotos();
      });
    });
  }

  function open(row) {
    editing = row || null;
    photos = row && Array.isArray(row.photos) ? row.photos.slice() : [];

    A.$('#piece-dialog-title').textContent = row ? 'Edit piece' : 'New piece';
    A.$('#f-name').value        = row ? row.name : '';
    A.$('#f-slug').value        = row ? row.slug : '';
    A.$('#slug-row').hidden     = !row;
    A.$('#f-price').value       = row ? row.price : 0;
    A.$('#f-stock').value       = row ? row.stock : 0;
    A.$('#f-shape').value       = row ? row.shape : 'mug';
    A.$('#f-category').value    = row ? (row.category || '') : activeCategory;
    A.$('#f-description').value = row ? row.description : '';
    A.$('#f-size').value        = row ? row.size : '';
    A.$('#f-holds').value       = row ? row.holds : '';
    A.$('#f-glaze').value       = row ? row.glaze : '';
    A.$('#f-care').value        = row ? row.care : '';
    A.$('#f-sort').value        = row ? row.sort_order : rows.length + 1;
    A.$('#f-listed').checked    = row ? row.is_listed : false;
    A.$('#f-preorder').checked  = row ? row.is_preorder : true;

    A.setMessage(A.$('#piece-error'), '', true);
    A.setMessage(A.$('#upload-status'), '');
    renderPhotos();
    dialog.showModal();
  }

  async function upload(file) {
    const status = A.$('#upload-status');
    const slug = slugify(A.$('#f-slug').value || A.$('#f-name').value || 'piece');
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    const path = slug + '/' + Date.now() + '-' + safe;

    A.setMessage(status, 'Uploading…');
    try {
      const { error } = await A.client.storage.from('photos')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;

      const { data } = A.client.storage.from('photos').getPublicUrl(path);
      photos = photos.concat([data.publicUrl]);
      renderPhotos();
      A.setMessage(status, 'Added. Remember to save.');
    } catch (error) {
      A.setMessage(status, A.explain(error), true);
    }
  }

  function readForm() {
    return {
      slug:        A.$('#f-slug').value || '',   /* filled in by save() when new */
      name:        A.$('#f-name').value.trim(),
      price:       Math.max(0, parseInt(A.$('#f-price').value, 10) || 0),
      stock:       Math.max(0, parseInt(A.$('#f-stock').value, 10) || 0),
      shape:       A.$('#f-shape').value,
      category:    A.$('#f-category').value.trim(),
      description: A.$('#f-description').value.trim(),
      size:        A.$('#f-size').value.trim(),
      holds:       A.$('#f-holds').value.trim(),
      glaze:       A.$('#f-glaze').value.trim(),
      care:        A.$('#f-care').value.trim(),
      sort_order:  parseInt(A.$('#f-sort').value, 10) || 0,
      is_listed:   A.$('#f-listed').checked,
      is_preorder: A.$('#f-preorder').checked,
      photos:      photos.slice()
    };
  }

  async function save() {
    const button = A.$('#piece-save');
    const err = A.$('#piece-error');
    const piece = readForm();

    if (!piece.name) return A.setMessage(err, 'A name is needed.', true);
    if (!editing) piece.slug = uniqueSlug(piece.name, piece.shape);
    if (piece.is_listed && piece.price <= 0) {
      return A.setMessage(err, 'Set a price above zero before showing it on the shop.', true);
    }

    button.disabled = true;
    A.setMessage(err, '', true);
    try {
      const query = editing
        ? A.client.from('pieces').update(piece).eq('id', editing.id)
        : A.client.from('pieces').insert(piece);
      const { error } = await query;
      if (error) throw error;

      dialog.close();
      await load();
    } catch (error) {
      A.setMessage(err, A.explain(error), true);
    } finally {
      button.disabled = false;
    }
  }

  /* ----------------------------------------------------------- wiring */
  A.$('#add-piece').addEventListener('click', () => open(null));
  A.$('#piece-cancel').addEventListener('click', () => dialog.close());
  A.$('#piece-save').addEventListener('click', save);

  A.$('#f-photo').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) upload(file);
    e.target.value = '';
  });

  return { load };
}());
