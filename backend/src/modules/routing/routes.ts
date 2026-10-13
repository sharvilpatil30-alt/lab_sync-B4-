import { Router } from 'express';
import { getTopology, calculateRoute, getRouteByBookingId, getNodes, getAlgorithms } from './controller.js';

const router = Router();

router.get('/nodes', getNodes);
router.get('/algorithms', getAlgorithms);
router.post('/compute', calculateRoute);

// Retrieve graph topology, nodes, edges, lab destinations
router.get('/topology', getTopology);
router.get('/graph', getTopology);

// Route calculation endpoints
router.get('/calculate', calculateRoute);
router.post('/calculate', calculateRoute);

// Booking or Lab ID parameterized route
router.get('/:bookingId', getRouteByBookingId);

export default router;

