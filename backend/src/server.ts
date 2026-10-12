import app from './app.js';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Initialize MongoDB connection
connectDatabase().catch((err) => console.warn('[Database] Initial connection notice:', err));

app.listen(PORT, () => {
  console.log(`Smart Campus Backend Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
});
