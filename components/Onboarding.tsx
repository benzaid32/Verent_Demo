
import React, { useEffect, useRef, useState } from 'react';
import { useLoginWithEmail, usePrivy } from '@privy-io/react-auth';
import { useCreateWallet, useWallets } from '@privy-io/react-auth/solana';
import { ArrowRight, Server, Search, Mail, CheckCircle2, Loader2, ChevronLeft, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';

const logo = new URL('../assets/Verent_icon.png', import.meta.url).href;

interface OnboardingProps {
  onComplete: (email: string, role: UserRole, privyToken: string, walletAddress?: string) => Promise<void>;
  error?: string | null;
}

type Step = 'role' | 'email' | 'verify';

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, error }) => {
  const { ready, getAccessToken, user, logout: privyLogout } = usePrivy();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const { createWallet } = useCreateWallet();
  const { wallets } = useWallets();
  const latestUserRef = useRef(user);
  const latestWalletsRef = useRef(wallets);
  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Network animation nodes
  const nodes = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4
  }));

  useEffect(() => {
    latestUserRef.current = user;
  }, [user]);

  useEffect(() => {
    latestWalletsRef.current = wallets;
  }, [wallets]);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setLocalError(null);
    setStep('email');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError(null);
    try {
      if (!selectedRole) {
        throw new Error('Please choose whether you are logging in as a renter or lister first.');
      }

      const normalizedEmail = normalizeEmail(email);
      setEmail(normalizedEmail);
      const activePrivyEmail = normalizeEmail(getEmailFromPrivyUser(user));

      if (activePrivyEmail) {
        if (activePrivyEmail === normalizedEmail) {
          await completeLogin(normalizedEmail, selectedRole, user, {
            getAccessToken,
            createWallet,
            latestUserRef,
            latestWalletsRef,
            onComplete
          });
          return;
        }

        await privyLogout();
        latestUserRef.current = null;
        latestWalletsRef.current = [];
        await sleep(250);
      }

      await sendCode({ email: normalizedEmail });
      setVerificationCode('');
      setStep('verify');
    } catch (caughtError) {
      setLocalError(caughtError instanceof Error ? caughtError.message : 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError(null);
    if (!selectedRole) {
      setIsLoading(false);
      return;
    }

    try {
      const loginResult = await loginWithCode({ code: verificationCode.trim() });
      await completeLogin(email, selectedRole, getUserFromLoginResult(loginResult), {
        getAccessToken,
        createWallet,
        latestUserRef,
        latestWalletsRef,
        onComplete
      });
    } catch (caughtError) {
      setLocalError(caughtError instanceof Error ? caughtError.message : 'Failed to verify your email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setStep('email');
      return;
    }

    setIsLoading(true);
    setLocalError(null);
    try {
      const normalizedEmail = normalizeEmail(email);
      setEmail(normalizedEmail);
      const activePrivyEmail = normalizeEmail(getEmailFromPrivyUser(user));
      if (activePrivyEmail && activePrivyEmail !== normalizedEmail) {
        await privyLogout();
        latestUserRef.current = null;
        latestWalletsRef.current = [];
        await sleep(250);
      }

      await sendCode({ email: normalizedEmail });
      setVerificationCode('');
      setStep('verify');
    } catch (caughtError) {
      setLocalError(caughtError instanceof Error ? caughtError.message : 'Failed to send a new verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex overflow-hidden animate-in fade-in duration-500">
      {/* Left Side: Immersive Visualization */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#050505] relative overflow-hidden items-center justify-center">
        {/* Abstract Grid Background */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
               backgroundImage: 'radial-gradient(circle at center, #333 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }}>
        </div>

        {/* Glowing Green Gradient / Fog */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-verent-green/10 to-transparent pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-verent-green/5 rounded-full blur-[120px] pointer-events-none"></div>

        {/* 3D-style Network Visualization */}
        <div className="relative w-full h-full max-w-2xl max-h-2xl opacity-80">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Connections */}
                <g className="stroke-gray-800 stroke-[0.2]">
                    {nodes.map((node, i) => (
                        nodes.slice(i + 1, i + 3).map((target, j) => (
                            <line 
                                key={`${i}-${j}`}
                                x1={node.x} y1={node.y}
                                x2={target.x} y2={target.y}
                                className="animate-pulse"
                            />
                        ))
                    ))}
                </g>
                
                {/* Nodes */}
                {nodes.map((node) => (
                    <g key={node.id} className="animate-pulse" style={{ animationDuration: `${node.duration}s` }}>
                        <circle cx={node.x} cy={node.y} r="0.8" fill="#F5B800" className="drop-shadow-[0_0_8px_rgba(245,184,0,0.8)]" />
                        <circle cx={node.x} cy={node.y} r="4" fill="transparent" stroke="#F5B800" strokeWidth="0.1" className="opacity-30 animate-ping" style={{ animationDuration: `${node.duration + 2}s` }} />
                    </g>
                ))}
            </svg>
        </div>

        {/* Text Overlay */}
        <div className="absolute bottom-12 left-12 max-w-md">
            <div className="flex items-center space-x-3 mb-4">
                 <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-[0_0_20px_rgba(245,184,0,0.4)] overflow-hidden">
                    <img
                      src={logo}
                      alt="Verent logo"
                      className="w-7 h-7 object-contain"
                    />
                 </div>
                <span className="text-2xl font-bold text-white tracking-tight">Verent.</span>
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight mb-2">The Decentralized<br/>Hardware Network.</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
                Access high-performance compute and cinematic equipment on-demand, or monetize your idle assets. Secured by Solana.
            </p>
        </div>
      </div>

      {/* Right Side: Interface */}
      <div className="relative flex w-full flex-col bg-white lg:w-1/2">
        <div className="absolute right-4 top-4 sm:right-8 sm:top-8">
            <div className="text-xs font-medium text-gray-400">
                Step {step === 'role' ? '1' : step === 'email' ? '2' : '3'} of 3
            </div>
        </div>

        {step !== 'role' && (
             <button 
                onClick={() => setStep(step === 'verify' ? 'email' : 'role')}
                className="absolute left-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900 sm:left-8 sm:top-8"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
        )}

        <div className="flex flex-1 items-center justify-center p-4 pt-16 sm:p-8 sm:pt-20 lg:p-12">
            <div className="w-full max-w-md space-y-6 sm:space-y-8">
                
                {/* STEP 1: ROLE SELECTION */}
                {step === 'role' && (
                    <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                        <div className="mb-10">
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Choose your path</h1>
                            <p className="text-gray-500">Select how you want to use the Verent protocol today.</p>
                        </div>

                        <div className="grid gap-4">
                            <button 
                                onClick={() => handleRoleSelect('renter')}
                                className="group relative flex items-start rounded-2xl border border-gray-200 bg-white p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-verent-green hover:ring-1 hover:ring-verent-green hover:shadow-xl hover:shadow-verent-green/5 sm:p-6"
                            >
                                <div className="bg-gray-50 p-3 rounded-xl group-hover:bg-verent-green/10 transition-colors mr-5">
                                    <Search className="w-6 h-6 text-gray-600 group-hover:text-verent-green" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">Renter</h3>
                                    <p className="text-sm text-gray-500 leading-snug">
                                        Access GPU clusters, drones, and cinema cameras. Pay per hour with USDC.
                                    </p>
                                </div>
                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                                    <ArrowRight className="w-5 h-5 text-verent-green" />
                                </div>
                            </button>

                            <button 
                                onClick={() => handleRoleSelect('owner')}
                                className="group relative flex items-start rounded-2xl border border-gray-200 bg-white p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-verent-green hover:ring-1 hover:ring-verent-green hover:shadow-xl hover:shadow-verent-green/5 sm:p-6"
                            >
                                <div className="bg-gray-50 p-3 rounded-xl group-hover:bg-verent-green/10 transition-colors mr-5">
                                    <Server className="w-6 h-6 text-gray-600 group-hover:text-verent-green" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">Lister</h3>
                                    <p className="text-sm text-gray-500 leading-snug">
                                        Supply hardware to the network. Earn passive income on idle assets.
                                    </p>
                                </div>
                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                                    <ArrowRight className="w-5 h-5 text-verent-green" />
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: EMAIL INPUT */}
                {step === 'email' && (
                    <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                         <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Create account</h1>
                            <p className="text-gray-500">Enter your email to create your embedded wallet.</p>
                        </div>
                        
                        <form onSubmit={handleEmailSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-verent-green transition-colors" />
                                    <input 
                                        type="email" 
                                        required
                                        autoFocus
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                                        placeholder="name@company.com"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={isLoading || !email || !ready}
                                className="w-full bg-verent-yellow text-verent-black font-bold py-4 rounded-xl hover:bg-verent-yellow-dark transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-xl shadow-verent-yellow/25 hover:shadow-verent-yellow/40 hover:-translate-y-0.5"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span>Continue with Email</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                        {localError && (
                            <p className="text-sm text-red-500">{localError}</p>
                        )}
                         <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-gray-400">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Secured by Privy</span>
                        </div>
                    </div>
                )}

                 {/* STEP 3: VERIFICATION */}
                 {step === 'verify' && (
                    <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                         <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Check your inbox</h1>
                            <p className="text-gray-500">We sent a temporary login code to <span className="text-gray-900 font-medium">{email}</span></p>
                        </div>
                        
                        <form onSubmit={handleVerifySubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider ml-1">Verification Code</label>
                                <input 
                                    type="text" 
                                    required
                                    maxLength={6}
                                    autoFocus
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-center font-mono text-2xl tracking-[0.35em] text-gray-900 outline-none transition-all placeholder-gray-300 focus:border-verent-green focus:bg-white focus:ring-2 focus:ring-verent-green/20 sm:text-3xl sm:tracking-[0.5em]"
                                    placeholder="000000"
                                />
                            </div>
                            {(localError || error) && (
                                <p className="text-sm text-red-500">{localError || error}</p>
                            )}
                            <button 
                                type="submit" 
                                disabled={isLoading || !ready}
                                className="w-full bg-verent-yellow text-verent-black font-bold py-4 rounded-xl hover:bg-verent-yellow-dark transition-all disabled:opacity-70 flex items-center justify-center space-x-2 shadow-xl shadow-verent-yellow/25 hover:shadow-verent-yellow/40 hover:-translate-y-0.5"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span>Verify & Launch</span>
                                        <CheckCircle2 className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                         <div className="mt-8 text-center">
                            <button 
                                onClick={() => void handleResendCode()}
                                className="text-sm text-gray-500 hover:text-gray-900 font-medium underline decoration-gray-300 underline-offset-4"
                            >
                                Send a new code
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

function getWalletAddressFromPrivyUser(user: unknown): string | undefined {
  if (!user || typeof user !== 'object') {
    return undefined;
  }
  const candidate = user as Record<string, unknown>;
  const directWallet =
    typeof candidate.walletAddress === 'string'
      ? candidate.walletAddress
      : typeof candidate.wallet_address === 'string'
        ? candidate.wallet_address
        : undefined;
  if (directWallet) {
    return directWallet;
  }

  const linkedAccountsRaw =
    Array.isArray(candidate.linkedAccounts)
      ? candidate.linkedAccounts
      : Array.isArray(candidate.linked_accounts)
        ? candidate.linked_accounts
        : [];

  for (const account of linkedAccountsRaw) {
    if (!account || typeof account !== 'object') {
      continue;
    }
    const linked = account as Record<string, unknown>;
    const address =
      typeof linked.address === 'string'
        ? linked.address
        : typeof linked.walletAddress === 'string'
          ? linked.walletAddress
          : typeof linked.wallet_address === 'string'
            ? linked.wallet_address
            : undefined;
    if (!address) {
      continue;
    }
    const chainType = typeof linked.chainType === 'string' ? linked.chainType.toLowerCase() : typeof linked.chain_type === 'string' ? linked.chain_type.toLowerCase() : '';
    const accountType = typeof linked.type === 'string' ? linked.type.toLowerCase() : '';
    if (chainType === 'solana' || accountType === 'wallet') {
      return address;
    }
  }

  return undefined;
}

function getEmailFromPrivyUser(user: unknown): string | undefined {
  if (!user || typeof user !== 'object') {
    return undefined;
  }

  const candidate = user as Record<string, unknown>;
  if (typeof candidate.email === 'string' && candidate.email.trim()) {
    return candidate.email.trim();
  }

  const linkedAccountsRaw =
    Array.isArray(candidate.linkedAccounts)
      ? candidate.linkedAccounts
      : Array.isArray(candidate.linked_accounts)
        ? candidate.linked_accounts
        : [];

  for (const account of linkedAccountsRaw) {
    if (!account || typeof account !== 'object') {
      continue;
    }
    const linked = account as Record<string, unknown>;
    const accountType = typeof linked.type === 'string' ? linked.type.toLowerCase() : '';
    if (accountType !== 'email') {
      continue;
    }
    const address =
      typeof linked.address === 'string'
        ? linked.address
        : typeof linked.email === 'string'
          ? linked.email
          : undefined;
    if (address?.trim()) {
      return address.trim();
    }
  }

  return undefined;
}

function getUserFromLoginResult(loginResult: unknown): unknown {
  if (!loginResult || typeof loginResult !== 'object') {
    return undefined;
  }
  const result = loginResult as Record<string, unknown>;
  if (result.user) {
    return result.user;
  }
  const loginField = result.login;
  if (loginField && typeof loginField === 'object' && (loginField as Record<string, unknown>).user) {
    return (loginField as Record<string, unknown>).user;
  }
  return undefined;
}

function getWalletAddressFromWallets(wallets: unknown): string | undefined {
  if (!Array.isArray(wallets)) {
    return undefined;
  }
  for (const wallet of wallets) {
    const address = getWalletAddressFromCreateWalletResult(wallet);
    if (address) {
      return address;
    }
  }
  return undefined;
}

function getWalletAddressFromCreateWalletResult(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') {
    return undefined;
  }
  const candidate = result as Record<string, unknown>;
  if (typeof candidate.address === 'string') {
    return candidate.address;
  }
  if (candidate.wallet && typeof candidate.wallet === 'object') {
    const nestedWallet = candidate.wallet as Record<string, unknown>;
    if (typeof nestedWallet.address === 'string') {
      return nestedWallet.address;
    }
    if (typeof nestedWallet.walletAddress === 'string') {
      return nestedWallet.walletAddress;
    }
  }
  if (typeof candidate.walletAddress === 'string') {
    return candidate.walletAddress;
  }
  return undefined;
}

async function waitForEmbeddedWalletAddress(
  loginUser: unknown,
  latestUserRef: React.MutableRefObject<unknown>,
  latestWalletsRef: React.MutableRefObject<unknown>
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const resolvedWalletAddress =
      getWalletAddressFromPrivyUser(loginUser) ??
      getWalletAddressFromPrivyUser(latestUserRef.current) ??
      getWalletAddressFromWallets(latestWalletsRef.current);
    if (resolvedWalletAddress) {
      return resolvedWalletAddress;
    }
    await sleep(400);
  }

  return undefined;
}

function normalizeEmail(value: string | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

async function completeLogin(
  email: string,
  role: UserRole,
  loginUser: unknown,
  options: {
    getAccessToken: () => Promise<string | null>;
    createWallet: () => Promise<unknown>;
    latestUserRef: React.MutableRefObject<unknown>;
    latestWalletsRef: React.MutableRefObject<unknown>;
    onComplete: (email: string, role: UserRole, privyToken: string, walletAddress?: string) => Promise<void>;
  }
) {
  const normalizedEmail = normalizeEmail(email);
  const privyToken = await options.getAccessToken();
  if (!privyToken) {
    throw new Error('Privy did not return an access token.');
  }

  let resolvedWalletAddress =
    getWalletAddressFromPrivyUser(loginUser) ??
    getWalletAddressFromPrivyUser(options.latestUserRef.current) ??
    getWalletAddressFromWallets(options.latestWalletsRef.current);

  if (!resolvedWalletAddress) {
    resolvedWalletAddress = await waitForEmbeddedWalletAddress(loginUser, options.latestUserRef, options.latestWalletsRef);
  }

  if (!resolvedWalletAddress) {
    try {
      const createdWallet = await options.createWallet();
      resolvedWalletAddress =
        getWalletAddressFromCreateWalletResult(createdWallet) ??
        await waitForEmbeddedWalletAddress(loginUser, options.latestUserRef, options.latestWalletsRef);
    } catch (caughtWalletError) {
      const message = caughtWalletError instanceof Error ? caughtWalletError.message : '';
      if (!message.toLowerCase().includes('already has an embedded wallet')) {
        throw caughtWalletError;
      }
      resolvedWalletAddress = await waitForEmbeddedWalletAddress(loginUser, options.latestUserRef, options.latestWalletsRef);
    }
  }

  if (!resolvedWalletAddress) {
    throw new Error('Privy wallet address is not available yet. Please try again in a moment.');
  }

  await options.onComplete(normalizedEmail, role, privyToken, resolvedWalletAddress);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default Onboarding;
