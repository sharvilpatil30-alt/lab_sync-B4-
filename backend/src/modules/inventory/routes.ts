import { Router, Request, Response } from 'express';
import { pool } from '../../config/postgres.js';

export const inventoryRouter: Router = Router();

const handle = (
  fn: (req: Request, res: Response) => Promise<void>
) => (req: Request, res: Response) => {
  fn(req, res).catch((error) => {
    console.error('[Inventory API]', error);
    res.status(500).json({
      success: false,
      message: 'Database operation failed'
    });
  });
};

const batchesQuery = `
  SELECT
    b.id AS batch_id,
    l.lab_code,
    l.name AS lab_name,
    c.name AS category,
    m.brand,
    m.model_name,
    s.name AS supplier_name,
    b.register_sr_no,
    b.purchase_date,
    b.reference_no,
    b.quantity_original,
    b.quantity_current,
    b.unit_rate,
    b.total_cost,
    b.status,
    b.source_file,
    b.source_page,
    b.source_description
  FROM purchase_batches b
  JOIN labs l ON l.id = b.acquisition_lab_id
  JOIN equipment_models m ON m.id = b.model_id
  JOIN equipment_categories c ON c.id = m.category_id
  LEFT JOIN suppliers s ON s.id = b.supplier_id
`;

inventoryRouter.get('/batches', handle(async (req, res) => {
  const { rows } = await pool.query(
    batchesQuery + ' ORDER BY l.lab_code, b.source_file, b.source_page'
  );

  const filtered = rows.filter((r) =>
    (!req.query.lab_code || r.lab_code === req.query.lab_code) &&
    (!req.query.brand || r.brand?.toLowerCase() === String(req.query.brand).toLowerCase()) &&
    (!req.query.status || r.status?.toLowerCase() === String(req.query.status).toLowerCase()) &&
    (!req.query.search || JSON.stringify(r).toLowerCase().includes(String(req.query.search).toLowerCase()))
  );

  res.json({ success: true, count: filtered.length, data: filtered });
}));

inventoryRouter.get('/batches/:id', handle(async (req, res) => {
  const { rows } = await pool.query(
    batchesQuery + ' WHERE b.id = $1',
    [req.params.id]
  );

  if (!rows.length) {
    res.status(404).json({ success: false, message: 'Batch not found' });
    return;
  }

  res.json({ success: true, data: rows[0] });
}));

inventoryRouter.get('/models', handle(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT m.id AS model_id, c.name AS category_name,
           m.category_id, m.brand, m.model_name,
           m.config_key AS configuration_summary
    FROM equipment_models m
    JOIN equipment_categories c ON c.id = m.category_id
    ORDER BY c.name, m.model_name
  `);

  const filtered = rows.filter((r) =>
    (!req.query.brand || r.brand?.toLowerCase().includes(String(req.query.brand).toLowerCase())) &&
    (!req.query.search || JSON.stringify(r).toLowerCase().includes(String(req.query.search).toLowerCase()))
  );

  res.json({ success: true, count: filtered.length, data: filtered });
}));

inventoryRouter.get('/models/:id', handle(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.*, c.name AS category_name
     FROM equipment_models m
     JOIN equipment_categories c ON c.id = m.category_id
     WHERE m.id = $1`,
    [req.params.id]
  );

  if (!rows.length) {
    res.status(404).json({ success: false, message: 'Model not found' });
    return;
  }

  res.json({ success: true, data: rows[0] });
}));

inventoryRouter.get('/categories', handle(async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT c.id AS category_id, c.name AS category_name,
           COUNT(m.id)::int AS total_models
    FROM equipment_categories c
    LEFT JOIN equipment_models m ON m.category_id = c.id
    GROUP BY c.id, c.name
    ORDER BY c.name
  `);

  res.json({ success: true, count: rows.length, data: rows });
}));

inventoryRouter.get('/labs', handle(async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT l.id, l.lab_code, l.name AS lab_name,
           l.capacity, l.investment,
           COUNT(b.id)::int AS total_batches,
           COALESCE(SUM(b.quantity_original), 0)::int AS total_original_qty,
           COALESCE(SUM(b.quantity_current), 0)::int AS total_current_qty,
           COALESCE(SUM(b.total_cost), 0)::numeric AS total_investment
    FROM labs l
    LEFT JOIN purchase_batches b ON b.acquisition_lab_id = l.id
    GROUP BY l.id
    ORDER BY l.lab_code
  `);

  res.json({ success: true, count: rows.length, data: rows });
}));

inventoryRouter.get('/summary', handle(async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM purchase_batches)::int AS total_batches,
      (SELECT COUNT(*) FROM equipment_models)::int AS total_models,
      (SELECT COUNT(*) FROM equipment_categories)::int AS total_categories,
      (SELECT COUNT(*) FROM labs)::int AS total_labs,
      (SELECT COUNT(*) FROM resources)::int AS total_bookable_resources,
      COALESCE(SUM(quantity_original), 0)::int AS total_original_quantity,
      COALESCE(SUM(quantity_current), 0)::int AS total_current_quantity,
      COALESCE(SUM(total_cost), 0)::numeric AS total_investment
    FROM purchase_batches
  `);

  res.json({ success: true, data: rows[0] });
}));

inventoryRouter.get('/equipment', handle(async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT r.id, r.label, r.state, r.serial_no,
           r.version, l.lab_code, l.name AS lab_name,
           r.batch_id
    FROM resources r
    JOIN labs l ON l.id = r.lab_id
    ORDER BY l.lab_code, r.label
  `);

  res.json({ success: true, count: rows.length, data: rows });
}));

inventoryRouter.get('/equipment/:id', handle(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM resources WHERE id = $1`,
    [req.params.id]
  );

  if (!rows.length) {
    res.status(404).json({ success: false, message: 'Resource not found' });
    return;
  }

  res.json({ success: true, data: rows[0] });
}));

inventoryRouter.get('/', handle(async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM purchase_batches)::int AS total_batches,
      (SELECT COUNT(*) FROM equipment_models)::int AS total_models,
      (SELECT COUNT(*) FROM labs)::int AS total_labs,
      (SELECT COUNT(*) FROM resources)::int AS total_equipment
  `);

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary: rows[0],
    equipment: [],
    message: 'Historical inventory is stored in Supabase. Operational equipment requires verification.'
  });
}));

// Historical inventory modifications require authenticated,
// validated and audited administrative endpoints.
inventoryRouter.use((_req, res) => {
  res.status(405).json({
    success: false,
    message: 'Inventory modifications are disabled pending administrative authorization.'
  });
});
