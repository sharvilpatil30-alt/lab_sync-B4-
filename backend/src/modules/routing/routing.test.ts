import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { CSE_NODES, CSE_EDGES, CSE_LAB_DESTINATIONS, CSE_START_NODE_ID, resolveNodeId } from './graph.js';
import { runDFS } from './algorithms/dfs.js';
import { runDijkstra } from './algorithms/dijkstra.js';
import { runBFS } from './algorithms/bfs.js';
import { runBellmanFord } from './algorithms/bellmanFord.js';

const engines = { dijkstra: runDijkstra, bfs: runBFS, dfs: runDFS, 'bellman-ford': runBellmanFord };
const expected: Record<string, number> = {
  'D-01': 37, 'D-02': 37, 'D-03': 39, 'D-04': 41, 'D-05': 45, 'D-06': 37,
  'D-07': 38, 'D-08': 38, 'D-09': 40, 'D-10': 54, 'D-11': 54, 'D-12': 43,
};
function checkPath(result: ReturnType<typeof runDijkstra>, from: string, to: string) {
  assert.ok(result);
  assert.equal(result.path[0], from);
  assert.equal(result.path.at(-1), to);
  assert.equal(new Set(result.path).size, result.path.length);
  let total = 0;
  for (let i = 1; i < result.path.length; i++) {
    const a = result.path[i - 1], b = result.path[i];
    const edge = CSE_EDGES.find(e => (e.from === a && e.to === b) || (e.from === b && e.to === a));
    assert.ok(edge, `Missing edge ${a} -> ${b}`);
    total += edge.weight;
  }
  assert.equal(result.distance, total);
}

test('all 12 CSE lab distances and all four algorithms', () => {
  assert.equal(CSE_LAB_DESTINATIONS.length, 12);
  for (const lab of CSE_LAB_DESTINATIONS) {
    for (const [name, run] of Object.entries(engines)) {
      const result = run(CSE_START_NODE_ID, lab.nodeId);
      checkPath(result, CSE_START_NODE_ID, lab.nodeId);
      if (name === 'dijkstra' || name === 'bellman-ford') assert.equal(result!.distance, expected[lab.code]);
    }
  }
});

test('all node pairs: weighted shortest paths match independent Floyd-Warshall oracle', () => {
  const ids = CSE_NODES.map(n => n.id);
  const distances = ids.map((a) => ids.map(b => a === b ? 0 : Infinity));
  for (const e of CSE_EDGES) {
    const a = ids.indexOf(e.from), b = ids.indexOf(e.to);
    assert.ok(a >= 0 && b >= 0 && e.weight > 0);
    distances[a][b] = distances[b][a] = e.weight;
  }
  for (let k = 0; k < ids.length; k++) for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) {
    distances[i][j] = Math.min(distances[i][j], distances[i][k] + distances[k][j]);
  }
  for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) {
    for (const [name, run] of Object.entries(engines)) {
      const result = run(ids[i], ids[j]);
      checkPath(result, ids[i], ids[j]);
      if (name === 'dijkstra' || name === 'bellman-ford') assert.equal(result!.distance, distances[i][j]);
    }
  }
});

test('strict aliases and invalid algorithm inputs', () => {
  for (const alias of ['D-10', 'd10', 'lab_d10', ' node_d10 ']) assert.equal(resolveNodeId(alias), 'node_d10');
  for (const invalid of ['', ' ', 'Lab', 'D-1 garbage', 'bogus_d10', 'D-99', 'node_main_gate']) assert.equal(resolveNodeId(invalid), null);
  for (const run of Object.values(engines)) {
    assert.equal(run('missing', 'missing'), null);
    assert.equal(run('missing', CSE_START_NODE_ID), null);
    assert.equal(run(CSE_START_NODE_ID, 'missing'), null);
  }
});

