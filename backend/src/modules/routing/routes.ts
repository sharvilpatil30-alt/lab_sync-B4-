import { Router } from 'express';
import { getTopology, calculateRoute, getRouteByBookingId } from './controller.js';

const router = Router();

// Retrieve graph topology, nodes, edges, lab destinations
router.get('/topology', getTopology);
router.get('/graph', getTopology);

// Route calculation endpoints
router.get('/calculate', calculateRoute);
router.post('/calculate', calculateRoute);

// Booking or Lab ID parameterized route
router.get('/:bookingId', getRouteByBookingId);

export default router;

