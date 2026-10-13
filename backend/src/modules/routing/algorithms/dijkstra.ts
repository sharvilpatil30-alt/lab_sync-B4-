import { getAdjacencyList, CSE_NODES } from '../graph.js';

export function runDijkstra(
  startNode: string,
  targetNode: string
): { path: string[]; distance: number } | null {
  const adj = getAdjacencyList();
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  CSE_NODES.forEach((n) => {
    distances[n.id] = Infinity;
    previous[n.id] = null;
    unvisited.add(n.id);
  });

  if (!distances.hasOwnProperty(startNode) || !distances.hasOwnProperty(targetNode)) {
    return null;
  }

  distances[startNode] = 0;

  while (unvisited.size > 0) {
    let current: string | null = null;
    let smallestDist = Infinity;

    for (const node of unvisited) {
      if (distances[node] < smallestDist) {
        smallestDist = distances[node];
        current = node;
      }
    }

    if (!current || distances[current] === Infinity || current === targetNode) {
      break;
    }

    unvisited.delete(current);

    const neighbors = adj[current] || [];
    for (const neighbor of neighbors) {
      if (unvisited.has(neighbor.node)) {
        const alt = distances[current] + neighbor.weight;
        if (alt < distances[neighbor.node]) {
          distances[neighbor.node] = alt;
          previous[neighbor.node] = current;
        }
      }
    }
  }

  if (distances[targetNode] === Infinity) {
    return null;
  }

  const path: string[] = [];
  let curr: string | null = targetNode;
  while (curr) {
    path.unshift(curr);
    curr = previous[curr];
  }

  if (path[0] !== startNode) {
    return null;
  }

  return {
    path,
    distance: distances[targetNode],
  };
}

