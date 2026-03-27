/* ── ZGROUP App — State + Orchestration ── */

const state = {
  user:      null,
  projects:  [],
  currentId: null,
  catFilter: 'Todos',
  appView:   'quote', // 'quote' | 'budget' | 'users' | 'catalog'
};

/** @type {Map<string, ReturnType<typeof setTimeout>>} clave projectId:itemId */
const itemPersistTimers = new Map();

function cancelPersistItemTimer(projectId, itemId) {
  const key = `${projectId}:${itemId}`;
  const t = itemPersistTimers.get(key);
  if (t) {
    clearTimeout(t);
    itemPersistTimers.delete(key);
  }
}

function schedulePersistItem(itemId) {
  const p = curP();
  if (!p) return;
  const key = `${p.id}:${itemId}`;
  const prev = itemPersistTimers.get(key);
  if (prev) clearTimeout(prev);
  itemPersistTimers.set(
    key,
    setTimeout(() => {
      itemPersistTimers.delete(key);
      const proj = state.projects.find((x) => x.id === p.id);
      const it = proj?.items.find((i) => i.id === itemId);
      if (!proj || !it) return;
      API.updateItem(proj.id, it.id, { unitPrice: it.unitPrice, qty: it.qty }).catch(console.warn);
    }, 300)
  );
}

function flushPendingItemSaves() {
  const keys = [...itemPersistTimers.keys()];
  for (const key of keys) {
    const t = itemPersistTimers.get(key);
    clearTimeout(t);
    itemPersistTimers.delete(key);
    const [pid, iid] = key.split(':');
    const proj = state.projects.find((x) => x.id === pid);
    const it = proj?.items.find((i) => i.id === iid);
    if (proj && it) {
      API.updateItem(proj.id, it.id, { unitPrice: it.unitPrice, qty: it.qty }).catch(console.warn);
    }
  }
}

function setAppViewBodyClass(view) {
  document.body.classList.toggle('app-view-budget', view === 'budget');
}

function isViewer() {
  return !!(state.user && state.user.role === 'VIEWER');
}

function applyViewerMode() {
  document.body.classList.toggle('viewer-mode', isViewer());
}

function curP() { return state.projects.find(p => p.id === state.currentId); }

/* ── Catalog render ── */
function renderCatFilters() {
  const c = document.getElementById('cat-filters');
  c.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn   = document.createElement('button');
    const short = cat === 'Todos' ? 'TODOS' : cat.split(' ')[0].toUpperCase().slice(0, 5);
    btn.textContent = short; btn.title = cat;
    const active = state.catFilter === cat;
    btn.style.cssText = `flex-shrink:0;padding:2px 7px;border-radius:4px;font-size:10px;font-family:'Rajdhani',sans-serif;font-weight:600;letter-spacing:1px;cursor:pointer;white-space:nowrap;background:${active?'rgba(0,212,255,.14)':'transparent'};border:1px solid ${active?'rgba(0,212,255,.4)':'var(--border)'};color:${active?'var(--cyan)':'var(--muted)'}`;
    btn.onclick = () => { state.catFilter = cat; renderCatFilters(); renderCatalog(); };
    c.appendChild(btn);
  });
}

