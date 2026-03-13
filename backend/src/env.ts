import 'dotenv/config';
import { z } from 'zod';

const boolFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off' || normalized === '') {
      return false;
    }
  }
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  APP_ORIGIN: z.string().trim().min(1).optional(),
  BACKEND_JWT_SECRET: z.string().trim().min(16).optional(),
  DATA_PROVIDER: z.enum(['file', 'supabase']).default('file'),
  DEMO_MODE: boolFromEnv.default(false),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_LISTINGS_BUCKET: z.string().optional(),
  GOOGLE_GENAI_API_KEY: z.string().optional(),
  SOLANA_RPC_URL: z.string().default('https://api.devnet.solana.com'),
  SOLANA_CLUSTER: z.string().default('devnet'),
  TREASURY_SECRET_KEY: z.string().optional(),
  TREASURY_PUBLIC_KEY: z.string().optional(),
  PRIVY_APP_ID: z.string().optional(),
  PRIVY_VERIFICATION_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  VERENT_RENTALS_PROGRAM_ID: z.string().optional(),
  VERENT_USDC_MINT: z.string().optional(),
  VERENT_VRNT_MINT: z.string().optional(),
  VERENT_STAKING_COOLDOWN_SECONDS: z.coerce.number().optional(),
  VERENT_STAKING_REWARD_RATE_VRNT_PER_SECOND: z.coerce.number().optional(),
  VERENT_STAKING_INITIAL_REWARD_VRNT: z.coerce.number().optional()
});

export const env = envSchema.parse(process.env);

function hasValue(value?: string) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getEnvIssues() {
  const issues: string[] = [];
  const productionLike = env.NODE_ENV === 'production';

  if (!hasValue(env.APP_ORIGIN)) {
    issues.push('APP_ORIGIN is required.');
  }

  if (!hasValue(env.BACKEND_JWT_SECRET)) {
    issues.push('BACKEND_JWT_SECRET is required.');
  } else if (env.BACKEND_JWT_SECRET === 'development-only-secret-change-me') {
    issues.push('BACKEND_JWT_SECRET must not use the development placeholder.');
  }

  if (env.DATA_PROVIDER === 'supabase') {
    if (!hasValue(env.SUPABASE_URL)) {
      issues.push('SUPABASE_URL is required when DATA_PROVIDER=supabase.');
    }
    if (!hasValue(env.SUPABASE_SERVICE_ROLE_KEY)) {
      issues.push('SUPABASE_SERVICE_ROLE_KEY is required when DATA_PROVIDER=supabase.');
    }
  }

  if (!env.DEMO_MODE && !hasValue(env.PRIVY_VERIFICATION_KEY)) {
    issues.push('PRIVY_VERIFICATION_KEY is required when DEMO_MODE=false.');
  }

  if (productionLike && !hasValue(env.PRIVY_APP_ID)) {
    issues.push('PRIVY_APP_ID should be configured in production.');
  }

  return issues;
}

export function assertRequiredEnv() {
  const issues = getEnvIssues();
  if (issues.length > 0) {
    throw new Error(`Invalid backend environment configuration: ${issues.join(' ')}`);
  }
}
