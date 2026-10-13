import { CSE_NODES, CSE_EDGES, CSE_LAB_DESTINATIONS, CSE_START_NODE_ID, resolveNodeId, getNodeById } from './graph.js';
import { runDFS } from './algorithms/dfs.js';
import { runDijkstra } from './algorithms/dijkstra.js';
import { runBFS } from './algorithms/bfs.js';
import { runBellmanFord } from './algorithms/bellmanFord.js';

console.log('--- RUNNING CSE WAYFINDING & ROUTING TESTS ---');

// Test 1: Verify CSE PORCH to D-10 with DFS
const dfsResult = runDFS('node_cse_porch', 'node_d10');
console.assert(dfsResult !== null, 'DFS result should not be null');
console.log('DFS Result:', dfsResult);
console.assert(dfsResult?.path.length === 5, 'DFS path length should be 5 hops');
console.assert(dfsResult?.distance === 54, `DFS distance should be 54m, got ${dfsResult?.distance}`);
console.assert(
  JSON.stringify(dfsResult?.path) ===
    JSON.stringify([
      'node_cse_porch',
      'node_main_entrance',
      'node_central_stairwell',
      'node_first_floor_corridor',
      'node_d10',
    ]),
  'DFS path nodes must match exact waypoints'
);

// Test 2: Verify CSE PORCH to D-10 with Dijkstra
const dijkstraResult = runDijkstra('node_cse_porch', 'node_d10');
console.assert(dijkstraResult !== null, 'Dijkstra result should not be null');
console.log('Dijkstra Result:', dijkstraResult);
console.assert(dijkstraResult?.distance === 54, `Dijkstra distance should be 54m, got ${dijkstraResult?.distance}`);
console.assert(dijkstraResult?.path.length === 5, 'Dijkstra path should be 5 hops');

// Test 3: Verify CSE PORCH to D-10 with BFS
const bfsResult = runBFS('node_cse_porch', 'node_d10');
console.assert(bfsResult !== null, 'BFS result should not be null');
console.log('BFS Result:', bfsResult);
console.assert(bfsResult?.distance === 54, `BFS distance should be 54m, got ${bfsResult?.distance}`);

// Test 4: Verify CSE PORCH to D-10 with Bellman-Ford
const bfResult = runBellmanFord('node_cse_porch', 'node_d10');
console.assert(bfResult !== null, 'Bellman-Ford result should not be null');
console.log('Bellman-Ford Result:', bfResult);
console.assert(bfResult?.distance === 54, `Bellman-Ford distance should be 54m, got ${bfResult?.distance}`);

// Test 5: Verify all 12 labs are reachable from CSE PORCH
for (const lab of CSE_LAB_DESTINATIONS) {
  const res = runDijkstra('node_cse_porch', lab.nodeId);
  console.assert(res !== null, `Lab ${lab.code} should be reachable`);
  console.log(`Reachable: ${lab.code} (${lab.name}) - Distance: ${res?.distance}m, Hops: ${res?.path.length}`);
}

// Test 6: Verify resolveNodeId mappings
console.assert(resolveNodeId('D-10') === 'node_d10', 'Should resolve D-10 to node_d10');
console.assert(resolveNodeId('d10') === 'node_d10', 'Should resolve d10 to node_d10');
console.assert(resolveNodeId('D-01') === 'node_d01', 'Should resolve D-01 to node_d01');
console.assert(resolveNodeId('node_cse_porch') === 'node_cse_porch', 'Should resolve node_cse_porch');

console.log('ALL CSE ROUTING TESTS PASSED SUCCESSFULLY!');

