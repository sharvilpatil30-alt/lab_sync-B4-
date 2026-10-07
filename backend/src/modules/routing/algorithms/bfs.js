export function bfs(graph, start, end) {
    const queue = [start];
    const visited = new Set([start]);
    const previous = {};

    for (const node in graph) {
        previous[node] = null;
    }

    while (queue.length > 0) {
        const current = queue.shift();

        if (current === end) {
            break;
        }

        for (const neighbor in graph[current]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                previous[neighbor] = current;
                queue.push(neighbor);
            }
        }
    }

    // Build path
    const path = [];

    // Destination was not reached
    if (!visited.has(end)) {
        return {
            path: [],
            cost: Infinity
        };
    }

    let current = end;

    while (current !== null) {
        path.unshift(current);
        current = previous[current];
    }

    return {
        path,
        cost: path.length - 1
    };
}