function renderCatalog() {
  const q    = document.getElementById('cat-search').value.toLowerCase();
  const list = document.getElementById('cat-list');
  const items = CATALOG.filter(i => {
    const mc = state.catFilter === 'Todos' || i.cat === state.catFilter;
    const ms = !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
    return mc && ms;
  });
  document.getElementById('cat-count').textContent = items.length + ' items';
  list.innerHTML = '';
  if (!items.length) {
    list.innerHTML = `<div class="mono" style="padding:16px;text-align:center;color:var(--muted);font-size:11px;line-height:1.5">Sin resultados</div>`;
    return;
  }
  items.forEach(item => {
    const d   = document.createElement('div');
    d.className = 'ci fade-in';
    d.style.cssText = 'background:var(--card);border:1px solid var(--border);border-radius:6px;padding:6px 8px;cursor:pointer;transition:all .15s';
    const tC = item.tipo === 'ACTIVO' ? 'rgba(0,212,255,.18)' : 'rgba(255,176,64,.18)';
    const tT = item.tipo === 'ACTIVO' ? 'var(--cyan)' : 'var(--amber)';
    d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">
          <span style="font-size:9px;padding:1px 4px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-weight:700;background:${tC};color:${tT}">${item.tipo}</span>
        </div>
        <div style="font-size:11px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${item.name}">${item.name}</div>
        ${item.detalle ? `<div style="font-size:9px;color:#3A5870;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.detalle}</div>` : ''}
        <div class="mono" style="font-size:9px;color:var(--muted);margin-top:2px">${item.code}·${item.unit}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="mono" style="font-size:12px;font-weight:700;color:var(--cyan)">${mf(item.price)}</div>
        <div class="mono" style="font-size:9px;color:var(--muted)">/${item.unit}</div>
      </div>
    </div>`;
    d.onclick = () => {
      if (isViewer()) { toast('Solo lectura (VIEWER)', 'amber'); return; }
      addItem(item);
    };
    list.appendChild(d);
  });
}

/* ── Item render ── */
function renderItems() {
  const p    = curP();
  const list = document.getElementById('items-list');
  if (!p || !p.items.length) {
    list.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;opacity:.3;gap:8px">
      <svg width="44" height="44" fill="none" stroke="var(--muted)" stroke-width="1" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
      <span style="font-family:'Rajdhani',sans-serif;font-size:13px;letter-spacing:2px;color:var(--muted)">SIN PARTIDAS — AÑADE DESDE EL CATÁLOGO</span></div>`;
    computeTotals(); return;
  }
  list.innerHTML = '';
  p.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'item-row fade-in';
    row.dataset.itemId = item.id;
    row.style.cssText = 'display:grid;grid-template-columns:55px 1.6fr 48px 110px 70px 110px 28px;gap:5px;padding:5px 14px;border-bottom:1px solid var(--border-dim);align-items:center;transition:background .12s';
    row.innerHTML = `
      <span class="mono" style="font-size:10px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.code}</span>
      <div><div style="font-size:11px;font-weight:500;color:var(--text)">${item.name}</div>
        <div style="font-size:9px;color:${item.tipo==='CONSUMIBLE'?'var(--amber)':'#3A5070'};margin-top:1px">${item.tipo}</div></div>
      <span class="mono" style="font-size:10px;color:var(--muted);text-align:center">${item.unit}</span>
      <input type="number" value="${item.unitPrice}" min="0" step="0.01" oninput="onItemFieldInput('${item.id}','unitPrice',this.value)" class="vi" style="font-size:11px">
      <input type="number" value="${item.qty}" min="0.01" step="0.01" oninput="onItemFieldInput('${item.id}','qty',this.value)" class="vi" style="font-size:11px;text-align:center">
      <span class="mono" style="font-size:11px;font-weight:600;color:var(--cyan);text-align:right" id="sub-${item.id}">${mf(item.subtotal)}</span>
      <button type="button" onclick="removeItem('${item.id}')" style="background:none;border:none;cursor:pointer;color:var(--red);opacity:.4;font-size:13px;transition:opacity .15s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.4">✕</button>`;
    list.appendChild(row);
  });
  computeTotals();
}

function computeTotals() {
  const p     = curP();
  const items = p?.items || [];
  const tot   = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const act   = items.filter(i => i.tipo !== 'CONSUMIBLE').reduce((s, i) => s + (i.subtotal || 0), 0);
  const con   = items.filter(i => i.tipo === 'CONSUMIBLE').reduce((s, i) => s + (i.subtotal || 0), 0);
  set('footer-total',       mf(tot));
  set('footer-activos',     mf(act));
  set('footer-consumibles', mf(con));
  set('footer-qty',         items.length + ' partidas');
  set('items-count',        items.length);
  set('ib-total',           mf(tot));
  items.forEach(i => { const el = document.getElementById('sub-' + i.id); if (el) el.textContent = mf(i.subtotal); });
}

/* ── Plans render ── */
function renderPlans() {
  const p = curP();
  const list  = document.getElementById('plans-list');
  const badge = document.getElementById('plans-badge');
  if (!p || !p.plans.length) { list.innerHTML = ''; badge.textContent = '0'; return; }
  badge.textContent = p.plans.length;
  list.innerHTML = '';
  p.plans.forEach(pl => {
    const ext   = pl.name.split('.').pop().toUpperCase();
    const isImg = ['PNG','JPG','JPEG','SVG'].includes(ext);
    const d     = document.createElement('div');
    d.style.cssText = 'display:flex;align-items:center;gap:5px;padding:4px 6px;background:var(--card);border:1px solid var(--border);border-radius:4px';
    d.innerHTML = `<span class="mono" style="font-size:8px;font-weight:700;color:var(--amber);background:rgba(255,176,64,.15);padding:1px 4px;border-radius:3px;flex-shrink:0">${ext}</span>
      <span style="flex:1;font-size:10px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${pl.name}">${pl.name}</span>
      ${isImg ? `<a href="${pl.dataUrl}" target="_blank" style="color:var(--cyan);opacity:.5;flex-shrink:0;font-size:12px">⧉</a>` : ''}
      <button onclick="removePlan('${pl.id}')" style="background:none;border:none;cursor:pointer;color:var(--red);opacity:.4;flex-shrink:0;font-size:12px" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.4">✕</button>`;
    list.appendChild(d);
  });
}

/* ── Project select render ── */
function renderProjectSelect() {
  const sel = document.getElementById('project-select');
  sel.innerHTML = '<option value="">— Seleccionar Proyecto —</option>';
  state.projects.forEach(p => {
    const o    = document.createElement('option');
    o.value    = p.id;
    o.selected = p.id === state.currentId;
    o.textContent = p.name + (p.odooNumber ? ' | ' + p.odooNumber : '');
    sel.appendChild(o);
  });
}

