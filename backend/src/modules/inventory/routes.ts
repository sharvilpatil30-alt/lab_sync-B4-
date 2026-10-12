import { Router, Request, Response } from 'express';
import { pool } from '../../config/postgres.js';
import { campusDb } from '../persistence/database.js';

export const inventoryRouter: Router = Router();

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

// GET /api/v1/inventory/batches
inventoryRouter.get('/batches', async (req: Request, res: Response) => {
  try {
    if (pool.isConnected) {
      try {
        const { rows } = await pool.query(batchesQuery + ' ORDER BY l.lab_code, b.source_file, b.source_page');
        const filtered = rows.filter((r: any) =>
          (!req.query.lab_code || r.lab_code === req.query.lab_code) &&
          (!req.query.brand || r.brand?.toLowerCase() === String(req.query.brand).toLowerCase()) &&
          (!req.query.status || r.status?.toLowerCase() === String(req.query.status).toLowerCase()) &&
          (!req.query.search || JSON.stringify(r).toLowerCase().includes(String(req.query.search).toLowerCase()))
        );
        return res.json({ success: true, count: filtered.length, data: filtered });
      } catch (dbErr) {
        console.warn('[Inventory API] PG batches query failed, using persistence repository:', dbErr);
      }
    }

    // Repository fallback
    const list = Array.from(campusDb.purchaseBatches.values()).map((b) => {
      const lab = campusDb.labs.get(b.acquisition_lab_id);
      const model = campusDb.equipmentModels.get(b.model_id);
      const category = model ? campusDb.equipmentCategories.get(model.category_id) : null;
      const supplier = b.supplier_id ? campusDb.suppliers.get(b.supplier_id) : null;
      return {
        batch_id: b.id,
        lab_code: lab?.lab_code || 'D-01',
        lab_name: lab?.name || 'Department Lab',
        category: category?.name || 'Hardware',
        brand: model?.brand || 'Standard',
        model_name: model?.model_name || 'System Unit',
        supplier_name: supplier?.name || 'Direct OEM',
        register_sr_no: b.register_sr_no,
        purchase_date: b.purchase_date,
        reference_no: b.reference_no,
        quantity_original: b.quantity_original,
        quantity_current: b.quantity_current,
        unit_rate: b.unit_rate,
        total_cost: b.total_cost,
        status: b.status,
        source_file: b.source_file,
        source_page: b.source_page,
        source_description: b.source_description,
      };
    });

    return res.json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    console.error('[Inventory API] Batches error:', err);
    return res.status(500).json({ success: false, message: 'Database operation failed' });
  }
});

