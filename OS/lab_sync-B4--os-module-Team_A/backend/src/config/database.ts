import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(config.mongoUri);
    console.log(`[Database] Connected successfully to MongoDB at ${config.mongoUri}`);
  } catch (error) {
    console.error('[Database] MongoDB connection failed:', error);
    // Don't crash in development if mongodb fails to start immediately; allow offline/reconnect
  }
}