function render() {
  if (state.appView !== 'quote' && state.appView !== 'budget') return;
  const hint = document.getElementById('budget-module-hint');
  if (hint) hint.style.display = state.appView === 'budget' ? 'block' : 'none';
  const p = curP();
  document.getElementById('empty-state').style.display  = p ? 'none'  : 'flex';
  document.getElementById('workspace').style.display    = p ? 'block' : 'none';
  document.getElementById('info-bar').style.display     = p ? 'flex'  : 'none';
  if (!p) return;
  set('ib-name', p.name);
  set('ib-odoo', p.odooNumber || '—');
  const bex = document.getElementById('budget-toolbar-extras');
  const bnc = document.getElementById('btn-budget-new-catalog');
  if (bex) bex.style.display = state.appView === 'budget' ? 'flex' : 'none';
  if (bnc) bnc.style.display = state.appView === 'budget' && state.user?.role === 'ADMIN' ? 'inline-flex' : 'none';
  renderItems(); renderPlans(); compute();
}

/* ── Load project into form fields ── */
function loadProjectFields(p) {
  window._adjType = p.adjType || 'margin';
  setVal('adj-pct', p.adjPct ?? 10);
  setVal('cp-plazo', p.cpPlazo ?? 6);   setVal('cp-vida',  p.cpVida  ?? 60);
  setVal('cp-op',    p.cpOp    ?? 5);   setVal('cp-roa',   p.cpRoa   ?? 35);  setVal('cp-merma', p.cpMerma ?? 2);
  setVal('lp-vida',  p.lpVida  ?? 120); setVal('lp-n',     p.lpN     ?? 24);  setVal('lp-n-contrato', p.lpNContrato ?? 36);
  setVal('lp-tea-banco', p.lpTeaBanco ?? 7);  setVal('lp-tea-cot', p.lpTeaCot ?? 15);
  setVal('lp-op',    p.lpOp    ?? 5);   setVal('lp-form',  p.lpForm  ?? 350);
  setVal('lp-post-pct', p.lpPostPct ?? 80); setVal('lp-fondo-rep', p.lpFondoRep ?? 5);
  setVal('est-op', p.estOp ?? 8); setVal('est-sb', p.estSb ?? 4);
  setVal('est-seguro', p.estSeguro ?? 1); setVal('est-sb-pct', p.estSbPct ?? 35);
  setVal('cmp-period', p.cmpPeriod ?? 24);
  setAdjType(window._adjType, false);
}

/* ── Project CRUD ── */
async function selectProject(id) {
  flushPendingItemSaves();
  if (!id) { state.currentId = null; render(); return; }
  try {
    loadingStart();
    const full = await API.getProject(id);
    // merge into state
    const idx = state.projects.findIndex(p => p.id === id);
    if (idx >= 0) state.projects[idx] = full; else state.projects.push(full);
    state.currentId = id;
    loadProjectFields(full);
    render();
  } catch (e) {
    toast('Error cargando proyecto: ' + e.message, 'red');
  } finally { loadingDone(); }
}

async function saveAndCompute() {
  if (isViewer()) return;
  const p = curP();
  if (!p) return;

  // Pull current form values into project in memory
  p.adjType     = window._adjType || 'margin';
  p.adjPct      = getNum('adj-pct', 10);
  p.cpPlazo     = getNum('cp-plazo', 6);  p.cpVida  = getNum('cp-vida', 60);
  p.cpOp        = getNum('cp-op', 5);     p.cpRoa   = getNum('cp-roa', 35);  p.cpMerma = getNum('cp-merma', 2);
  p.lpVida      = getNum('lp-vida', 120); p.lpN     = getNum('lp-n', 24);    p.lpNContrato = getNum('lp-n-contrato', 36);
  p.lpTeaBanco  = getNum('lp-tea-banco', 7); p.lpTeaCot = getNum('lp-tea-cot', 15);
  p.lpOp        = getNum('lp-op', 5);    p.lpForm  = getNum('lp-form', 350);
  p.lpPostPct   = getNum('lp-post-pct', 80); p.lpFondoRep = getNum('lp-fondo-rep', 5);
  p.estOp       = getNum('est-op', 8);   p.estSb   = getNum('est-sb', 4);
  p.estSeguro   = getNum('est-seguro', 1); p.estSbPct = getNum('est-sb-pct', 35);
  p.cmpPeriod   = getNum('cmp-period', 24);

  compute(); // immediate visual feedback

  // Persist to backend (fire-and-forget with silent error)
  API.updateProject(p.id, p).catch(e => console.warn('Save error:', e.message));
}

/**
 * @param {object} catItem
 * @param {{ qty?: number, priceRaw?: string }} [opt] — si se pasa (p. ej. modal Presupuesto), no usa #add-qty / #add-price
 */
