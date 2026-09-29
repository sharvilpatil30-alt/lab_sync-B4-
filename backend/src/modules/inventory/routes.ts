import { Router, Request, Response } from 'express';
import { inventoryService } from './inventoryService.js';

export const inventoryRouter: Router = Router();

/**
 * GET /api/v1/inventory
 * Comprehensive Inventory Management Dashboard endpoint:
 * Fetches equipment status, summary metrics, batches, and models
 */
inventoryRouter.get('/', (req: Request, res: Response) => {
  const { status, lab_code, category, search, brand } = req.query;

  const dashboardPayload = inventoryService.getDashboardPayload({
    status: status as string,
    lab_code: lab_code as string,
    category: category as string,
    search: search as string,
  });

  res.status(200).json(dashboardPayload);
});

/**
 * GET /api/v1/inventory/equipment
 * List of equipment with status, location, health, and serial numbers
 */
inventoryRouter.get('/equipment', (req: Request, res: Response) => {
  const { status, lab_code, category, search, brand } = req.query;

  const equipment = inventoryService.getAllEquipment({
    status: status as string,
    lab_code: lab_code as string,
    category: category as string,
    search: search as string,
    brand: brand as string,
  });

  res.status(200).json({
    success: true,
    count: equipment.length,
    data: equipment,
  });
});

/**
 * GET /api/v1/inventory/equipment/:id
 */
inventoryRouter.get('/equipment/:id', (req: Request, res: Response) => {
  const item = inventoryService.getEquipmentById(req.params.id);
  if (!item) {
    return res.status(404).json({
      success: false,
      message: `Equipment ${req.params.id} not found`,
    });
  }

  res.status(200).json({
    success: true,
    data: item,
  });
});

/**
 * PUT /api/v1/inventory/equipment/:id
 * Update equipment status or maintenance info in real time
 */
inventoryRouter.put('/equipment/:id', (req: Request, res: Response) => {
  const updated = inventoryService.updateEquipment(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({
      success: false,
      message: `Equipment ${req.params.id} not found`,
    });
  }

  res.status(200).json({
    success: true,
    message: `Equipment ${req.params.id} status updated to ${updated.status}`,
    data: updated,
  });
});

/**
 * GET /api/v1/inventory/batches
 * Returns real-time list of computer purchase batches with optional filters
 */
inventoryRouter.get('/batches', (req: Request, res: Response) => {
  const { lab_code, brand, model_name, status, os, search } = req.query;

  const batches = inventoryService.getAllBatches({
    lab_code: lab_code as string,
    brand: brand as string,
    model_name: model_name as string,
    status: status as string,
    os: os as string,
    search: search as string,
  });

  res.status(200).json({
    success: true,
    count: batches.length,
    data: batches,
  });
});

/**
 * GET /api/v1/inventory/batches/:id
 */
inventoryRouter.get('/batches/:id', (req: Request, res: Response) => {
  const batch = inventoryService.getBatchById(req.params.id);
  if (!batch) {
    return res.status(404).json({
      success: false,
      message: `Purchase batch ${req.params.id} not found`,
    });
  }

  res.status(200).json({
    success: true,
    data: batch,
  });
});

/**
 * POST /api/v1/inventory/batches
 * Create or append a new computer purchase batch in real time
 */
inventoryRouter.post('/batches', (req: Request, res: Response) => {
  const created = inventoryService.createBatch(req.body);
  res.status(201).json({
    success: true,
    message: `Batch ${created.batch_id} recorded in real-time inventory`,
    data: created,
  });
});

/**
 * PUT /api/v1/inventory/batches/:id
 * Update batch attributes or status
 */
inventoryRouter.put('/batches/:id', (req: Request, res: Response) => {
  const updated = inventoryService.updateBatch(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({
      success: false,
      message: `Batch ${req.params.id} not found`,
    });
  }

  res.status(200).json({
    success: true,
    message: `Batch ${req.params.id} updated successfully`,
    data: updated,
  });
});

/**
 * DELETE /api/v1/inventory/batches/:id
 */
inventoryRouter.delete('/batches/:id', (req: Request, res: Response) => {
  const deleted = inventoryService.deleteBatch(req.params.id);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: `Batch ${req.params.id} not found`,
    });
  }

  res.status(200).json({
    success: true,
    message: `Batch ${req.params.id} removed from inventory`,
  });
});

/**
 * GET /api/v1/inventory/models
 * Returns 55 normalized equipment models with category and config attributes
 */
inventoryRouter.get('/models', (req: Request, res: Response) => {
  const { category_id, brand, search } = req.query;

  const models = inventoryService.getAllModels({
    category_id: category_id as string,
    brand: brand as string,
    search: search as string,
  });

  res.status(200).json({
    success: true,
    count: models.length,
    data: models,
  });
});

/**
 * GET /api/v1/inventory/models/:id
 */
inventoryRouter.get('/models/:id', (req: Request, res: Response) => {
  const model = inventoryService.getModelById(req.params.id);
  if (!model) {
    return res.status(404).json({
      success: false,
      message: `Equipment model ${req.params.id} not found`,
    });
  }

  res.status(200).json({
    success: true,
    data: model,
  });
});

/**
 * POST /api/v1/inventory/models
 */
inventoryRouter.post('/models', (req: Request, res: Response) => {
  const created = inventoryService.createModel(req.body);
  res.status(201).json({
    success: true,
    message: `Equipment model ${created.model_id} created`,
    data: created,
  });
});

/**
 * GET /api/v1/inventory/categories
 */
inventoryRouter.get('/categories', (_req: Request, res: Response) => {
  const categories = inventoryService.getCategories();
  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

/**
 * GET /api/v1/inventory/labs
 * Aggregated inventory per lab (D-01 to D-11)
 */
inventoryRouter.get('/labs', (_req: Request, res: Response) => {
  const labs = inventoryService.getLabsSummary();
  res.status(200).json({
    success: true,
    count: labs.length,
    data: labs,
  });
});

/**
 * GET /api/v1/inventory/summary
 * Total batches, computers, investment, and breakdown stats
 */
inventoryRouter.get('/summary', (_req: Request, res: Response) => {
  const stats = inventoryService.getOverallStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
});
