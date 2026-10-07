import test from "node:test";
import assert from "node:assert";

import { dijkstra } from "./modules/routing/algorithms/dijkstra.js";
import { bellmanFord } from "./modules/routing/algorithms/bellmanford.js";
import { bfs } from "./modules/routing/algorithms/bfs.js";
import { dfs } from "./modules/routing/algorithms/dfs.js";


// Demo campus graph
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


// Test 1: Dijkstra
test("Dijkstra should find a route", () => {
    const result = dijkstra(graph, "CSE", "D-08");

    assert.ok(result.path.length > 0);
});


// Test 2: Bellman-Ford
test("Bellman-Ford should find a route", () => {
    const result = bellmanFord(graph, "CSE", "D-08");

    assert.ok(result.path.length > 0);
});


// Test 3: BFS
test("BFS should find a route", () => {
    const result = bfs(graph, "CSE", "D-08");

    assert.ok(result.path.length > 0);
});


// Test 4: DFS
test("DFS should find a route", () => {
    const result = dfs(graph, "CSE", "D-08");

    assert.ok(result.path.length > 0);
});