async function addItem(catItem, opt) {
  if (isViewer()) return;
  const proj = curP();
  if (!proj) { toast('⚠ Selecciona un proyecto', 'red'); return; }
  const qty =
    opt && opt.qty != null
      ? Math.max(0.01, Number(opt.qty) || 0.01)
      : parseFloat(document.getElementById('add-qty')?.value) || 1;
  const rawPu =
    opt && 'priceRaw' in opt
      ? String(opt.priceRaw ?? '').trim()
      : (document.getElementById('add-price')?.value ?? '').trim();
  let price;
  if (rawPu === '') {
    price = catItem.price;
  } else {
    const parsed = parseFloat(rawPu);
    price = Number.isFinite(parsed) ? parsed : catItem.price;
  }

  // Check if already exists with same catalogId + price
  const existing = proj.items.find((i) => i.catalogId === catItem.id && i.unitPrice === price);
  if (existing) {
    const newQty = parseFloat((existing.qty + qty).toFixed(4));
    existing.qty = newQty;
    existing.subtotal = newQty * existing.unitPrice;
    renderItems(); computeTotals(); compute();
    API.updateItem(proj.id, existing.id, { unitPrice: existing.unitPrice, qty: newQty }).catch(console.warn);
    const ap = document.getElementById('add-price');
    if (ap && !opt) ap.value = '';
    toast('✱ CANTIDAD ACTUALIZADA', 'cyan');
    return;
  }

  const newItem = {
    id:        uid(),
    catalogId: catItem.id,
    code:      catItem.code,
    name:      catItem.name,
    cat:       catItem.cat,
    tipo:      catItem.tipo,
    unit:      catItem.unit,
    unitPrice: price,
    qty,
    subtotal:  qty * price,
  };
  proj.items.push(newItem);
  const ap = document.getElementById('add-price');
  if (ap && !opt) ap.value = '';
  renderItems(); computeTotals(); compute();
  API.addItem(proj.id, newItem).catch((e) => toast('Error guardando ítem: ' + e.message, 'red'));
  toast('+ PARTIDA AÑADIDA', 'cyan');
}

function escPickHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/** Vista Presupuesto (sin columna catálogo): modal para buscar y añadir ítems del catálogo; ADMIN puede crear ítem con + NUEVO EN CATÁLOGO */
function openCatalogPickModal() {
  if (isViewer()) { toast('Solo lectura', 'amber'); return; }
  if (!curP()) { toast('⚠ Selecciona un proyecto', 'red'); return; }
  const pick = { catFilter: 'Todos', debounce: null };
  document.getElementById('modal-title').textContent = 'AÑADIR DESDE CATÁLOGO';
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label class="lm">CANTIDAD</label><input type="number" id="pick-qty" value="1" min="0.01" step="0.01" class="vi" style="text-align:center"></div>
        <div><label class="lm">P.UNIT CUSTOM</label><input type="number" id="pick-price" placeholder="auto" min="0" step="0.01" class="vi"></div>
      </div>
      <input type="text" id="pick-search" class="vi" placeholder="Buscar por nombre o código…" style="text-align:left" autocomplete="off">
      <div id="pick-filters" style="display:flex;flex-wrap:wrap;gap:4px"></div>
      <div id="pick-list" style="max-height:min(48vh,320px);overflow-y:auto;border:1px solid var(--border-dim);border-radius:6px;padding:4px;background:var(--bg)"></div>
      <button type="button" class="bg1" style="width:100%;padding:8px;font-size:12px" onclick="closeModal()">CERRAR</button>
    </div>`;
  openModal();

  function renderPickFilters() {
    const fc = document.getElementById('pick-filters');
    if (!fc) return;
    fc.innerHTML = '';
    CATEGORIES.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = cat === 'Todos' ? 'TODOS' : cat.split(' ')[0].toUpperCase().slice(0, 5);
      btn.title = cat;
      const active = pick.catFilter === cat;
      btn.style.cssText = `padding:2px 8px;border-radius:4px;font-size:10px;font-family:Rajdhani,sans-serif;font-weight:600;cursor:pointer;border:1px solid ${active ? 'rgba(0,229,255,.4)' : 'var(--border)'};background:${active ? 'rgba(0,229,255,.14)' : 'transparent'};color:${active ? 'var(--cyan)' : 'var(--muted)'}`;
      btn.onclick = () => {
        pick.catFilter = cat;
        renderPickFilters();
        renderPickList();
      };
      fc.appendChild(btn);
    });
  }

  function renderPickList() {
    const list = document.getElementById('pick-list');
    if (!list) return;
    const q = (document.getElementById('pick-search')?.value || '').toLowerCase();
    const items = CATALOG.filter((i) => {
      const mc = pick.catFilter === 'Todos' || i.cat === pick.catFilter;
      const ms = !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
      return mc && ms;
    });
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML =
        '<div class="mono" style="padding:12px;text-align:center;color:var(--muted);font-size:11px">Sin resultados</div>';
      return;
    }
    items.forEach((item) => {
      const d = document.createElement('div');
      d.style.cssText =
        'padding:6px 8px;border-radius:4px;cursor:pointer;border:1px solid var(--border-dim);margin-bottom:4px;background:var(--card);display:flex;justify-content:space-between;align-items:center;gap:8px;transition:border-color .12s';
      d.onmouseenter = () => {
        d.style.borderColor = 'rgba(0,229,255,.35)';
      };
      d.onmouseleave = () => {
        d.style.borderColor = 'var(--border-dim)';
      };
      d.onclick = () => {
        const qEl = document.getElementById('pick-qty');
        const qty = parseFloat(qEl?.value) || 1;
        const raw = (document.getElementById('pick-price')?.value ?? '').trim();
        addItem(item, { qty, priceRaw: raw });
        const pp = document.getElementById('pick-price');
        if (pp) pp.value = '';
        closeModal();
      };
      d.innerHTML = `<div style="min-width:0;flex:1">
        <div style="font-size:11px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escPickHtml(item.name)}</div>
        <div class="mono" style="font-size:9px;color:var(--muted)">${escPickHtml(item.code)} · ${escPickHtml(item.tipo)}</div>
      </div><div class="mono" style="font-size:12px;color:var(--cyan);flex-shrink:0">${mf(item.price)}</div>`;
      list.appendChild(d);
    });
  }

  renderPickFilters();
  renderPickList();
  const searchEl = document.getElementById('pick-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      clearTimeout(pick.debounce);
      pick.debounce = setTimeout(renderPickList, 200);
    });
  }
  setTimeout(() => document.getElementById('pick-search')?.focus(), 80);
}

/** Edición inline Módulo 2 — UI inmediata, API con debounce 300 ms */
function onItemFieldInput(id, field, val) {
  if (isViewer()) return;
  const p = curP();
  const it = p?.items.find((i) => i.id === id);
  if (!it) return;
  if (field === 'qty') {
    let q = parseFloat(val);
    if (!Number.isFinite(q)) q = 0.01;
    it.qty = Math.max(0.01, q);
  } else {
    let up = parseFloat(val);
    if (!Number.isFinite(up)) up = 0;
    it.unitPrice = Math.max(0, up);
  }
  it.subtotal = it.qty * it.unitPrice;
  compute();
  schedulePersistItem(id);
}

async function removeItem(id) {
  if (isViewer()) return;
  const p = curP();
  if (!p) return;
  const it = p.items.find((i) => i.id === id);
  cancelPersistItemTimer(p.id, id);
  if (it) {
    try {
      await API.updateItem(p.id, id, { unitPrice: it.unitPrice, qty: it.qty });
    } catch (_) {
      /* continuar con borrado */
    }
  }
  const row = document.querySelector(`#items-list [data-item-id="${id}"]`);
  if (row) {
    row.classList.add('fade-out-exit');
    await new Promise((r) => setTimeout(r, 280));
  }
  p.items = p.items.filter((i) => i.id !== id);
  renderItems();
  compute();
  API.deleteItem(p.id, id).catch((e) => toast('Error: ' + e.message, 'red'));
}

