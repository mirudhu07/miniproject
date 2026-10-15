import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5001').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/smartpark_ai_db'),
  DB_CONNECT_TIMEOUT_MS: z.string().default('3000').transform((val) => parseInt(val, 10)),
  ALLOW_DEV_MEMORY_DB: z.string().default('true').transform((val) => val === 'true'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters').default('smartpark_ai_jwt_dev_secret_key_secure_2026'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  ML_SERVICE_URL: z.string().default('http://127.0.0.1:8000'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('\n❌ Invalid environment variables configuration:');
  parsedEnv.error.issues.forEach((issue) => {
    console.error(`  - [${issue.path.join('.')}]: ${issue.message}`);
  });
  console.error('Please check your backend/.env configuration file.\n');
  process.exit(1);
}

export const ENV = parsedEnv.data;
