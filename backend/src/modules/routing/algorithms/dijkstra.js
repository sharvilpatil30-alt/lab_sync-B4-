export function dijkstra(graph, start, end) {
    const distances = {};
    const previous = {};
    const visited = new Set();

    for (const node in graph) {
        distances[node] = Infinity;
        previous[node] = null;
    }

    distances[start] = 0;

    while (true) {
        let current = null;
        let minDistance = Infinity;

        for (const node in distances) {
            if (!visited.has(node) && distances[node] < minDistance) {
                minDistance = distances[node];
                current = node;
            }
        }

        if (current === null) {
            break;
        }

        visited.add(current);

        for (const neighbor in graph[current]) {
            const newDistance =
                distances[current] + graph[current][neighbor];

            if (newDistance < distances[neighbor]) {
                distances[neighbor] = newDistance;
                previous[neighbor] = current;
            }
        }
    }

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