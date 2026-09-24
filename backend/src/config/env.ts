import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_campus_optimizer',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_key_12345',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  schedulingProvider: process.env.SCHEDULING_PROVIDER || 'basic',
  routingProvider: process.env.ROUTING_PROVIDER || 'mock',
  coreDataProvider: process.env.CORE_DATA_PROVIDER || 'mock',
};
