import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

function readEnvValue(key: string) {
  const paths = ['.env', 'backend/.env'];
  for (const filePath of paths) {
    if (!existsSync(filePath)) {
      continue;
    }
    const content = readFileSync(filePath, 'utf8');
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
    if (match?.[1]) {
      return match[1].replace(/^"|"$/g, '');
    }
  }
  return undefined;
}

const privyAppId = process.env.VITE_PRIVY_APP_ID || process.env.PRIVY_APP_ID || readEnvValue('VITE_PRIVY_APP_ID') || readEnvValue('PRIVY_APP_ID');
const privyClientId = process.env.VITE_PRIVY_CLIENT_ID || process.env.PRIVY_CLIENT_ID || readEnvValue('VITE_PRIVY_CLIENT_ID') || readEnvValue('PRIVY_CLIENT_ID') || '';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry'
  },
  webServer: [
    {
      command: 'npm --prefix backend run dev',
      url: 'http://127.0.0.1:4000/health',
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 3000',
      url: 'http://127.0.0.1:3000',
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:4000',
        ...(privyAppId ? { VITE_PRIVY_APP_ID: privyAppId } : {}),
        VITE_PRIVY_CLIENT_ID: privyClientId
      },
      reuseExistingServer: true,
      timeout: 120000
    }
  ]
});
