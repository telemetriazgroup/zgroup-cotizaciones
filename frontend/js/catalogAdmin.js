/* ── CRUD catálogo (ADMIN) — Módulo 1 ── */

const CATALOG_ADMIN_CATS = ['Trab. Estructura', 'Sistema de Frio', 'Accesorios', 'Puertas'];

let _catalogAdminCache = [];

function escapeCatalogHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function loadCatalogTable() {
  const body = document.getElementById('catalog-table-body');
  if (!body) return;
  body.innerHTML =
    '<div class="mono" style="padding:20px;text-align:center;color:var(--muted);font-size:12px">Cargando…</div>';
  try {
    _catalogAdminCache = await API.listCatalog();
    renderCatalogTable();
  } catch (e) {
    body.innerHTML = `<div style="padding:16px;color:var(--red);font-size:12px">${escapeCatalogHtml(e.message)}</div>`;
  }
}

function renderCatalogTable() {
  const body = document.getElementById('catalog-table-body');
  if (!body) return;
  if (!_catalogAdminCache.length) {
    body.innerHTML =
      '<div class="mono" style="padding:20px;text-align:center;color:var(--muted);font-size:12px">No hay ítems en el catálogo</div>';
    return;
  }
  const sorted = [..._catalogAdminCache].sort((a, b) => {
    const so = (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999);
    if (so !== 0) return so;
    return String(a.id).localeCompare(String(b.id));
  });
  body.innerHTML = '';
  sorted.forEach((it) => {
    const row = document.createElement('div');
    row.style.cssText =
      'display:grid;grid-template-columns:100px 1fr 140px 90px 80px 1fr;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border-dim);align-items:center;font-size:11px';
    const tipoC = it.tipo === 'ACTIVO' ? 'var(--cyan)' : 'var(--amber)';
    row.innerHTML = `
      <span class="mono" style="color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeCatalogHtml(it.id)}">${escapeCatalogHtml(it.id)}</span>
      <span style="color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeCatalogHtml(it.name)}">${escapeCatalogHtml(it.name)}</span>
      <span class="mono" style="color:var(--muted);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeCatalogHtml(it.cat)}</span>
      <span class="mono" style="color:${tipoC};font-weight:700;font-size:10px">${escapeCatalogHtml(it.tipo)}</span>
      <span class="mono" style="color:var(--cyan);text-align:right">${typeof mf === 'function' ? mf(it.price) : it.price}</span>
      <div style="display:flex;justify-content:flex-end;gap:6px">
        <button type="button" class="bg1" style="padding:4px 10px;font-size:11px" data-act="edit">Editar</button>
        <button type="button" class="bred" style="padding:4px 10px;font-size:11px" data-act="del">Eliminar</button>
      </div>`;
    row.querySelector('[data-act="edit"]').onclick = () => openCatalogItemModal(it);
    row.querySelector('[data-act="del"]').onclick = () => confirmDeleteCatalogItem(it);
    body.appendChild(row);
  });
}

