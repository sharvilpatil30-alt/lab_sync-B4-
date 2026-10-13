import { getAdjacencyList, CSE_EDGES } from '../graph.js';

export function runDFS(
  startNode: string,
  targetNode: string
): { path: string[]; distance: number } | null {
  const adj = getAdjacencyList();
  if (!Object.hasOwn(adj, startNode) || !Object.hasOwn(adj, targetNode)) return null;
  const visited = new Set<string>();

  // Map to find edge weights
  const edgeWeights = new Map<string, number>();
  CSE_EDGES.forEach((e) => {
    edgeWeights.set(`${e.from}->${e.to}`, e.weight);
    edgeWeights.set(`${e.to}->${e.from}`, e.weight);
  });

  // To match standard corridor flow when exploring from porch towards destination:
  // Sort neighbors so the central spine / direct hallway is explored cleanly
  const currentPath: string[] = [];

  function dfs(current: string): boolean {
    visited.add(current);
    currentPath.push(current);

    if (current === targetNode) {
      return true;
    }

    const neighbors = adj[current] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.node)) {
        if (dfs(neighbor.node)) {
          return true;
        }
      }
    }

    currentPath.pop();
    return false;
  }

  const found = dfs(startNode);
  if (!found || currentPath.length === 0) {
    return null;
  }

  let distance = 0;
  for (let i = 0; i < currentPath.length - 1; i++) {
    const key = `${currentPath[i]}->${currentPath[i + 1]}`;
    distance += edgeWeights.get(key)!;
  }

  return {
    path: [...currentPath],
    distance,
  };
}