async function clearAllItems() {
  if (isViewer()) return;
  const p = curP();
  if (!p || !p.items.length) return;
  if (!confirm('¿Limpiar todas las partidas?')) return;
  flushPendingItemSaves();
  p.items = [];
  renderItems();
  compute();
  API.clearItems(p.id).catch((e) => toast('Error: ' + e.message, 'red'));
}

/* ── Plans ── */
function handleDragOver(e)  { e.preventDefault(); document.getElementById('drop-zone').classList.add('drag-over'); }
function handleDragLeave()  { document.getElementById('drop-zone').classList.remove('drag-over'); }
function handleDrop(e)      { e.preventDefault(); handleDragLeave(); processFiles(e.dataTransfer.files); }
function handleFiles(e)     { processFiles(e.target.files); }

function processFiles(files) {
  if (isViewer()) return;
  const p = curP();
  if (!p) { toast('⚠ Selecciona un proyecto', 'red'); return; }
  Array.from(files).forEach(f => {
    const r = new FileReader();
    r.onload = async e => {
      const plan = { id: uid(), name: f.name, size: f.size, type: f.type, dataUrl: e.target.result };
      p.plans.push(plan);
      renderPlans();
      toast('📐 PLANO CARGADO', 'amber');
      API.addPlan(p.id, plan).catch(err => toast('Error guardando plano: ' + err.message, 'red'));
    };
    r.readAsDataURL(f);
  });
}

async function removePlan(id) {
  if (isViewer()) return;
  const p = curP();
  if (!p) return;
  p.plans = p.plans.filter(pl => pl.id !== id);
  renderPlans();
  API.deletePlan(p.id, id).catch(console.warn);
}

