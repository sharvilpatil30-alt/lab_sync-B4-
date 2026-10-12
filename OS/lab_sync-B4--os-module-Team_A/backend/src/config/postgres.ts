import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

export function getPostgresPool(): pg.Pool | null {
  if (poolInstance) {
    return poolInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  poolInstance = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' || connectionString.includes('supabase')
      ? { rejectUnauthorized: false }
      : undefined,
    max: 10,
    connectionTimeoutMillis: 10000,
  });

  poolInstance.on('error', (err) => {
    console.error('[PostgreSQL] Idle client error:', err);
  });

  return poolInstance;
}

export const pool = {
  query: async (text: string, params?: any[]) => {
    const p = getPostgresPool();
    if (!p) {
      throw new Error('DATABASE_URL is not configured in the environment');
    }
    return p.query(text, params);
  },
  getPool: () => getPostgresPool(),
};

