import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CSE_NODES, CSE_EDGES, CSE_START_NODE_ID } from '../../backend/src/modules/routing/graph.ts';
import { validateGraph, resolveCseNode, resolveLabNode, toCampusMap } from '../src/services/cseRouting.ts';
import { routeFromBackend, interpolatePositionOnRoute } from '../src/services/routeEngine.ts';
import { ApiRoutingService } from '../src/services/api/ApiRoutingService.ts';
import { ApiBookingService, mapBackendBookingToFrontend } from '../src/services/api/ApiBookingService.ts';
import { mapBackendLabToFrontend } from '../src/services/api/ApiLabService.ts';
import { mapBackendEquipmentToResource, ApiResourceService } from '../src/services/api/ApiResourceService.ts';
import { apiClient } from '../src/services/api/client.ts';
import { CampusLocationProvider } from '../src/services/locationProvider.ts';

const graph = validateGraph({ nodes: CSE_NODES, edges: CSE_EDGES, startNodeId: CSE_START_NODE_ID });
const route = {
  path: ['node_cse_porch', 'node_main_entrance', 'node_north_corridor', 'node_d01'],
  distance: 37, distanceUnit: 'm', algorithm: 'DIJKSTRA', estimatedTravelTimeMinutes: 1,
  shortestDistanceGuaranteed: true,
};
const routing = new ApiRoutingService();

test('all 12 CSE labs retain identifiers, schematic coordinates and map click targets', () => {
  const map = toCampusMap(graph);
  assert.equal(map.buildings.length, 12);
  assert.equal(Object.keys(map.labDestinationMap).length, 12);
  for (const n of CSE_NODES.filter(n => n.isLab)) {
    assert.equal(resolveCseNode(n.code, graph.nodes), n.id);
    assert.equal(resolveCseNode(`lab_${n.code!.toLowerCase().replace('-', '')}`, graph.nodes), n.id);
    assert.equal(resolveLabNode({ id: 'database-uuid', labId: n.code }, graph.nodes), n.id);
    assert.equal(map.buildings.find(b => b.id === n.id)?.entranceNodeId, n.id);
    assert.deepEqual(map.nodes.find(m => m.id === n.id)?.x, n.x);
  }
});
test('unknown IDs and ambiguous names never select an unrelated destination', () => {
  for (const id of ['node_gate', 'node_turing', 'D-99', 'Lab', ' ', 'prefix_d10', 'lab_cse_01']) {
    assert.equal(resolveCseNode(id, graph.nodes), null);
  }
  assert.equal(resolveLabNode({ id: 'uuid', name: 'Lab' }, graph.nodes), null);
  assert.throws(() => validateGraph({ nodes: [], edges: [] }), /incomplete CSE map/);
});
test('route path, coordinates, cumulative distances and ETA all use the backend route', () => {
  const actual = routeFromBackend(route, graph);
  assert.deepEqual(actual.pathNodeIds, route.path);
  assert.deepEqual(actual.pathCoordinates.map(n => n.nodeId), route.path);
  assert.deepEqual(actual.instructions.map(i => i.distanceMeters), [0, 12, 27, 37]);
  assert.equal(actual.totalDistanceMeters, 37);
  assert.equal(actual.estimatedMinutes, 1);
  assert.equal(actual.algorithm, 'DIJKSTRA');
  assert.equal(actual.shortestDistanceGuaranteed, true);
  assert.equal(routeFromBackend({ ...route, algorithm: 'DFS', shortestDistanceGuaranteed: false }, graph).shortestDistanceGuaranteed, false);
});
test('same-node route stays at zero distance and does not fabricate travel', () => {
  const actual = routeFromBackend({ ...route, path: ['node_d01'], distance: 0, estimatedTravelTimeMinutes: 0 }, graph);
  assert.equal(actual.totalDistanceMeters, 0);
  assert.equal(actual.estimatedMinutes, 0);
  assert.equal(interpolatePositionOnRoute(actual.pathCoordinates, 0).isComplete, true);
});
test('invalid paths, disconnected segments and incorrect distances fail', () => {
  assert.throws(() => routeFromBackend({ ...route, path: [] }, graph), /empty path/);
  assert.throws(() => routeFromBackend({ ...route, path: ['unknown'] }, graph), /unknown CSE node/);
  assert.throws(() => routeFromBackend({ ...route, path: ['node_cse_porch', 'node_d01'] }, graph), /no corridor/);
  assert.throws(() => routeFromBackend({ ...route, distance: 350 }, graph), /distance does not match/);
});
test('Team C lab/booking/resource adapters preserve real IDs and zero capacity', () => {
  const lab = mapBackendLabToFrontend({ id: 'lab-uuid', lab_code: 'D-10', lab_name: 'PG Lab', capacity: 0 });
  assert.equal(lab.id, 'lab-uuid');
  assert.equal(lab.labId, 'D-10');
  assert.equal(lab.capacity, 0);
  assert.equal(lab.floor, 1);
  assert.equal(mapBackendLabToFrontend({ lab_code: 'D-01' }).floor, 0);
  const booking = mapBackendBookingToFrontend({ id: 'booking-uuid', lab_id: 'lab-uuid', labName: 'PG Lab', state: 'QUEUED' });
  assert.equal(booking.lab, 'lab-uuid');
  assert.equal(booking.status, 'QUEUED');
  assert.equal(mapBackendEquipmentToResource({ id: 'resource-uuid', lab_code: 'D-10', lab_name: 'PG Lab', state: 'AVAILABLE' }).lab, 'D-10');
});
test('indoor GPS never maps an uncalibrated position to an unrelated destination', async () => {
  const provider = new CampusLocationProvider();
  const state = await provider.requestRealLocation();
  assert.equal(state.mode, 'demo-simulated');
  assert.match(state.error!, /Indoor GPS positioning is not available/);
});