/* ── Modals ── */
function openNewProjectModal() {
  if (isViewer()) { toast('Solo lectura', 'amber'); return; }
  document.getElementById('modal-title').textContent = 'NUEVO PROYECTO';
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div><label class="lm">NOMBRE DEL PROYECTO *</label>
        <input type="text" id="np-name" placeholder="Ej: Cámara Frigorífica — Proyecto Mango Norte" class="vi" style="text-align:left;padding:8px 12px;font-size:13px;font-family:Inter,sans-serif">
      </div>
      <div><label class="lm">N° COTIZACIÓN ODOO</label>
        <input type="text" id="np-odoo" placeholder="Ej: COT-2024-0042" class="vi" style="text-align:left;padding:8px 12px;font-size:13px">
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="bg1" style="flex:1;padding:10px" onclick="closeModal()">CANCELAR</button>
        <button class="b1" style="flex:1;padding:10px;font-size:14px" onclick="confirmNewProject()">CREAR PROYECTO →</button>
      </div>
    </div>`;
  openModal();
  setTimeout(() => document.getElementById('np-name')?.focus(), 80);
}

async function confirmNewProject() {
  if (isViewer()) return;
  const name = document.getElementById('np-name')?.value.trim();
  const odoo = document.getElementById('np-odoo')?.value.trim();
  if (!name) { if (document.getElementById('np-name')) document.getElementById('np-name').style.borderColor = 'var(--red)'; return; }
  try {
    loadingStart();
    const p = await API.createProject({ id: uid(), name, odooNumber: odoo || '' });
    p.items = []; p.plans = [];
    state.projects.push(p);
    state.currentId = p.id;
    renderProjectSelect();
    loadProjectFields(p);
    closeModal();
    render();
    toast('✓ PROYECTO CREADO', 'cyan');
  } catch (e) {
    toast('Error: ' + e.message, 'red');
  } finally { loadingDone(); }
}

async function deleteCurrentProject() {
  if (isViewer()) return;
  const p = curP();
  if (!p) return;
  if (!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return;
  try {
    await API.deleteProject(p.id);
    state.projects   = state.projects.filter(x => x.id !== p.id);
    state.currentId  = null;
    renderProjectSelect();
    render();
    toast('⚠ PROYECTO ELIMINADO', 'red');
  } catch (e) { toast('Error: ' + e.message, 'red'); }
}

function openCustomItemModal() {
  if (isViewer()) return;
  const p = curP();
  if (!p) { toast('⚠ Selecciona un proyecto', 'red'); return; }
  document.getElementById('modal-title').textContent = 'PIEZA PERSONALIZADA';
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:grid;grid-template-columns:100px 1fr;gap:8px">
        <div><label class="lm">CÓDIGO</label><input type="text" id="ci-code" placeholder="CST-001" class="vi" style="text-align:left;padding:7px"></div>
        <div><label class="lm">NOMBRE *</label><input type="text" id="ci-name" placeholder="Descripción de la pieza" class="vi a" style="text-align:left;padding:7px"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div><label class="lm">TIPO</label><select id="ci-tipo" class="vi" style="text-align:left;padding-right:24px"><option value="ACTIVO">ACTIVO</option><option value="CONSUMIBLE">CONSUMIBLE</option></select></div>
        <div><label class="lm">UNIDAD</label><input type="text" id="ci-unit" value="und" class="vi a" style="text-align:center;padding:7px"></div>
        <div><label class="lm">CANTIDAD</label><input type="number" id="ci-qty" value="1" min="0.01" step="0.01" class="vi a" style="text-align:center;padding:7px"></div>
      </div>
      <div><label class="lm">PRECIO UNITARIO ($)</label><input type="number" id="ci-price" placeholder="0.00" min="0" step="0.01" class="vi" style="padding:7px"></div>
      <div style="display:flex;gap:8px">
        <button class="bg1" style="flex:1;padding:9px" onclick="closeModal()">CANCELAR</button>
        <button style="flex:1;padding:9px;background:rgba(255,176,64,.14);border:1px solid rgba(255,176,64,.4);color:var(--amber);font-family:Rajdhani,sans-serif;font-weight:600;font-size:13px;letter-spacing:1.5px;border-radius:6px;cursor:pointer" onclick="submitCustomItem()">+ AÑADIR</button>
      </div>
    </div>`;
  openModal();
  setTimeout(() => document.getElementById('ci-name')?.focus(), 80);
}

async function submitCustomItem() {
  if (isViewer()) return;
  const name = document.getElementById('ci-name')?.value.trim();
  if (!name) { if (document.getElementById('ci-name')) document.getElementById('ci-name').style.borderColor = 'var(--red)'; return; }
  const p     = curP();
  if (!p) return;
  const tipo  = document.getElementById('ci-tipo')?.value  || 'ACTIVO';
  const unit  = document.getElementById('ci-unit')?.value.trim()  || 'und';
  const qty   = parseFloat(document.getElementById('ci-qty')?.value)   || 1;
  const price = parseFloat(document.getElementById('ci-price')?.value) || 0;
  const newItem = {
    id: uid(), catalogId: 'custom',
    code: document.getElementById('ci-code')?.value.trim() || 'CST',
    name, cat: 'Personalizado', tipo, unit, unitPrice: price, qty, subtotal: qty * price,
  };
  p.items.push(newItem);
  renderItems(); compute(); closeModal();
  toast('+ PIEZA AÑADIDA', 'amber');
  API.addItem(p.id, newItem).catch(e => toast('Error: ' + e.message, 'red'));
}

