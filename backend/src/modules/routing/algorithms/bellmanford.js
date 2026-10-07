export function bellmanFord(graph, start, end) {
    const distances = {};
    const previous = {};

    // Initialize
    for (const node in graph) {
        distances[node] = Infinity;
        previous[node] = null;
    }

    distances[start] = 0;

    // Get all edges
    const edges = [];

    for (const from in graph) {
        for (const to in graph[from]) {
            edges.push({
                from,
                to,
                weight: graph[from][to]
            });
        }
    }

    // Relax edges |V| - 1 times
    const nodes = Object.keys(graph);

    for (let i = 0; i < nodes.length - 1; i++) {
        let changed = false;

        for (const edge of edges) {
            if (
                distances[edge.from] !== Infinity &&
                distances[edge.from] + edge.weight < distances[edge.to]
            ) {
                distances[edge.to] =
                    distances[edge.from] + edge.weight;

                previous[edge.to] = edge.from;
                changed = true;
            }
        }

        if (!changed) {
            break;
        }
    }

    // Build path
    const path = [];
    let current = end;

    while (current !== null) {
        path.unshift(current);
        current = previous[current];
    }

    return {
        path,
        cost: distances[end]
    };
}