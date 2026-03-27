/* ── ZGROUP UI Helpers ── */

/* ── Currency ── */
let _currency = 'USD';
let _exchangeRate = 3.75;

function sym()  { return _currency === 'USD' ? '$' : 'S/'; }
function disp(v){ return _currency === 'USD' ? (v||0) : (v||0) * _exchangeRate; }
function mf(v) {
  return sym() + ' ' + Number(disp(v))
    .toLocaleString('es-PE', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function setCurrency(c) {
  _currency = c;
  const uBtn = document.getElementById('btn-usd');
  const pBtn = document.getElementById('btn-pen');
  if (c === 'USD') {
    uBtn.style.cssText = 'padding:2px 7px;border-radius:4px;font-family:JetBrains Mono,monospace;font-size:11px;font-weight:700;cursor:pointer;border:1px solid rgba(0,212,255,.4);background:rgba(0,212,255,.14);color:var(--cyan);transition:all .15s';
    pBtn.style.cssText = 'padding:2px 7px;border-radius:4px;font-family:JetBrains Mono,monospace;font-size:11px;font-weight:700;cursor:pointer;border:1px solid transparent;background:transparent;color:var(--muted);transition:all .15s';
    document.getElementById('tc-row').style.display = 'none';
  } else {
    pBtn.style.cssText = 'padding:2px 7px;border-radius:4px;font-family:JetBrains Mono,monospace;font-size:11px;font-weight:700;cursor:pointer;border:1px solid rgba(0,232,122,.35);background:rgba(0,232,122,.12);color:var(--green);transition:all .15s';
    uBtn.style.cssText = 'padding:2px 7px;border-radius:4px;font-family:JetBrains Mono,monospace;font-size:11px;font-weight:700;cursor:pointer;border:1px solid transparent;background:transparent;color:var(--muted);transition:all .15s';
    document.getElementById('tc-row').style.display = 'flex';
  }
  renderItems();
  compute();
}
function setExchangeRate(v) { _exchangeRate = parseFloat(v) || 3.75; renderItems(); compute(); }

/* ── Toast ── */
function toast(msg, type = 'green') {
  const el = document.getElementById('toast');
  const s  = {
    green: ['rgba(0,232,122,.45)','rgba(0,232,122,.15)','#00E87A'],
    cyan:  ['rgba(0,212,255,.45)','rgba(0,212,255,.13)','#00D4FF'],
    red:   ['rgba(255,61,87,.45)','rgba(255,61,87,.13)','#FF3D57'],
    amber: ['rgba(255,176,64,.45)','rgba(255,176,64,.13)','#FFB040'],
  }[type] || [];
  el.style.border = `1px solid ${s[0]}`;
  el.style.background = s[1];
  el.style.color = s[2];
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── Loading bar ── */
function loadingStart() {
  const lb = document.getElementById('loading-bar');
  if (lb) { lb.style.width = '40%'; lb.style.opacity = '1'; }
}
function loadingDone() {
  const lb = document.getElementById('loading-bar');
  if (lb) {
    lb.style.width = '100%';
    setTimeout(() => { lb.style.opacity = '0'; lb.style.width = '0'; }, 300);
  }
}

/* ── Accordion ── */
function toggleMod(id) {
  const body  = document.getElementById(id);
  const arrow = document.getElementById('arrow-' + id);
  if (!body) return;
  if (body.style.maxHeight === '0px' || body.style.maxHeight === '0') {
    body.style.maxHeight = '9999px'; body.style.opacity = '1';
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  } else {
    body.style.maxHeight = '0px'; body.style.opacity = '0';
    if (arrow) arrow.style.transform = 'rotate(-90deg)';
  }
}

/* ── Modal ── */
function openModal()  { document.getElementById('modal-overlay').style.display = 'flex'; }
function closeModal() { document.getElementById('modal-overlay').style.display = 'none';  }

/* ── DOM helpers ── */
function set(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function getNum(id, def = 0) { return parseFloat(document.getElementById(id)?.value) || def; }
function setVal(id, v) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = v;
  if (el.tagName === 'SELECT') {
    el.value = v;
    if (el.value != String(v)) {
      let best = null, bd = 1e9;
      [...el.options].forEach(o => {
        const d = Math.abs(parseFloat(o.value) - v);
        if (d < bd) { bd = d; best = o.value; }
      });
      if (best) el.value = best;
    }
  }
}

/* ── uid ── */
function uid() {
  return 'z' + Math.random().toString(36).substr(2, 8) + Date.now().toString(36);
}

/* ── Venta adj type toggle ── */
function setAdjType(t, doSave = true) {
  window._adjType = t;
  const bM  = document.getElementById('btn-margin');
  const bD  = document.getElementById('btn-discount');
  const lbl = document.getElementById('adj-label');
  if (t === 'margin') {
    bM.style.cssText = 'padding:4px;font-size:11px;letter-spacing:1px;border:1px solid rgba(0,212,255,.4);background:rgba(0,212,255,.08);color:var(--cyan);font-family:Rajdhani,sans-serif;font-weight:600;border-radius:6px;cursor:pointer';
    bD.style.cssText = 'padding:4px;font-size:11px;letter-spacing:1px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:Rajdhani,sans-serif;font-weight:600;border-radius:6px;cursor:pointer';
    lbl.textContent  = 'MARGEN DE SEGURIDAD (%)';
  } else {
    bD.style.cssText = 'padding:4px;font-size:11px;letter-spacing:1px;border:1px solid rgba(0,212,255,.4);background:rgba(0,212,255,.08);color:var(--cyan);font-family:Rajdhani,sans-serif;font-weight:600;border-radius:6px;cursor:pointer';
    bM.style.cssText = 'padding:4px;font-size:11px;letter-spacing:1px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:Rajdhani,sans-serif;font-weight:600;border-radius:6px;cursor:pointer';
    lbl.textContent  = 'DESCUENTO COMERCIAL (%)';
  }
  if (doSave) saveAndCompute();
}

/* ── Amortization table ── */
function toggleAmort() {
  const t   = document.getElementById('amort-table');
  const btn = document.getElementById('amort-btn');
  if (t.style.display === 'none') {
    t.style.display = 'block';
    btn.innerHTML   = btn.innerHTML.replace('▼', '▲');
    const p = curP();
    if (!p) return;
    const base      = p.items.reduce((s, i) => s + (i.subtotal || 0), 0);
    const adj       = p.adjPct || 0;
    const ventaTotal = p.adjType === 'margin' ? base * (1 + adj / 100) : base * (1 - adj / 100);
    const totalFin  = ventaTotal + (p.lpForm || 350);
    const tea       = (p.lpTeaBanco || 7) / 100;
    const tem       = tea > 0 ? Math.pow(1 + tea, 1 / 12) - 1 : 0;
    const n         = Math.max(1, p.lpN || 24);
    const cuota     = totalFin > 0 && n > 0
      ? (tem > 0 ? totalFin * tem / (1 - Math.pow(1 + tem, -n)) : totalFin / n)
      : 0;
    renderAmortTable(totalFin, tem, n, cuota);
  } else {
    t.style.display = 'none';
    btn.innerHTML   = btn.innerHTML.replace('▲', '▼');
  }
}

function renderAmortTable(pv, tem, n, cuota) {
  let html = `<table style="width:100%;border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:10px">
  <thead><tr style="background:var(--card);color:var(--muted);position:sticky;top:0">
    <th style="padding:4px;text-align:center;border:1px solid var(--border)">N°</th>
    <th style="padding:4px;text-align:right;border:1px solid var(--border)">SALDO INI.</th>
    <th style="padding:4px;text-align:right;border:1px solid var(--border)">INTERÉS</th>
    <th style="padding:4px;text-align:right;border:1px solid var(--border)">AMORT.</th>
    <th style="padding:4px;text-align:right;border:1px solid var(--border)">CUOTA</th>
  </tr></thead><tbody>`;
  let saldo = pv;
  for (let i = 1; i <= n; i++) {
    const int = saldo * tem, amort = cuota - int, sAntes = saldo;
    const isL = i === n;
    saldo = Math.max(0, saldo - amort);
    html += `<tr style="background:${i%2===0?'var(--card)':'var(--surface)'};color:${isL?'var(--green)':'var(--text)'}">
      <td style="padding:3px 5px;text-align:center;border:1px solid #1E3050;color:var(--muted)">${i}</td>
      <td style="padding:3px 5px;text-align:right;border:1px solid #1E3050">${mf(sAntes)}</td>
      <td style="padding:3px 5px;text-align:right;border:1px solid #1E3050;color:var(--amber)">${mf(int)}</td>
      <td style="padding:3px 5px;text-align:right;border:1px solid #1E3050">${mf(amort)}</td>
      <td style="padding:3px 5px;text-align:right;border:1px solid #1E3050;font-weight:700;color:${isL?'var(--green)':'var(--cyan)'}">${mf(i===n?cuota:cuota)}</td>
    </tr>`;
  }
  document.getElementById('amort-table').innerHTML = html + '</tbody></table>';
}
