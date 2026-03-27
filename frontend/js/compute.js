/* ── ZGROUP Financial Compute Engine ────────────────────────────────
   Pure computation: takes a project object, updates the DOM.
   No API calls here — only math + set().
─────────────────────────────────────────────────────────────────── */
function compute() {
  const p = curP();
  if (!p) return;

  /* InfoBar BASE (total lista) alineado con footer Módulo 2 */
  if (typeof computeTotals === 'function') computeTotals();

  const baseActivos = p.items.filter(i => i.tipo !== 'CONSUMIBLE').reduce((s, i) => s + (i.subtotal || 0), 0);
  const baseCons    = p.items.filter(i => i.tipo === 'CONSUMIBLE').reduce((s, i) => s + (i.subtotal || 0), 0);
  const base        = baseActivos + baseCons;

  // ── M1: VENTA DIRECTA ────────────────────────────────────────────
  const adj     = p.adjPct || 0;
  let ventaAdj, ventaTotal;
  if ((p.adjType || 'margin') === 'margin') {
    ventaAdj   = base * (adj / 100);
    ventaTotal = base + ventaAdj;
  } else {
    ventaAdj   = base * (adj / 100);
    ventaTotal = base - ventaAdj;
  }

  set('v-base',      mf(base));
  set('v-adj-label', ((p.adjType==='margin') ? `+ Seg. (${adj}%)` : `− Dto. (${adj}%)`) + ':');
  const adjEl = document.getElementById('v-adj-val');
  if (adjEl) {
    adjEl.textContent = (p.adjType === 'margin' ? '+ ' : '− ') + mf(ventaAdj);
    adjEl.style.color = p.adjType === 'margin' ? 'var(--amber)' : 'var(--red)';
  }
  set('v-total',     mf(ventaTotal));
  set('v-total-hdr', mf(ventaTotal));

  // ── M2: CORTO PLAZO ──────────────────────────────────────────────
  const cpPlazo    = Math.max(1, p.cpPlazo || 6);
  const cpVida     = Math.max(1, p.cpVida  || 60);
  const cpOp       = p.cpOp   || 5;
  const cpRoa      = p.cpRoa  || 35;
  const cpMerma    = p.cpMerma || 2;

  const cpDep      = ventaTotal / cpVida;
  const cpMermaVal = (ventaTotal * cpMerma / 100) / cpPlazo;
  const cpGop      = ventaTotal * (cpOp / 100) / 12;
  const cpConsRec  = baseCons > 0 ? baseCons / cpPlazo : 0;
  const cpRoaVal   = ventaTotal * (cpRoa / 100) / 12;
  const cpRentaVal = cpDep + cpMermaVal + cpGop + cpConsRec + cpRoaVal;
  const cpGanancia = cpRoaVal;
  const cpPE       = cpGanancia > 0 ? Math.ceil(ventaTotal / cpGanancia) : 0;

  set('cp-base',     mf(ventaTotal));
  set('cp-dep',      mf(cpDep));
  set('cp-merma-val',mf(cpMermaVal));
  set('cp-gop',      mf(cpGop));
  set('cp-roa-val',  mf(cpRoaVal));
  set('cp-renta',    mf(cpRentaVal));
  set('cp-ganancia', mf(cpGanancia));
  set('cp-pe',       cpPE > 0 ? cpPE + ' m' : '— m');
  set('cp-renta-hdr',mf(cpRentaVal) + '/m');
  set('cp-vida-lbl', cpVida); set('cp-merma-lbl', cpMerma); set('cp-plazo-lbl', cpPlazo);
  set('cp-op-lbl',   cpOp);   set('cp-roa-lbl',   cpRoa);   set('cp-cons-plazo', cpPlazo);
  const rowCons = document.getElementById('row-cons-cp');
  if (rowCons) rowCons.style.display = baseCons > 0 ? 'flex' : 'none';
  set('cp-cons', mf(cpConsRec));
  set('ib-cp',   mf(cpRentaVal) + '/mes');

  // ── M3: LARGO PLAZO ──────────────────────────────────────────────
  const lpNPrestamo = Math.max(1, p.lpN          || 24);
  const lpNContrato = Math.max(lpNPrestamo, p.lpNContrato || 36);
  const lpVida      = Math.max(1, p.lpVida        || 120);
  const lpTeaBanco  = (p.lpTeaBanco || 7)  / 100;
  const lpTeaCot    = (p.lpTeaCot   || 15) / 100;
  const lpOp        = p.lpOp   || 5;
  const lpForm      = p.lpForm  || 350;
  const lpPostPct   = (p.lpPostPct  || 80) / 100;
  const lpFondoRep  = (p.lpFondoRep || 5)  / 100;

  const totalFin    = ventaTotal + lpForm;
  const temBanco    = lpTeaBanco > 0 ? Math.pow(1 + lpTeaBanco, 1 / 12) - 1 : 0;
  const temCot      = lpTeaCot   > 0 ? Math.pow(1 + lpTeaCot,   1 / 12) - 1 : 0;

  let cuotaBanco = 0, cuotaCliente = 0;
  if (totalFin > 0 && lpNPrestamo > 0) {
    cuotaBanco   = temBanco > 0 ? totalFin * temBanco / (1 - Math.pow(1 + temBanco, -lpNPrestamo)) : totalFin / lpNPrestamo;
    cuotaCliente = temCot   > 0 ? totalFin * temCot   / (1 - Math.pow(1 + temCot,   -lpNPrestamo)) : totalFin / lpNPrestamo;
  }

  const lpSpreadVal = cuotaCliente - cuotaBanco;
  const lpGop       = ventaTotal * (lpOp / 100) / 12;
  const lpRentaF1   = cuotaCliente + lpGop;
  const lpGanF1     = lpSpreadVal;
  const lpTotalGanF1= lpGanF1 * lpNPrestamo;
  const lpNF2       = Math.max(0, lpNContrato - lpNPrestamo);
  const contrUmbral = lpVida * 0.8;
  const activarFondo= lpNContrato > contrUmbral;
  const lpFondoMensual = activarFondo ? ventaTotal * (lpFondoRep / 12) : 0;
  const lpRentaF2   = lpRentaF1 * lpPostPct;
  const lpGanF2     = lpRentaF2 - lpGop - lpFondoMensual;
  const lpTotalGanF2= lpGanF2 * lpNF2;
  const lpTotalCiclo= lpTotalGanF1 + lpTotalGanF2;
  const lpPE        = lpGanF1 > 0 ? Math.ceil(lpForm / lpGanF1) : 0;

  set('lp-base',       mf(ventaTotal));
  set('lp-capital',    mf(ventaTotal));
  set('lp-form-disp',  mf(lpForm));
  set('lp-total-fin',  mf(totalFin));
  set('lp-cuota-banco',mf(cuotaBanco));
  set('lp-gop',        mf(lpGop));
  set('lp-spread',     mf(lpSpreadVal));
  set('lp-renta',      mf(lpRentaF1));
  set('lp-renta-f2',   mf(lpRentaF2));
  set('lp-gop-f2',     mf(lpGop));
  set('lp-ganancia-f2',mf(lpGanF2));
  set('lp-ganancia',   mf(lpGanF1));
  set('lp-kpi-f2',     mf(lpGanF2));
  set('lp-total-ciclo',mf(lpTotalCiclo));
  set('lp-pe',         lpPE > 0 ? lpPE + ' m' : '< 1 m');
  set('lp-kpi-banco',  mf(cuotaBanco));
  set('lp-renta-hdr',  mf(lpRentaF1) + '/m F1');
  set('lp-tea-lbl',    p.lpTeaBanco || 7);  set('lp-op-lbl',     lpOp);
  set('lp-cot-lbl',    p.lpTeaCot  || 15);  set('lp-banco-lbl2', p.lpTeaBanco || 7);
  set('lp-post-pct-lbl', p.lpPostPct || 80);
  set('lp-f1-end',     lpNPrestamo);         set('lp-f2-start',   lpNPrestamo + 1);
  set('lp-f2-end',     lpNContrato);
  set('lp-f1-dur-lbl', lpNPrestamo + 'm');  set('lp-f2-dur-lbl', lpNF2 + 'm');
  set('lp-ciclo-dur-lbl', lpNContrato + 'm total');
  set('lp-umbral-lbl', Math.round(contrUmbral));
  set('lp-fondo-lbl',  p.lpFondoRep || 5);  set('lp-fondo-val',  mf(lpFondoMensual));

  const rowFondo = document.getElementById('row-fondo-rep');
  if (rowFondo) rowFondo.style.display = activarFondo ? 'flex' : 'none';
  const alertaVida = document.getElementById('lp-vida-alerta');
  if (alertaVida) {
    alertaVida.style.display = activarFondo ? 'block' : 'none';
    if (activarFondo) alertaVida.textContent = `⚠ Contrato (${lpNContrato}m) supera el 80% de vida útil (${Math.round(contrUmbral)}m). Fondo reposición ${p.lpFondoRep||5}% = ${mf(lpFondoMensual)}/mes.`;
  }

  // Timeline
  const f1Pct = (lpNPrestamo / lpNContrato) * 100;
  const el1 = document.getElementById('tl-phase1');
  const el2 = document.getElementById('tl-phase2');
  const mrk  = document.getElementById('tl-marker');
  if (el1) el1.style.width = f1Pct + '%';
  if (el2) { el2.style.left = f1Pct + '%'; el2.style.width = (100 - f1Pct) + '%'; }
  if (mrk)  mrk.style.left = 'calc(' + f1Pct + '% - 1px)';
  set('tl-phase1-label', `FASE 1: ${lpNPrestamo}m — CON DEUDA`);
  set('tl-phase2-label', lpNF2 > 0 ? `FASE 2: ${lpNF2}m — ACTIVO LIBRE` : '');
  set('tl-end-label', 'MES ' + lpNContrato);
  set('ib-lp', mf(lpRentaF1) + '/mes');

  // ── M4: ESTACIONALIDAD ───────────────────────────────────────────
  const estOp    = Math.max(1, p.estOp    || 8);
  const estSb    = Math.max(1, p.estSb    || 4);
  const estSeg   = p.estSeguro || 1;
  const estSbPct = (p.estSbPct || 35) / 100;

  const estSeguroVal = ventaTotal * (estSeg / 100) / 12;
  const estGestion   = ventaTotal * 0.05 / 12;
  const estCostoMin  = cuotaBanco + estSeguroVal + estGestion;
  const estRentaSb   = lpRentaF1 * estSbPct;
  const alertaEstEl  = document.getElementById('est-alerta-sb');
  if (alertaEstEl) {
    if (ventaTotal > 0 && estRentaSb < estCostoMin) {
      alertaEstEl.style.display = 'block';
      alertaEstEl.textContent = `⚠ STANDBY ${mf(estRentaSb)}/mes < Costo mínimo ${mf(estCostoMin)}/mes. Mínimo recomendado: ${Math.ceil(estCostoMin / lpRentaF1 * 100)}%.`;
    } else { alertaEstEl.style.display = 'none'; }
  }

  const estIngFull  = lpRentaF1 * estOp;
  const estIngSb    = estRentaSb * estSb;
  const estIngTotal = estIngFull + estIngSb;
  const estGasTot   = (cuotaBanco + lpGop) * estOp + cuotaBanco * estSb;
  const estGanTotal = estIngTotal - estGasTot;
  const estMargen   = estIngTotal > 0 ? (estGanTotal / estIngTotal * 100) : 0;

  set('est-renta-full-val', mf(lpRentaF1));  set('est-renta-sb',    mf(estRentaSb));
  set('est-cuota-banco',    mf(cuotaBanco));  set('est-seguro-val',  mf(estSeguroVal));
  set('est-gestion',        mf(estGestion));  set('est-costo-min',   mf(estCostoMin));
  set('est-ingreso-full',   mf(estIngFull));  set('est-ingreso-sb',  mf(estIngSb));
  set('est-ingreso-total',  mf(estIngTotal)); set('est-ganancia-total', mf(estGanTotal));
  set('est-margen-pct',     estMargen.toFixed(1) + '%');
  set('est-renta-hdr',      mf(estIngTotal) + '/año');
  set('est-op-lbl', estOp); set('est-sb-lbl', estSb); set('est-seg-lbl', estSeg);
  set('est-sb-pct-lbl', Math.round(p.estSbPct || 35));

  // 5-year analytical table
  _render5YearTable(p, lpRentaF1, lpRentaF2, lpGanF1, lpGanF2,
    cuotaBanco, lpGop, lpFondoMensual, lpNPrestamo, lpNContrato,
    lpNF2, estOp, estSb, estSbPct, activarFondo);

  // ── M5: COMPARATIVA GERENCIAL ────────────────────────────────────
  const period      = Math.max(1, p.cmpPeriod || 24);
  const f1InPeriod  = Math.min(period, lpNPrestamo);
  const f2InPeriod  = Math.max(0, period - lpNPrestamo);
  const lpTotInP    = lpGanF1 * f1InPeriod + lpGanF2 * f2InPeriod;
  const seasonalR   = (estOp + estSb * estSbPct) / 12;
  const lpTotalSeas = lpTotalCiclo * seasonalR;
  const lpMasBarato = lpRentaF1 <= cpRentaVal;

  set('cmp-renta-cp',   mf(cpRentaVal));        set('cmp-renta-lp', mf(lpRentaF1) + ' F1');
  set('cmp-gan-cp',     mf(cpGanancia));         set('cmp-gan-lp-f1', mf(lpGanF1) + '/m × ' + lpNPrestamo + 'm');
  set('cmp-gan-lp-f2',  mf(lpGanF2) + '/m × ' + lpNF2 + 'm');
  set('cmp-cap-cp',     mf(ventaTotal));
  set('cmp-pe-cp',      cpPE > 0 ? cpPE + ' m' : '—');
  set('cmp-pe-lp',      lpPE > 0 ? lpPE + ' m' : '< 1 m');
  set('cmp-total-cp',   mf(cpGanancia * period));
  set('cmp-total-lp',   mf(lpTotInP));
  set('cmp-ciclo-lp',   mf(lpTotalSeas) + ' (' + lpNContrato + 'm, est.)');
  set('cmp-p-lbl',      period);

  const alertaCmp = document.getElementById('cmp-alerta');
  if (alertaCmp) {
    if (ventaTotal > 0 && !lpMasBarato) {
      alertaCmp.style.display = 'block';
      alertaCmp.textContent   = `⚠ Renta F1 LP (${mf(lpRentaF1)}) es ${mf(lpRentaF1 - cpRentaVal)}/mes más cara que CP. Reduce la Tasa de Cotización LP.`;
    } else { alertaCmp.style.display = 'none'; }
  }

  let v = '';
  if (ventaTotal === 0) {
    v = '⚡ Añade partidas al presupuesto para ver el análisis comparativo.';
  } else if (lpMasBarato) {
    const roiAnual = cpGanancia > 0 ? ((cpGanancia * 12 / ventaTotal) * 100).toFixed(1) : '—';
    v = `✅ ESTRATEGIA ÓPTIMA: LP F1 es ${mf(cpRentaVal - lpRentaF1)}/mes más barata → cliente preferirá LP.\n\n`
      + `📊 CICLO (${lpNContrato}m): F1×${lpNPrestamo}m = ${mf(lpTotalGanF1)} | F2×${lpNF2}m = ${mf(lpTotalGanF2)} | TOTAL = ${mf(lpTotalCiclo)}\n\n`
      + `💡 CP inmoviliza ${mf(ventaTotal)} con ROI ${roiAnual}%/año. LP opera con $0 capital propio.`
      + (activarFondo ? ` Fondo reposición activado: ${mf(lpFondoMensual)}/mes.` : '');
  } else {
    v = `⚠ LP F1 es ${mf(lpRentaF1 - cpRentaVal)}/mes más cara que CP. Reduce la Tasa de Cotización LP.`;
  }
  document.getElementById('cmp-veredicto').textContent = v;
}

