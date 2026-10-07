import { dijkstra } from "./algorithms/dijkstra.js";
import { bellmanFord } from "./algorithms/bellmanford.js";
import { bfs } from "./algorithms/bfs.js";
import { dfs } from "./algorithms/dfs.js";

const graph = {
    CSE: {
        "D-08": 5,
        "D-07": 3
    },

    "D-08": {
        CSE: 5,
        "D-09": 2
    },

    "D-07": {
        CSE: 3,
        "D-09": 4
    },

    "D-09": {
        "D-08": 2,
        "D-07": 4
    }
};

const getRoute = (req, res) => {
    try {
        const {
            from,
            to,
            algorithm = "dijkstra"
        } = req.query;

        if (!from || !to) {
            return res.status(400).json({
                success: false,
                message: "Please provide from and to"
            });
        }

        if (!graph[from]) {
            return res.status(404).json({
                success: false,
                message: `Start location '${from}' not found`
            });
        }

        if (!graph[to]) {
            return res.status(404).json({
                success: false,
                message: `Destination '${to}' not found`
            });
        }

        const selectedAlgorithm = algorithm.toLowerCase();

        let result;

        if (selectedAlgorithm === "dijkstra") {
            result = dijkstra(graph, from, to);
        }

        else if (
            selectedAlgorithm === "bellmanford" ||
            selectedAlgorithm === "bellman-ford"
        ) {
            result = bellmanFord(graph, from, to);
        }

        else if (selectedAlgorithm === "bfs") {
            result = bfs(graph, from, to);
        }

        else if (selectedAlgorithm === "dfs") {
            result = dfs(graph, from, to);
        }

        else {
            return res.status(400).json({
                success: false,
                message: "Unsupported algorithm. Use dijkstra, bellmanford, bfs or dfs"
            });
        }

        return res.json({
            success: true,
            from,
            to,
            algorithm: selectedAlgorithm,
            path: result.path,
            distance: result.cost
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Routing failed",
            error: error.message
        });
    }
};

export { getRoute };