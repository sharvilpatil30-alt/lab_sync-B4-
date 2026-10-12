import 'dotenv/config';
import { Pool, PoolConfig } from 'pg';

let internalPool: Pool | null = null;
let isConfigured = false;

if (process.env.DATABASE_URL) {
  try {
    const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 10000,
    };
    internalPool = new Pool(config);
    internalPool.on('error', (error) => {
      console.error('[PostgreSQL] Idle connection error:', error);
    });
    isConfigured = true;
    console.log('[PostgreSQL] Initialized database connection pool');
  } catch (err) {
    console.error('[PostgreSQL] Failed to initialize connection pool:', err);
  }
} else {
  console.warn('[PostgreSQL] DATABASE_URL is not configured in backend/.env. Operations will use persistence repository.');
}

export const pool = {
  get isConnected(): boolean {
    return isConfigured && internalPool !== null;
  },

  async query(text: string, params?: any[]) {
    if (!internalPool) {
      throw new Error('DATABASE_URL is not configured in backend/.env. Please configure DATABASE_URL to query PostgreSQL directly.');
    }
    return internalPool.query(text, params);
  },

  async connect() {
    if (!internalPool) {
      throw new Error('DATABASE_URL is not configured in backend/.env.');
    }
    return internalPool.connect();
  },

  on(event: any, listener: (...args: any[]) => void) {
    if (internalPool) {
      internalPool.on(event, listener);
    }
  },

  async end() {
    if (internalPool) {
      await internalPool.end();
      isConfigured = false;
      internalPool = null;
    }
  },
};
