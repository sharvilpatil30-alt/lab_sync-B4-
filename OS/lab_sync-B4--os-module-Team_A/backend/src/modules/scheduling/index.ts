/**
 * Team A — OS Scheduling & Allocation Module
 * Primary exports for Team C integration and external HTTP endpoints.
 */

export * from './types.js';
export * from './fcfs.js';
export * from './dataProvider.js';
export * from './metrics.js';
export * from './queue.js';
export * from './middleware.js';
export * from './controller.js';
export * from './routes.js';
export { schedulingRouter as default } from './routes.js';