/* ── Export ── */
function openExportModal() {
  const p = curP();
  if (!p) { toast('⚠ Selecciona un proyecto primero', 'red'); return; }

  const base = p.items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const adj  = p.adjPct || 0;
  const ventaTotal = p.adjType === 'margin' ? base * (1 + adj / 100) : base * (1 - adj / 100);
  const fecha = new Date().toLocaleDateString('es-PE', {day:'2-digit',month:'2-digit',year:'numeric'});
  const curLbl = _currency === 'USD' ? 'USD ($)' : `PEN (S/) T.C. ${_exchangeRate}`;

  const fmtItems = arr => arr.map(i =>
    `  · [${i.code}] ${i.name}\n    ${i.qty} ${i.unit} × ${mf(i.unitPrice)} = ${mf(i.subtotal)}`
  ).join('\n');
  const activosI = p.items.filter(i => i.tipo !== 'CONSUMIBLE');
  const consI    = p.items.filter(i => i.tipo === 'CONSUMIBLE');

  const txt = `📋 COTIZACIÓN TÉCNICA — ZGROUP
${'═'.repeat(54)}
🏗️  Proyecto   : ${p.name}
📌  N° Odoo    : ${p.odooNumber || 'No asignado'}
📅  Fecha      : ${fecha}
💱  Moneda     : ${curLbl}
${'─'.repeat(54)}

ACTIVOS (${activosI.length} ítems):
${activosI.length ? fmtItems(activosI) : '  (ninguno)'}
  Subtotal Activos:  ${mf(activosI.reduce((s,i) => s + i.subtotal, 0))}
${consI.length ? `\nCONSUMIBLES (${consI.length} ítems):\n${fmtItems(consI)}\n  Subtotal Consumibles: ${mf(consI.reduce((s,i) => s + i.subtotal, 0))}\n` : ''}
  TOTAL LISTA:  ${mf(base)}
${'═'.repeat(54)}
  TOTAL VENTA (${p.adjType === 'margin' ? '+ Margen' : '− Dto.'} ${adj}%): ${mf(ventaTotal)}
${'═'.repeat(54)}
📐 Planos adjuntos: ${p.plans.length} archivo(s)
🔧 ZGROUP Sistema de Cotizaciones v7.0 · ${fecha}
${'═'.repeat(54)}`;

  document.getElementById('modal-title').textContent = 'EXPORTAR COTIZACIÓN';
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      <p class="mono" style="font-size:11px;color:var(--muted)">Resumen para Odoo o WhatsApp:</p>
      <textarea id="exp-text" readonly class="mono" style="width:100%;height:340px;background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:10px;font-size:11px;line-height:1.65;resize:none;outline:none">${txt}</textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="b1" style="padding:10px;font-size:13px" onclick="doCopy()">📋 COPIAR TEXTO</button>
        <button class="bgreen" style="padding:10px;font-size:13px" onclick="doWhatsapp()">📱 WHATSAPP</button>
      </div>
      <button class="bg1" style="padding:8px;font-size:12px" onclick="closeModal()">CERRAR</button>
    </div>`;
  openModal();
}

function doCopy() {
  const txt = document.getElementById('exp-text')?.value;
  if (!txt) return;
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { toast('📋 COPIADO', 'cyan'); closeModal(); });
  else { document.getElementById('exp-text').select(); document.execCommand('copy'); toast('📋 COPIADO', 'cyan'); closeModal(); }
}
function doWhatsapp() {
  window.open('https://wa.me/?text=' + encodeURIComponent(document.getElementById('exp-text')?.value || ''), '_blank');
}

/* ── Event listeners ── */
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && document.getElementById('modal-overlay').style.display === 'flex') {
    if (document.getElementById('np-name')) confirmNewProject();
    else if (document.getElementById('ci-name')) submitCustomItem();
    else if (document.getElementById('uu-email')) submitUserForm(!document.getElementById('uu-id'));
    else if (document.getElementById('ca-name')) {
      const caId = document.getElementById('ca-id');
      submitCatalogItemForm(caId && !caId.readOnly);
    }
  }
});

/* ── Auth + Init (Módulo 0) ── */
function afterLogin() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-root').classList.add('is-visible');
  const hu = document.getElementById('hdr-user');
  hu.style.display = 'flex';
  document.getElementById('hdr-email').textContent = state.user.email;
  document.getElementById('hdr-email').title = state.user.email;
  document.getElementById('hdr-role').textContent = state.user.role;
  const navUsers = document.getElementById('nav-users');
  if (navUsers) {
    navUsers.style.display = state.user.role === 'ADMIN' ? 'flex' : 'none';
  }
  const navCatalog = document.getElementById('nav-catalog');
  if (navCatalog) {
    navCatalog.style.display = state.user.role === 'ADMIN' ? 'flex' : 'none';
  }
  applyViewerMode();
  applySideNavFromStorage();
  window.location.hash = '#/';
}

async function submitLogin(ev) {
  ev.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  try {
    loadingStart();
    const data = await API.login(email, pass);
    state.user = data.user;
    afterLogin();
    await initWorkspace();
  } catch (e) {
    errEl.textContent = e.message || 'Credenciales incorrectas';
    errEl.style.display = 'block';
  } finally {
    loadingDone();
  }
}

async function logoutUser() {
  flushPendingItemSaves();
  await API.logout();
  state.user = null;
  state.projects = [];
  state.currentId = null;
  state.appView = 'quote';
  setAppViewBodyClass('quote');
  document.getElementById('app-root').classList.remove('is-visible');
  document.getElementById('hdr-user').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-pass').value = '';
  document.body.classList.remove('viewer-mode');
  window.location.hash = '#/login';
}

async function initWorkspace() {
  state.appView = 'quote';
  navigateApp('quote', true);

  document.getElementById('hdr-date').textContent =
    new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  await initCatalog();
  renderCatFilters();
  renderCatalog();

  const catSearch = document.getElementById('cat-search');
  if (catSearch && !catSearch.dataset.debounceBound) {
    catSearch.dataset.debounceBound = '1';
    let catSearchTimer = null;
    catSearch.addEventListener('input', () => {
      clearTimeout(catSearchTimer);
      catSearchTimer = setTimeout(() => renderCatalog(), 200);
    });
  }

  setAdjType('margin', false);

  try {
    loadingStart();
    state.projects = await API.getProjects();
    renderProjectSelect();
    if (state.projects.length > 0) {
      const last = state.projects[state.projects.length - 1];
      document.getElementById('project-select').value = last.id;
      await selectProject(last.id);
    } else {
      render();
    }
  } catch (e) {
    toast('No se pudo cargar datos: ' + e.message, 'red');
    render();
  } finally {
    loadingDone();
  }
}

function setNavActive(view) {
  const q = document.getElementById('nav-quote');
  const b = document.getElementById('nav-budget');
  const u = document.getElementById('nav-users');
  const c = document.getElementById('nav-catalog');
  const paint = (btn, on) => {
    if (!btn) return;
    btn.style.border = on ? '1px solid rgba(0,229,255,.4)' : '1px solid var(--border-dim)';
    btn.style.background = on ? 'rgba(0,229,255,.14)' : 'transparent';
    btn.style.color = on ? 'var(--cyan)' : 'var(--muted)';
  };
  paint(q, view === 'quote');
  paint(b, view === 'budget');
  paint(u, view === 'users');
  paint(c, view === 'catalog');
}

/** @param {'quote'|'budget'|'users'|'catalog'} view @param {boolean} [silent] */
function navigateApp(view, silent) {
  if ((view === 'users' || view === 'catalog') && state.user?.role !== 'ADMIN') {
    toast('Solo administradores', 'red');
    return;
  }
  if (view === 'users' || view === 'catalog') flushPendingItemSaves();

  state.appView = view;
  const vUsers = document.getElementById('view-admin-users');
  const vCatalog = document.getElementById('view-admin-catalog');
  const ib = document.getElementById('info-bar');
  const es = document.getElementById('empty-state');
  const ws = document.getElementById('workspace');
  if (view === 'users') {
    if (ib) ib.style.display = 'none';
    if (es) es.style.display = 'none';
    if (ws) ws.style.display = 'none';
    if (vUsers) vUsers.style.display = 'flex';
    if (vCatalog) vCatalog.style.display = 'none';
    setAppViewBodyClass('quote');
    setNavActive('users');
    if (!silent && typeof loadUsersTable === 'function') loadUsersTable();
  } else if (view === 'catalog') {
    if (ib) ib.style.display = 'none';
    if (es) es.style.display = 'none';
    if (ws) ws.style.display = 'none';
    if (vUsers) vUsers.style.display = 'none';
    if (vCatalog) vCatalog.style.display = 'flex';
    setAppViewBodyClass('quote');
    setNavActive('catalog');
    if (!silent && typeof loadCatalogTable === 'function') loadCatalogTable();
  } else {
    if (vUsers) vUsers.style.display = 'none';
    if (vCatalog) vCatalog.style.display = 'none';
    setNavActive(view === 'budget' ? 'budget' : 'quote');
    setAppViewBodyClass(view);
    render();
  }
}

function toggleSideNav() {
  document.body.classList.toggle('side-nav-collapsed');
  try {
    localStorage.setItem('zgroup_side_nav_collapsed', document.body.classList.contains('side-nav-collapsed') ? '1' : '0');
  } catch (_) {
    /* ignore */
  }
}

function applySideNavFromStorage() {
  try {
    if (localStorage.getItem('zgroup_side_nav_collapsed') === '1') {
      document.body.classList.add('side-nav-collapsed');
    } else {
      document.body.classList.remove('side-nav-collapsed');
    }
  } catch (_) {
    /* ignore */
  }
}

async function bootstrapAuth() {
  let logged = false;
  try {
    if (API.getAccessToken()) {
      const { user } = await API.me();
      state.user = user;
      logged = true;
    }
  } catch (_) {
    /* token inválido o expirado */
  }
  if (!logged) {
    try {
      const ok = await API.tryRefresh();
      if (ok) {
        const { user } = await API.me();
        state.user = user;
        logged = true;
      }
    } catch (_) {
      /* sin sesión */
    }
  }
  if (logged) {
    afterLogin();
    await initWorkspace();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('hdr-user').style.display = 'none';
  }
}

window.submitLogin = submitLogin;
window.logoutUser = logoutUser;
window.navigateApp = navigateApp;
window.toggleSideNav = toggleSideNav;
window.onItemFieldInput = onItemFieldInput;
window.openCatalogPickModal = openCatalogPickModal;

window.addEventListener('beforeunload', () => {
  flushPendingItemSaves();
});

bootstrapAuth();
