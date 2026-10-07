export function dfs(graph, start, end) {
    const visited = new Set();
    const previous = {};

    for (const node in graph) {
        previous[node] = null;
    }

    function search(current) {
        if (current === end) {
            return true;
        }

        visited.add(current);

        for (const neighbor in graph[current]) {
            if (!visited.has(neighbor)) {
                previous[neighbor] = current;

                if (search(neighbor)) {
                    return true;
                }
            }
        }

        return false;
    }

    const found = search(start);

    if (!found) {
        return {
            path: [],
            cost: Infinity
        };
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
        cost: path.length - 1
    };
}