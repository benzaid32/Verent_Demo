import { importSPKI, jwtVerify } from 'jose';
import { env } from './env.js';

type JwtPayloadLike = Record<string, unknown>;

function readWalletFromLinkedAccounts(payload: JwtPayloadLike): string {
  const linkedAccounts = payload.linked_accounts;
  if (!Array.isArray(linkedAccounts)) {
    return '';
  }

  for (const account of linkedAccounts) {
    if (!account || typeof account !== 'object') {
      continue;
    }
    const walletCandidate = account as Record<string, unknown>;
    const accountType = typeof walletCandidate.type === 'string' ? walletCandidate.type.toLowerCase() : '';
    const chainType = typeof walletCandidate.chain_type === 'string' ? walletCandidate.chain_type.toLowerCase() : '';
    const address =
      typeof walletCandidate.address === 'string'
        ? walletCandidate.address
        : typeof walletCandidate.wallet_address === 'string'
          ? walletCandidate.wallet_address
          : '';

    if (!address) {
      continue;
    }

    if (accountType === 'wallet' || chainType === 'solana') {
      return address;
    }
  }

  return '';
}

export async function verifyPrivyToken(token: string) {
  if (!env.PRIVY_VERIFICATION_KEY) {
    throw new Error('PRIVY_VERIFICATION_KEY is not configured');
  }

  const normalizedKey = env.PRIVY_VERIFICATION_KEY.replace(/\\n/g, '\n');
  const publicKey = await importSPKI(normalizedKey, 'ES256');
  const verified = await jwtVerify(token, publicKey);
  const payload = verified.payload as JwtPayloadLike;
  const directWalletAddress = typeof payload.wallet_address === 'string' ? payload.wallet_address : '';
  const linkedWalletAddress = readWalletFromLinkedAccounts(payload);

  return {
    subject: verified.payload.sub ?? '',
    email: typeof verified.payload.email === 'string' ? verified.payload.email : '',
    walletAddress: directWalletAddress || linkedWalletAddress
  };
}
