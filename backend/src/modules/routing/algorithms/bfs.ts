import { getAdjacencyList, CSE_EDGES } from '../graph.js';

export function runBFS(
  startNode: string,
  targetNode: string
): { path: string[]; distance: number } | null {
  const adj = getAdjacencyList();
  const queue: string[] = [startNode];
  const visited = new Set<string>([startNode]);
  const parent: Record<string, string | null> = { [startNode]: null };

  const edgeWeights = new Map<string, number>();
  CSE_EDGES.forEach((e) => {
    edgeWeights.set(`${e.from}->${e.to}`, e.weight);
    edgeWeights.set(`${e.to}->${e.from}`, e.weight);
  });

  let found = false;
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetNode) {
      found = true;
      break;
    }

    const neighbors = adj[current] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.node)) {
        visited.add(neighbor.node);
        parent[neighbor.node] = current;
        queue.push(neighbor.node);
      }
    }
  }

  if (!found) return null;

  const path: string[] = [];
  let curr: string | null = targetNode;
  while (curr) {
    path.unshift(curr);
    curr = parent[curr];
  }

  let distance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const key = `${path[i]}->${path[i + 1]}`;
    distance += edgeWeights.get(key) || 10;
  }

  return { path, distance };
}

