const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// ── Helper: map DB row → camelCase project ────────────────────────
function mapProject(row) {
  return {
    id:          row.id,
    name:        row.name,
    odooNumber:  row.odoo_number,
    createdAt:   row.created_at,
    adjType:     row.adj_type,
    adjPct:      parseFloat(row.adj_pct),
    cpPlazo:     parseInt(row.cp_plazo),
    cpVida:      parseInt(row.cp_vida),
    cpOp:        parseFloat(row.cp_op),
    cpRoa:       parseFloat(row.cp_roa),
    cpMerma:     parseFloat(row.cp_merma),
    lpVida:      parseInt(row.lp_vida),
    lpN:         parseInt(row.lp_n),
    lpNContrato: parseInt(row.lp_n_contrato),
    lpTeaBanco:  parseFloat(row.lp_tea_banco),
    lpTeaCot:    parseFloat(row.lp_tea_cot),
    lpOp:        parseFloat(row.lp_op),
    lpForm:      parseFloat(row.lp_form),
    lpPostPct:   parseFloat(row.lp_post_pct),
    lpFondoRep:  parseFloat(row.lp_fondo_rep),
    estOp:       parseInt(row.est_op),
    estSb:       parseInt(row.est_sb),
    estSeguro:   parseFloat(row.est_seguro),
    estSbPct:    parseFloat(row.est_sb_pct),
    cmpPeriod:   parseInt(row.cmp_period),
  };
}

function mapItem(row) {
  return {
    id:        row.id,
    projectId: row.project_id,
    catalogId: row.catalog_id,
    code:      row.code,
    name:      row.name,
    cat:       row.cat,
    tipo:      row.tipo,
    unit:      row.unit,
    unitPrice: parseFloat(row.unit_price),
    qty:       parseFloat(row.qty),
    subtotal:  parseFloat(row.subtotal),
    sortOrder: row.sort_order,
  };
}

function mapPlan(row) {
  return {
    id:        row.id,
    projectId: row.project_id,
    name:      row.name,
    size:      row.size,
    type:      row.mime_type,
    dataUrl:   row.data_url,
  };
}

// ── GET /api/projects ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM projects ORDER BY created_at ASC'
    );
    res.json(rows.map(mapProject));
  } catch (err) { next(err); }
});

// ── POST /api/projects ────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { id, name, odooNumber = '' } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'id and name required' });

    const { rows } = await pool.query(
      `INSERT INTO projects (id, name, odoo_number)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, name, odooNumber]
    );
    res.status(201).json(mapProject(rows[0]));
  } catch (err) { next(err); }
});

// ── GET /api/projects/:id  (full project with items & plans) ──────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const pRes = await pool.query('SELECT * FROM projects WHERE id=$1', [id]);
    if (!pRes.rows.length) return res.status(404).json({ error: 'Project not found' });

    const iRes = await pool.query(
      'SELECT * FROM project_items WHERE project_id=$1 ORDER BY sort_order, created_at',
      [id]
    );
    const plRes = await pool.query(
      'SELECT * FROM project_plans WHERE project_id=$1 ORDER BY created_at',
      [id]
    );

    const project = mapProject(pRes.rows[0]);
    project.items = iRes.rows.map(mapItem);
    project.plans = plRes.rows.map(mapPlan);

    res.json(project);
  } catch (err) { next(err); }
});

// ── PUT /api/projects/:id  (update financial settings) ───────────
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const d = req.body;

    const { rows } = await pool.query(
      `UPDATE projects SET
        name          = COALESCE($2,  name),
        odoo_number   = COALESCE($3,  odoo_number),
        adj_type      = COALESCE($4,  adj_type),
        adj_pct       = COALESCE($5,  adj_pct),
        cp_plazo      = COALESCE($6,  cp_plazo),
        cp_vida       = COALESCE($7,  cp_vida),
        cp_op         = COALESCE($8,  cp_op),
        cp_roa        = COALESCE($9,  cp_roa),
        cp_merma      = COALESCE($10, cp_merma),
        lp_vida       = COALESCE($11, lp_vida),
        lp_n          = COALESCE($12, lp_n),
        lp_n_contrato = COALESCE($13, lp_n_contrato),
        lp_tea_banco  = COALESCE($14, lp_tea_banco),
        lp_tea_cot    = COALESCE($15, lp_tea_cot),
        lp_op         = COALESCE($16, lp_op),
        lp_form       = COALESCE($17, lp_form),
        lp_post_pct   = COALESCE($18, lp_post_pct),
        lp_fondo_rep  = COALESCE($19, lp_fondo_rep),
        est_op        = COALESCE($20, est_op),
        est_sb        = COALESCE($21, est_sb),
        est_seguro    = COALESCE($22, est_seguro),
        est_sb_pct    = COALESCE($23, est_sb_pct),
        cmp_period    = COALESCE($24, cmp_period)
       WHERE id = $1
       RETURNING *`,
      [
        id,
        d.name,
        d.odooNumber,
        d.adjType,
        d.adjPct,
        d.cpPlazo,
        d.cpVida,
        d.cpOp,
        d.cpRoa,
        d.cpMerma,
        d.lpVida,
        d.lpN,
        d.lpNContrato,
        d.lpTeaBanco,
        d.lpTeaCot,
        d.lpOp,
        d.lpForm,
        d.lpPostPct,
        d.lpFondoRep,
        d.estOp,
        d.estSb,
        d.estSeguro,
        d.estSbPct,
        d.cmpPeriod,
      ]
    );

    if (!rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(mapProject(rows[0]));
  } catch (err) { next(err); }
});

// ── DELETE /api/projects/:id ──────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM projects WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Project not found' });
    res.json({ deleted: true, id });
  } catch (err) { next(err); }
});

module.exports = router;