// GET /api/v1/inventory/batches/:id
inventoryRouter.get('/batches/:id', async (req: Request, res: Response) => {
  try {
    if (pool.isConnected) {
      try {
        const { rows } = await pool.query(batchesQuery + ' WHERE b.id = $1', [req.params.id]);
        if (rows.length) {
          return res.json({ success: true, data: rows[0] });
        }
      } catch (dbErr) {
        console.warn('[Inventory API] PG single batch query failed:', dbErr);
      }
    }

    const b = campusDb.purchaseBatches.get(req.params.id);
    if (!b) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const lab = campusDb.labs.get(b.acquisition_lab_id);
    const model = campusDb.equipmentModels.get(b.model_id);
    const category = model ? campusDb.equipmentCategories.get(model.category_id) : null;

    return res.json({
      success: true,
      data: {
        batch_id: b.id,
        lab_code: lab?.lab_code || 'D-01',
        lab_name: lab?.name || 'Department Lab',
        category: category?.name || 'Hardware',
        brand: model?.brand || 'Standard',
        model_name: model?.model_name || 'System Unit',
        register_sr_no: b.register_sr_no,
        quantity_original: b.quantity_original,
        quantity_current: b.quantity_current,
        total_cost: b.total_cost,
        status: b.status,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Database operation failed' });
  }
});

// GET /api/v1/inventory/models
inventoryRouter.get('/models', async (req: Request, res: Response) => {
  try {
    if (pool.isConnected) {
      try {
        const { rows } = await pool.query(`
          SELECT m.id AS model_id, c.name AS category_name,
                 m.category_id, m.brand, m.model_name,
                 m.config_key AS configuration_summary
          FROM equipment_models m
          JOIN equipment_categories c ON c.id = m.category_id
          ORDER BY c.name, m.model_name
        `);
        const filtered = rows.filter((r: any) =>
          (!req.query.brand || r.brand?.toLowerCase().includes(String(req.query.brand).toLowerCase())) &&
          (!req.query.search || JSON.stringify(r).toLowerCase().includes(String(req.query.search).toLowerCase()))
        );
        return res.json({ success: true, count: filtered.length, data: filtered });
      } catch (dbErr) {
        console.warn('[Inventory API] PG models query failed, using repository:', dbErr);
      }
    }

    const list = Array.from(campusDb.equipmentModels.values()).map((m) => {
      const c = campusDb.equipmentCategories.get(m.category_id);
      return {
        model_id: m.id,
        category_name: c ? c.name : 'Computer Equipment',
        category_id: m.category_id,
        brand: m.brand,
        model_name: m.model_name,
        configuration_summary: m.config_key,
      };
    });

    return res.json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Database operation failed' });
  }
});

// GET /api/v1/inventory/categories
inventoryRouter.get('/categories', async (_req: Request, res: Response) => {
  try {
    if (pool.isConnected) {
      try {
        const { rows } = await pool.query(`
          SELECT c.id AS category_id, c.name AS category_name,
                 COUNT(m.id)::int AS total_models
          FROM equipment_categories c
          LEFT JOIN equipment_models m ON m.category_id = c.id
          GROUP BY c.id, c.name
          ORDER BY c.name
        `);
        return res.json({ success: true, count: rows.length, data: rows });
      } catch (dbErr) {
        console.warn('[Inventory API] PG categories query failed, using repository:', dbErr);
      }
    }

    const list = Array.from(campusDb.equipmentCategories.values()).map((c) => {
      const modelsCount = Array.from(campusDb.equipmentModels.values()).filter(
        (m) => m.category_id === c.id
      ).length;
      return {
        category_id: c.id,
        category_name: c.name,
        total_models: modelsCount,
      };
    });

    return res.json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Database operation failed' });
  }
});

// GET /api/v1/inventory/labs - Historical and currently allocated department labs
inventoryRouter.get('/labs', async (_req: Request, res: Response) => {
  try {
    if (pool.isConnected) {
      try {
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
        if (rows && rows.length > 0) {
          return res.json({ success: true, count: rows.length, data: rows });
        }
      } catch (dbErr) {
        console.warn('[Inventory API] PG labs query failed, using repository:', dbErr);
      }
    }

    // Repository fallback using official 12 departmental labs
    const list = Array.from(campusDb.labs.values()).map((l) => {
      const batches = Array.from(campusDb.purchaseBatches.values()).filter(
        (b) => b.acquisition_lab_id === l.id
      );
      const totalOrig = batches.reduce((sum, b) => sum + (b.quantity_original || 0), 0);
      const totalCurr = batches.reduce((sum, b) => sum + (b.quantity_current || 0), 0);
      const totalCost = batches.reduce((sum, b) => sum + (b.total_cost || 0), 0);
      return {
        id: l.id,
        lab_code: l.lab_code,
        lab_name: l.name,
        capacity: l.capacity,
        investment: l.investment,
        operationalStatus: (l as any).operationalStatus || 'available',
        maintenanceStatus: (l as any).maintenanceStatus || '',
        total_batches: batches.length,
        total_original_qty: totalOrig,
        total_current_qty: totalCurr,
        total_investment: totalCost || l.investment,
      };
    });

    return res.json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    console.error('[Inventory API] Labs error:', err);
    return res.status(500).json({ success: false, message: 'Database operation failed' });
  }
});

// GET /api/v1/inventory/summary
inventoryRouter.get('/summary', async (_req: Request, res: Response) => {
  try {
    if (pool.isConnected) {
      try {
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
        if (rows && rows.length > 0) {
          return res.json({ success: true, data: rows[0] });
        }
      } catch (dbErr) {
        console.warn('[Inventory API] PG summary query failed, using repository:', dbErr);
      }
    }

    const totalOrig = Array.from(campusDb.purchaseBatches.values()).reduce(
      (sum, b) => sum + (b.quantity_original || 0),
      0
    );
    const totalCurr = Array.from(campusDb.purchaseBatches.values()).reduce(
      (sum, b) => sum + (b.quantity_current || 0),
      0
    );
    const totalCost = Array.from(campusDb.purchaseBatches.values()).reduce(
      (sum, b) => sum + (b.total_cost || 0),
      0
    );

    const summary = {
      total_batches: campusDb.purchaseBatches.size,
      total_models: campusDb.equipmentModels.size,
      total_categories: campusDb.equipmentCategories.size,
      total_labs: campusDb.labs.size,
      total_bookable_resources: campusDb.resources.size,
      total_original_quantity: totalOrig,
      total_current_quantity: totalCurr,
      total_investment: totalCost,
    };

    return res.json({ success: true, data: summary });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Database operation failed' });
  }
});

// GET /api/v1/inventory/equipment
inventoryRouter.get('/equipment', async (_req: Request, res: Response) => {
  try {
    if (pool.isConnected) {
      try {
        const { rows } = await pool.query(`
          SELECT r.id, r.label, r.state, r.serial_no,
                 r.version, l.lab_code, l.name AS lab_name,
                 r.batch_id
          FROM resources r
          JOIN labs l ON l.id = r.lab_id
          ORDER BY l.lab_code, r.label
        `);
        return res.json({ success: true, count: rows.length, data: rows });
      } catch (dbErr) {
        console.warn('[Inventory API] PG equipment query failed, using repository:', dbErr);
      }
    }

    const list = Array.from(campusDb.resources.values()).map((r) => {
      const l = campusDb.labs.get(r.lab_id);
      return {
        id: r.id,
        label: r.label,
        state: r.state,
        serial_no: r.serial_no,
        version: r.version,
        lab_code: l?.lab_code || 'D-01',
        lab_name: l?.name || 'Department Lab',
        batch_id: r.batch_id,
      };
    });

    return res.json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Database operation failed' });
  }
});

// GET /api/v1/inventory/
inventoryRouter.get('/', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      total_batches: campusDb.purchaseBatches.size,
      total_models: campusDb.equipmentModels.size,
      total_labs: campusDb.labs.size,
      total_equipment: campusDb.resources.size,
    },
    message: 'Official 3NF campus inventory pipeline operational.',
  });
});