function openCatalogItemModal(item) {
  const isNew = !item;
  document.getElementById('modal-title').textContent = isNew ? 'NUEVO ÍTEM CATÁLOGO' : 'EDITAR ÍTEM CATÁLOGO';
  const catOpts = CATALOG_ADMIN_CATS.map(
    (c) =>
      `<option value="${escapeCatalogHtml(c)}" ${item && item.cat === c ? 'selected' : ''}>${escapeCatalogHtml(
        c
      )}</option>`
  ).join('');
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label class="lm">ID *</label>
          <input type="text" id="ca-id" class="vi" style="text-align:left;padding:7px;font-family:'JetBrains Mono',monospace" placeholder="EST-022" value="${
            item ? escapeCatalogHtml(item.id) : ''
          }" ${item ? 'readonly' : ''}>
        </div>
        <div><label class="lm">CÓDIGO *</label>
          <input type="text" id="ca-code" class="vi" style="text-align:left;padding:7px" value="${
            item ? escapeCatalogHtml(item.code) : ''
          }">
        </div>
      </div>
      <div><label class="lm">NOMBRE *</label>
        <input type="text" id="ca-name" class="vi" style="text-align:left;padding:7px" value="${
          item ? escapeCatalogHtml(item.name) : ''
        }">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div><label class="lm">CATEGORÍA</label>
          <select id="ca-cat" class="vi" style="text-align:left;padding-right:24px">${catOpts}</select>
        </div>
        <div><label class="lm">TIPO</label>
          <select id="ca-tipo" class="vi" style="text-align:left;padding-right:24px">
            <option value="ACTIVO" ${item && item.tipo === 'ACTIVO' ? 'selected' : ''}>ACTIVO</option>
            <option value="CONSUMIBLE" ${item && item.tipo === 'CONSUMIBLE' ? 'selected' : ''}>CONSUMIBLE</option>
          </select>
        </div>
        <div><label class="lm">ORDEN</label>
          <input type="number" id="ca-sort" class="vi" style="text-align:center;padding:7px" min="0" step="1" value="${
            item && item.sortOrder != null ? item.sortOrder : 9999
          }">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:80px 1fr;gap:8px">
        <div><label class="lm">UNIDAD</label>
          <input type="text" id="ca-unit" class="vi" style="text-align:center;padding:7px" value="${
            item ? escapeCatalogHtml(item.unit) : 'und'
          }">
        </div>
        <div><label class="lm">PRECIO ($)</label>
          <input type="number" id="ca-price" class="vi" style="text-align:right;padding:7px" min="0" step="0.01" value="${
            item ? item.price : 0
          }">
        </div>
      </div>
      <div><label class="lm">DETALLE</label>
        <input type="text" id="ca-detalle" class="vi" style="text-align:left;padding:7px" value="${
          item ? escapeCatalogHtml(item.detalle || '') : ''
        }">
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button type="button" class="bg1" style="flex:1;padding:10px" onclick="closeModal()">CANCELAR</button>
        <button type="button" class="b1" style="flex:1;padding:10px" onclick="submitCatalogItemForm(${isNew})">GUARDAR</button>
      </div>
    </div>`;
  openModal();
  setTimeout(() => document.getElementById(isNew ? 'ca-id' : 'ca-name')?.focus(), 80);
}

async function submitCatalogItemForm(isNew) {
  const id = document.getElementById('ca-id')?.value.trim();
  const code = document.getElementById('ca-code')?.value.trim();
  const name = document.getElementById('ca-name')?.value.trim();
  const cat = document.getElementById('ca-cat')?.value;
  const tipo = document.getElementById('ca-tipo')?.value || 'ACTIVO';
  const unit = document.getElementById('ca-unit')?.value.trim() || 'und';
  const price = parseFloat(document.getElementById('ca-price')?.value) || 0;
  const detalle = document.getElementById('ca-detalle')?.value.trim() || '';
  const sortOrder = parseInt(document.getElementById('ca-sort')?.value, 10);
  if (!id || !code || !name || !cat) {
    toast('ID, código y nombre son obligatorios', 'red');
    return;
  }
  try {
    loadingStart();
    if (isNew) {
      await API.createCatalogItem({
        id,
        code,
        name,
        cat,
        tipo,
        unit,
        price,
        detalle,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 9999,
      });
      toast('Ítem creado', 'cyan');
    } else {
      await API.updateCatalogItem(id, {
        code,
        name,
        cat,
        tipo,
        unit,
        price,
        detalle,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 9999,
      });
      toast('Ítem actualizado', 'cyan');
    }
    closeModal();
    await initCatalog();
    renderCatalog();
    await loadCatalogTable();
  } catch (e) {
    toast(e.message || 'Error', 'red');
  } finally {
    loadingDone();
  }
}

async function confirmDeleteCatalogItem(it) {
  if (!confirm(`¿Eliminar "${it.name}" (${it.id}) del catálogo?`)) return;
  try {
    loadingStart();
    await API.deleteCatalogItem(it.id);
    toast('Ítem eliminado', 'amber');
    await initCatalog();
    renderCatalog();
    await loadCatalogTable();
  } catch (e) {
    toast(e.message || 'Error', 'red');
  } finally {
    loadingDone();
  }
}

window.loadCatalogTable = loadCatalogTable;
window.openCatalogItemModal = openCatalogItemModal;
window.submitCatalogItemForm = submitCatalogItemForm;
