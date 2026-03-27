const express = require('express');
const { pool } = require('../db');

const router = express.Router();

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

// ── POST /api/projects/:id/plans ──────────────────────────────────
router.post('/:id/plans', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: planId, name, size = 0, type = '', dataUrl = '' } = req.body;

    if (!planId || !name) return res.status(400).json({ error: 'planId and name required' });

    const { rows } = await pool.query(
      `INSERT INTO project_plans (id, project_id, name, size, mime_type, data_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [planId, id, name, size, type, dataUrl]
    );
    res.status(201).json(mapPlan(rows[0]));
  } catch (err) { next(err); }
});

// ── DELETE /api/projects/:id/plans/:planId ────────────────────────
router.delete('/:id/plans/:planId', async (req, res, next) => {
  try {
    const { id, planId } = req.params;
    const { rowCount } = await pool.query(
      'DELETE FROM project_plans WHERE id=$1 AND project_id=$2',
      [planId, id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Plan not found' });
    res.json({ deleted: true, id: planId });
  } catch (err) { next(err); }
});

module.exports = router;