test('mounted HTTP API: Team D contract, legacy endpoints, errors and unreachable nodes', async () => {
  // Inventory's app import requires a URL; these routing tests never query PostgreSQL.
  process.env.DATABASE_URL ??= 'postgresql://routing_test:routing_test@127.0.0.1:1/routing_test';
  const { default: app } = require('../../app.js') as typeof import('../../app.js');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1/routes`;
  async function request(path: string, body?: unknown) {
    const response = await fetch(base + path, body === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as any };
  }
  try {
    const nodes = await request('/nodes');
    assert.equal(nodes.status, 200);
    assert.deepEqual(nodes.body.data.edges, CSE_EDGES);
    assert.equal(nodes.body.data.startNodeId, CSE_START_NODE_ID);
    assert.equal(nodes.body.data.nodes.filter((n: any) => n.type === 'LAB').length, 12);
    assert.ok(nodes.body.data.nodes.every((n: any) => n.nodeId === n.id));
    assert.deepEqual((await request('/algorithms')).body.data.algorithms, Object.keys(engines));
    for (const path of ['/topology', '/graph']) {
      const response = await request(path);
      assert.equal(response.status, 200);
      assert.deepEqual(response.body.data.edges, CSE_EDGES);
    }
    for (const lab of CSE_LAB_DESTINATIONS) for (const algorithm of Object.keys(engines)) {
      const response = await request('/compute', { fromNodeId: CSE_START_NODE_ID, toNodeId: lab.nodeId, algorithm });
      assert.equal(response.status, 200);
      const data = response.body.data;
      checkPath(data, CSE_START_NODE_ID, lab.nodeId);
      assert.equal(data.distanceUnit, 'm');
      assert.equal(data.algorithm, algorithm.toUpperCase());
      assert.equal(data.hops, data.path.length - 1);
      assert.equal(data.routeStatus, ['dfs', 'bfs'].includes(algorithm) ? 'alternative' : 'optimal');
    }
    const defaultRoute = await request('/compute', { fromNodeId: CSE_START_NODE_ID, toNodeId: 'D-01' });
    assert.equal(defaultRoute.body.data.algorithm, 'DIJKSTRA');
    assert.equal(defaultRoute.body.data.distance, 37);
    for (const path of ['/calculate?destination=D-10', '/D-10']) {
      assert.equal((await request(path)).body.data.distance, 54);
    }
    assert.equal((await request('/calculate', { start: 'D-01', destination: 'D-01' })).body.data.distance, 0);
    for (const body of [{}, { toNodeId: '' }, { toNodeId: [] }, { toNodeId: 'D-01', fromNodeId: 12 },
      { toNodeId: 'D-01', algorithm: 'invalid' }, { toNodeId: 'D-01', algorithm: {} }]) {
      assert.equal((await request('/compute', body)).status, 400);
    }
    for (const body of [{ toNodeId: 'D-99' }, { toNodeId: 'Lab' }, { toNodeId: 'D-10', fromNodeId: 'node_main_gate' }]) {
      assert.equal((await request('/compute', body)).status, 404);
    }
    assert.equal((await request('/calculate')).status, 400);
    assert.equal((await request('/BK-unknown')).status, 400);
    // Temporarily disconnect a real lab; restore the graph even on assertion failure.
    const saved = [...CSE_EDGES];
    try {
      CSE_EDGES.splice(0, CSE_EDGES.length, ...saved.filter(e => e.from !== 'node_d12' && e.to !== 'node_d12'));
      for (const [algorithm, run] of Object.entries(engines)) {
        assert.equal(run(CSE_START_NODE_ID, 'node_d12'), null);
        const response = await request('/compute', { fromNodeId: CSE_START_NODE_ID, toNodeId: 'node_d12', algorithm });
        assert.equal(response.status, 404);
        assert.match(response.body.message, /No route found/);
        assert.equal(response.body.success, false);
      }
    } finally { CSE_EDGES.splice(0, CSE_EDGES.length, ...saved); }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});
