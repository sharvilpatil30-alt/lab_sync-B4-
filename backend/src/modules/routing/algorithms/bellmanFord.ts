import { CSE_NODES, CSE_EDGES } from '../graph.js';

export function runBellmanFord(
  startNode: string,
  targetNode: string
): { path: string[]; distance: number } | null {
  const distances: Record<string, number> = {};
  const predecessor: Record<string, string | null> = {};

  CSE_NODES.forEach((n) => {
    distances[n.id] = Infinity;
    predecessor[n.id] = null;
  });

  if (!distances.hasOwnProperty(startNode) || !distances.hasOwnProperty(targetNode)) {
    return null;
  }

  distances[startNode] = 0;

  // Build undirected edge list
  const allEdges: { from: string; to: string; weight: number }[] = [];
  CSE_EDGES.forEach((e) => {
    allEdges.push({ from: e.from, to: e.to, weight: e.weight });
    allEdges.push({ from: e.to, to: e.from, weight: e.weight });
  });

  const V = CSE_NODES.length;
  for (let i = 0; i < V - 1; i++) {
    let changed = false;
    for (const { from, to, weight } of allEdges) {
      if (distances[from] !== Infinity && distances[from] + weight < distances[to]) {
        distances[to] = distances[from] + weight;
        predecessor[to] = from;
        changed = true;
      }
    }
    if (!changed) break;
  }

  if (distances[targetNode] === Infinity) {
    return null;
  }

  const path: string[] = [];
  let curr: string | null = targetNode;
  while (curr) {
    path.unshift(curr);
    curr = predecessor[curr];
  }

  if (path[0] !== startNode) {
    return null;
  }

  return {
    path,
    distance: distances[targetNode],
  };
}

