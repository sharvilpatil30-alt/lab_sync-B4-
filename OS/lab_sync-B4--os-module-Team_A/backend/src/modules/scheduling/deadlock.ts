/**
 * OS Deadlock Detection & Avoidance Simulator (Wait-For Graph Cycle Detection)
 *
 * Implements cycle detection on a directed Wait-For Graph (WFG):
 * - Nodes represent transactions/processes (Users/Bookings)
 * - Directed edge (A -> B) means transaction A is waiting for a resource held by transaction B.
 * - A cycle in the WFG indicates a deadlock condition.
 */

export interface DeadlockNode {
  id: string; // Transaction / Process ID
  waitingFor: string[]; // IDs of transactions it is waiting for
}

export class DeadlockDetector {
  /**
   * Detects cycles in the wait-for graph using Depth First Search (DFS).
   * @param graph Map of processId -> array of processIds it is waiting for
   * @returns Object indicating if deadlock exists, along with cycle path if found
   */
  public static detectDeadlock(graph: Map<string, string[]>): {
    deadlock: boolean;
    cycle?: string[];
  } {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        const foundCycle = this.dfs(node, graph, visited, recStack, path);
        if (foundCycle) {
          return { deadlock: true, cycle: path };
        }
      }
    }

    return { deadlock: false };
  }

  private static dfs(
    current: string,
    graph: Map<string, string[]>,
    visited: Set<string>,
    recStack: Set<string>,
    path: string[]
  ): boolean {
    visited.add(current);
    recStack.add(current);
    path.push(current);

    const neighbors = graph.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (this.dfs(neighbor, graph, visited, recStack, path)) {
          return true;
        }
      } else if (recStack.has(neighbor)) {
        path.push(neighbor);
        return true;
      }
    }

    recStack.delete(current);
    path.pop();
    return false;
  }
}

