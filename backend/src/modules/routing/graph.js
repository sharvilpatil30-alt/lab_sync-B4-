// graph.js
// Stores the campus as a graph using an adjacency list.

export class Graph {
  constructor() {
    // Map:
    // nodeId -> { name, type, edges: [] }
    this.nodes = new Map();
  }

  addNode(id, name = "", type = "normal") {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, {
        id,
        name,
        type,
        edges: []
      });
    }
  }

  addEdge(from, to, weight, distance = weight) {
    if (!this.nodes.has(from)) {
      throw new Error(`Source node not found: ${from}`);
    }

    if (!this.nodes.has(to)) {
      throw new Error(`Destination node not found: ${to}`);
    }

    this.nodes.get(from).edges.push({
      to,
      weight: Number(weight),
      distance: Number(distance)
    });
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getNeighbors(id) {
    const node = this.nodes.get(id);

    if (!node) {
      return [];
    }

    return node.edges;
  }

  getNodeIds() {
    return [...this.nodes.keys()];
  }
}