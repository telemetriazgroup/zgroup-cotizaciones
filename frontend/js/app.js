/* ── ZGROUP App — State + Orchestration ── */

const state = {
  projects:  [],
  currentId: null,
  catFilter: 'Todos',
};

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
    d.onclick = () => addItem(item);
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
    row.style.cssText = 'display:grid;grid-template-columns:55px 1.6fr 48px 110px 70px 110px 28px;gap:5px;padding:5px 14px;border-bottom:1px solid var(--border-dim);align-items:center;transition:background .12s';
    row.innerHTML = `
      <span class="mono" style="font-size:10px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.code}</span>
      <div><div style="font-size:11px;font-weight:500;color:var(--text)">${item.name}</div>
        <div style="font-size:9px;color:${item.tipo==='CONSUMIBLE'?'var(--amber)':'#3A5070'};margin-top:1px">${item.tipo}</div></div>
      <span class="mono" style="font-size:10px;color:var(--muted);text-align:center">${item.unit}</span>
      <input type="number" value="${item.unitPrice}" min="0" step="0.01" onchange="updateItem('${item.id}','unitPrice',this.value)" class="vi" style="font-size:11px">
      <input type="number" value="${item.qty}" min="0.01" step="0.01" onchange="updateItem('${item.id}','qty',this.value)" class="vi" style="font-size:11px;text-align:center">
      <span class="mono" style="font-size:11px;font-weight:600;color:var(--cyan);text-align:right" id="sub-${item.id}">${mf(item.subtotal)}</span>
      <button onclick="removeItem('${item.id}')" style="background:none;border:none;cursor:pointer;color:var(--red);opacity:.4;font-size:13px;transition:opacity .15s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.4">✕</button>`;
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
  const p = curP();
  document.getElementById('empty-state').style.display  = p ? 'none'  : 'flex';
  document.getElementById('workspace').style.display    = p ? 'block' : 'none';
  document.getElementById('info-bar').style.display     = p ? 'flex'  : 'none';
  if (!p) return;
  set('ib-name', p.name);
  set('ib-odoo', p.odooNumber || '—');
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

async function addItem(catItem) {
  const p = curP();
  if (!p) { toast('⚠ Selecciona un proyecto', 'red'); return; }
  const qty   = parseFloat(document.getElementById('add-qty').value) || 1;
  const cp    = parseFloat(document.getElementById('add-price').value) || 0;
  const price = cp > 0 ? cp : catItem.price;

  // Check if already exists with same catalogId + price
  const existing = p.items.find(i => i.catalogId === catItem.id && i.unitPrice === price);
  if (existing) {
    const newQty = parseFloat((existing.qty + qty).toFixed(4));
    existing.qty      = newQty;
    existing.subtotal = newQty * existing.unitPrice;
    renderItems(); computeTotals(); compute();
    API.updateItem(p.id, existing.id, { unitPrice: existing.unitPrice, qty: newQty }).catch(console.warn);
    document.getElementById('add-price').value = '';
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
  p.items.push(newItem);
  document.getElementById('add-price').value = '';
  renderItems(); computeTotals(); compute();
  API.addItem(p.id, newItem).catch(e => toast('Error guardando ítem: ' + e.message, 'red'));
  toast('+ PARTIDA AÑADIDA', 'cyan');
}

async function updateItem(id, field, val) {
  const p  = curP();
  const it = p?.items.find(i => i.id === id);
  if (!it) return;
  it[field]     = parseFloat(val) || 0;
  it.subtotal   = it.qty * it.unitPrice;
  computeTotals(); compute();
  API.updateItem(p.id, it.id, { unitPrice: it.unitPrice, qty: it.qty }).catch(console.warn);
}

async function removeItem(id) {
  const p = curP();
  if (!p) return;
  p.items = p.items.filter(i => i.id !== id);
  renderItems(); compute();
  API.deleteItem(p.id, id).catch(e => toast('Error: ' + e.message, 'red'));
}

async function clearAllItems() {
  const p = curP();
  if (!p || !p.items.length) return;
  if (!confirm('¿Limpiar todas las partidas?')) return;
  p.items = [];
  renderItems(); compute();
  API.clearItems(p.id).catch(e => toast('Error: ' + e.message, 'red'));
}

/* ── Plans ── */
function handleDragOver(e)  { e.preventDefault(); document.getElementById('drop-zone').classList.add('drag-over'); }
function handleDragLeave()  { document.getElementById('drop-zone').classList.remove('drag-over'); }
function handleDrop(e)      { e.preventDefault(); handleDragLeave(); processFiles(e.dataTransfer.files); }
function handleFiles(e)     { processFiles(e.target.files); }

function processFiles(files) {
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
  const p = curP();
  if (!p) return;
  p.plans = p.plans.filter(pl => pl.id !== id);
  renderPlans();
  API.deletePlan(p.id, id).catch(console.warn);
}

/* ── Modals ── */
function openNewProjectModal() {
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
  }
});

/* ── Init ── */
async function init() {
  document.getElementById('hdr-date').textContent =
    new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' });

  renderCatFilters();
  renderCatalog();
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
    toast('No se pudo conectar al backend. ¿Está corriendo?', 'red');
    render();
  } finally { loadingDone(); }
}

init();
