import express from "express";
import cors from "cors";

import routingRoutes from "./src/modules/routing/routes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Campus Lab Resource Optimizer Backend is running!"
  });
});

// Routing Engine API
app.use("/api/routing", routingRoutes);

// Server port
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});