test('API contracts and failures: no secondary route or distance fallback', async () => {
  const original = apiClient.defaults.adapter;
  const calls: string[] = [];
  const payloads: any[] = [];
  let failure = false;
  let corrupt = false;
  apiClient.defaults.adapter = async config => {
    calls.push(config.url!);
    if (config.data) payloads.push(JSON.parse(config.data));
    if (failure) throw { response: { status: 404, data: { message: 'Destination not found' } } };
    let data: unknown;
    if (config.url === '/routes/nodes') data = graph;
    else if (config.url === '/routes/algorithms') data = { algorithms: ['dijkstra', 'bfs', 'dfs', 'bellman-ford'] };
    else data = corrupt ? { ...route, path: [], distance: undefined } : route;
    return { data: { success: true, data }, status: 200, statusText: 'OK', headers: {}, config };
  };
  try {
    assert.equal((await routing.getNodes()).data.nodes.length, 18);
    assert.equal((await routing.getAlgorithms()).data.algorithms.length, 4);
    assert.equal((await routing.computeRoute({ fromNodeId: 'node_cse_porch', toNodeId: 'node_d01' })).data.distance, 37);
    assert.deepEqual(payloads[0], { fromNodeId: 'node_cse_porch', toNodeId: 'node_d01', algorithm: 'dijkstra' });
    corrupt = true;
    await assert.rejects(routing.computeRoute({ fromNodeId: 'node_cse_porch', toNodeId: 'node_d01' }), /invalid route/);
    failure = true;
    const before = calls.length;
    await assert.rejects(routing.computeRoute({ fromNodeId: 'node_cse_porch', toNodeId: 'node_d01' }), /Destination not found/);
    assert.equal(calls.length, before + 1);
    await assert.rejects(routing.getNodes(), /Destination not found/);
    await assert.rejects(routing.getAlgorithms(), /Destination not found/);
    await assert.rejects(new ApiBookingService().listOwn(), /Destination not found/);
    await assert.rejects(new ApiResourceService().getAvailable('D-01', 'start', 'end'), /Destination not found/);
  } finally { apiClient.defaults.adapter = original; }
});

test('booking route uses the booked lab code, never the booking ID as destination', async () => {
  const original = apiClient.defaults.adapter;
  let requested: any;
  apiClient.defaults.adapter = async config => {
    let data: unknown;
    if (config.url === '/routes/nodes') data = graph;
    else if (config.url === '/bookings/booking-123') data = { id: 'booking-123', lab_code: 'D-01' };
    else if (config.url === '/routes/compute') { requested = JSON.parse(config.data); data = route; }
    else throw new Error(`Unexpected API call ${config.url}`);
    return { data: { success: true, data }, status: 200, statusText: 'OK', headers: {}, config };
  };
  try {
    const result = await routing.getRoute('booking-123');
    assert.equal(requested.toNodeId, 'node_d01');
    assert.equal(result.data.distanceMeters, 37);
    assert.equal(result.data.bookingId, 'booking-123');
  } finally { apiClient.defaults.adapter = original; }
});

test('lab selection treats all-building filter as unfiltered and preserves D-code lookup', async () => {
  const { ApiLabService } = await import('../src/services/api/ApiLabService.ts');
  const original = apiClient.defaults.adapter;
  apiClient.defaults.adapter = async config => ({
    data: { data: [
      { id: 'uuid-1', lab_code: 'D-01', lab_name: 'Linux Lab', building: 'CSE' },
      { id: 'uuid-2', lab_code: 'D-02', lab_name: 'Database Lab', building: 'CSE' },
    ] }, status: 200, statusText: 'OK', headers: {}, config,
  });
  try {
    const service = new ApiLabService();
    assert.equal((await service.list({ building: 'all', status: 'all' })).data.length, 2);
    assert.equal((await service.list({ search: 'D-01' })).data[0].id, 'uuid-1');
    assert.equal((await service.list({ building: 'Unknown' })).data.length, 0);
  } finally { apiClient.defaults.adapter = original; }
});

test('booking timestamps display in IST and requested state is not promoted to confirmed', () => {
  const booking = mapBackendBookingToFrontend({ id: 'id', state: 'REQUESTED', start_at: '2027-01-20T20:00:00Z', end_at: '2027-01-20T21:00:00Z', priority: 1 });
  assert.equal(booking.date, '2027-01-21');
  assert.equal(booking.startTime, '01:30');
  assert.equal(booking.endTime, '02:30');
  assert.equal(booking.status, 'REQUESTED');
  assert.equal(booking.userRole, 'faculty');
});

test('seat mapping requires authoritative availability and retains preemption signal', async () => {
  const original = apiClient.defaults.adapter;
  apiClient.defaults.adapter = async config => ({ data: { data: { resources: [
    { id: 'real-uuid', resourceId: 'display-label', available: true },
    { id: 'unknown-status' },
    { id: 'student-reserved', available: false, preemptable: true },
  ] } }, status: 200, statusText: 'OK', headers: {}, config });
  try {
    const seats = (await new ApiResourceService().getAvailable('lab', 'start', 'end')).data.resources;
    assert.equal(seats[0].resourceId, 'real-uuid');
    assert.equal(seats[0].available, true);
    assert.equal(seats[1].available, false);
    assert.equal(seats[2].available, false);
    assert.equal(seats[2].preemptable, true);
  } finally { apiClient.defaults.adapter = original; }
});