/* ── 5-year table (Regla de Oro) ── */
function _render5YearTable(p, lpRentaF1, lpRentaF2, lpGanF1, lpGanF2,
  cuotaBanco, lpGop, lpFondoMensual, lpNPrestamo, lpNContrato,
  lpNF2, estOp, estSb, estSbPct, activarFondo) {

  const tbodyEl = document.getElementById('est-tabla-body');
  const totalEl = document.getElementById('est-tabla-total');
  if (!tbodyEl) return;

  tbodyEl.innerHTML = '';
  let cumAcum = 0, totIng = 0, totBanco = 0, totGop = 0, totUtil = 0;
  const FIXED_YEARS = 5;

  for (let yr = 1; yr <= FIXED_YEARS; yr++) {
    const mStart = (yr - 1) * 12 + 1;
    const mEnd   = yr * 12;
    const f1Months = Math.max(0, Math.min(mEnd, lpNPrestamo) - Math.max(mStart - 1, 0));
    const f2Months = Math.max(0, Math.min(mEnd, lpNContrato)  - Math.max(mStart - 1, lpNPrestamo));
    const activeMonths = f1Months + f2Months;

    const f1FullM = f1Months * (estOp / 12);
    const f1SbM   = f1Months * (estSb / 12);
    const f2FullM = f2Months * (estOp / 12);
    const f2SbM   = f2Months * (estSb / 12);
    const ingBruto = f1FullM * lpRentaF1 + f1SbM * (lpRentaF1 * estSbPct)
                   + f2FullM * lpRentaF2  + f2SbM * (lpRentaF2  * estSbPct);
    const pagoBanco = cuotaBanco * f1Months;
    const gopYear   = lpGop * activeMonths + (activarFondo ? lpFondoMensual * f2Months : 0);
    const utilNeta  = ingBruto - pagoBanco - gopYear;
    cumAcum += utilNeta; totIng += ingBruto; totBanco += pagoBanco; totGop += gopYear; totUtil += utilNeta;

    const isAllF1  = f1Months >= 12;
    const isAllF2  = f2Months >= 12;
    const isTrans  = f1Months > 0 && f2Months > 0;
    const zebraClass = yr % 2 === 0 ? 'est-row-even' : 'est-row-odd';

    let phaseIcon = '⚙️', phaseLabel = 'F1 — con deuda', yrColor = 'var(--amber)', rowBorder = '';
    if (isTrans)  { phaseIcon = '🔄'; phaseLabel = 'F1→F2 transición'; yrColor = 'var(--cyan)';  rowBorder = 'border-top:3px solid var(--cyan)'; }
    if (isAllF2)  { phaseIcon = '✅'; phaseLabel = 'F2 — activo libre'; yrColor = 'var(--green)'; rowBorder = 'border-top:2px solid var(--green)'; }

    const bancoColor  = pagoBanco > 0 ? 'var(--red)'   : 'var(--green)';
    const bancoText   = pagoBanco > 0 ? mf(pagoBanco)  : '$0.00';
    const bancoIcon   = pagoBanco > 0 ? '🏦' : '✅';
    const utilColor   = utilNeta >= 0 ? (isAllF2 ? 'var(--green)' : 'var(--text)') : 'var(--red)';
    const utilIcon    = utilNeta >= 0 ? '✅' : '❌';
    const acumColor   = cumAcum >= 0  ? 'var(--amber)'  : 'var(--red)';

    const tr = document.createElement('tr');
    tr.className = zebraClass;
    if (rowBorder) tr.style.cssText = rowBorder;
    tr.innerHTML =
      `<td class="col-year" style="color:${yrColor}">
        <div style="font-weight:700;font-size:13px">AÑO ${yr} ${phaseIcon}</div>
        <div style="font-size:9px;color:var(--muted)">m${mStart}–${mEnd}</div>
        <div style="font-size:9px;color:${yrColor};margin-top:2px">${phaseLabel}</div>
      </td>
      <td class="col-num" style="color:var(--text)">${mf(ingBruto)}</td>
      <td class="col-num" style="color:${bancoColor};font-weight:${pagoBanco===0?'700':'400'}">${bancoIcon} ${bancoText}</td>
      <td class="col-num" style="color:var(--muted)">${mf(gopYear)}</td>
      <td class="col-num" style="color:${utilColor};font-weight:${isAllF2?'700':'500'}">${utilIcon} ${mf(utilNeta)}</td>
      <td class="col-num" style="color:${acumColor};font-weight:700">${mf(cumAcum)}</td>`;
    tbodyEl.appendChild(tr);

    if (isTrans) {
      const pct  = lpGanF1 > 0 ? ((lpGanF2 / lpGanF1 - 1) * 100).toFixed(0) : '∞';
      const trB  = document.createElement('tr');
      trB.style.cssText = 'background:rgba(0,229,255,.08)';
      trB.innerHTML = `<td colspan="6" style="padding:5px 12px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--cyan);border-top:1px dashed var(--cyan)">
        🏦 MES ${lpNPrestamo}: BANCO LIQUIDADO — cuota desaparece. Utilidad: ${mf(lpGanF1)}→${mf(lpGanF2)}/mes (+${pct}%)</td>`;
      tbodyEl.appendChild(trB);
    }
    if (isAllF2 && pagoBanco === 0) {
      const prevWasF2 = yr > 1 && (((yr - 2) * 12 + 1) > lpNPrestamo);
      if (!prevWasF2) {
        const trF2 = document.createElement('tr');
        trF2.style.cssText = 'background:rgba(0,232,122,.07)';
        trF2.innerHTML = `<td colspan="6" style="padding:5px 12px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--green)">
          ★ PAGO AL BANCO = $0.00 · Activo 100% ZGROUP · Utilidad Neta máxima.</td>`;
        tbodyEl.appendChild(trF2);
      }
    }
  }

  if (totalEl) {
    totalEl.style.display = '';
    set('est-tot-ing',   mf(totIng));   set('est-tot-banco', mf(totBanco));
    set('est-tot-gst',   mf(totGop));   set('est-tot-util',  mf(totUtil));
    set('est-tot-acum',  mf(cumAcum));
  }
}
