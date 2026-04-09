
import React, { useEffect, useState } from 'react';
import { useExportWallet, useSignAndSendTransaction, useWallets } from '@privy-io/react-auth/solana';
import bs58 from 'bs58';
import { Connection, PublicKey, SystemProgram, Transaction as SolanaTransaction, TransactionInstruction } from '@solana/web3.js';
import QRCode from 'qrcode';
import { WalletState, Transaction } from '../types';
import { Copy, ArrowUpRight, ArrowDownLeft, RefreshCw, History, Shield, AlertCircle, Loader2, ExternalLink, CheckCircle2, Key, Lock, Wallet, Sparkles } from 'lucide-react';
import TransactionSuccessDialog from './TransactionSuccessDialog';
import { ASSOCIATED_TOKEN_PROGRAM_ID, deriveAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '../shared/protocol';

interface WalletViewProps {
  wallet: WalletState;
  transactions: Transaction[];
  onWithdraw: (
    recipientAddress: string,
    amount: number,
    currency: 'SOL' | 'USDC' | 'VRNT',
    meta?: { transactionHash?: string; explorerUrl?: string }
  ) => Promise<{ transactionHash: string; explorerUrl: string }>;
  onRefresh: () => Promise<void>;
}

const WalletView: React.FC<WalletViewProps> = ({ wallet, transactions, onWithdraw, onRefresh }) => {
  const DEVNET_USDC_MINT = import.meta.env.VITE_VERENT_USDC_MINT?.trim() || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
  const { wallets: embeddedWallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { exportWallet } = useExportWallet();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history' | 'export'>('deposit');
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [depositQrCode, setDepositQrCode] = useState('');
  const [exporting, setExporting] = useState(false);

  // Withdraw State
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawCurrency, setWithdrawCurrency] = useState<'SOL' | 'USDC' | 'VRNT'>('SOL');
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'preparing' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [withdrawProof, setWithdrawProof] = useState<{ signature: string; recipient: string } | null>(null);
  const embeddedWallet = embeddedWallets.find((item) => item.address === wallet.address) ?? embeddedWallets[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let disposed = false;

    void QRCode.toDataURL(wallet.address, {
      margin: 1,
      width: 256,
      color: {
        dark: '#111111',
        light: '#FFFFFF'
      }
    }).then((dataUrl) => {
      if (!disposed) {
        setDepositQrCode(dataUrl);
      }
    }).catch(() => {
      if (!disposed) {
        setDepositQrCode('');
      }
    });

    return () => {
      disposed = true;
    };
  }, [wallet.address]);

  const encodeU64 = (value: bigint) => {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(value);
    return buffer;
  };

  const buildCreateAssociatedTokenAccountInstruction = (payer: string, owner: string, mint: string) => {
    const associatedTokenAddress = deriveAssociatedTokenAddress(owner, mint);

    return new TransactionInstruction({
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: new PublicKey(payer), isSigner: true, isWritable: true },
        { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
        { pubkey: new PublicKey(owner), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(mint), isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
      ],
      data: Buffer.alloc(0)
    });
  };

  const buildTransferCheckedInstruction = (params: {
    source: string;
    mint: string;
    destination: string;
    owner: string;
    amount: bigint;
    decimals: number;
  }) => new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: new PublicKey(params.source), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(params.mint), isSigner: false, isWritable: false },
      { pubkey: new PublicKey(params.destination), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(params.owner), isSigner: true, isWritable: false }
    ],
    data: Buffer.concat([
      Buffer.from([12]),
      encodeU64(params.amount),
      Buffer.from([params.decimals])
    ])
  });

  const getTokenMintForCurrency = (currency: 'SOL' | 'USDC' | 'VRNT') => {
    if (currency === 'USDC') {
      return DEVNET_USDC_MINT;
    }
    if (currency === 'VRNT') {
      return wallet.vrntMint;
    }
    return undefined;
  };

  const validateWithdrawal = () => {
    if (!withdrawAddress) return "Recipient address is required";
    if (!withdrawAmount) return "Amount is required";
    if (isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) return "Invalid amount";

    try {
      new PublicKey(withdrawAddress);
    } catch {
      return "Invalid Solana address format";
    }

    // Balance check
    const amount = Number(withdrawAmount);
    const fee = 0.000005;
    if (withdrawCurrency === 'SOL' && amount + fee > wallet.solBalance) {
      return `Insufficient balance. You need ${amount + fee} SOL`;
    }
    
    if (withdrawCurrency === 'USDC' && amount > wallet.usdcBalance) {
      return `Insufficient USDC balance`;
    }

    if (withdrawCurrency === 'VRNT' && amount > wallet.vrntBalance) {
        return `Insufficient VRNT balance`;
    }

    if ((withdrawCurrency === 'USDC' || withdrawCurrency === 'VRNT') && !getTokenMintForCurrency(withdrawCurrency)) {
      return `${withdrawCurrency} mint is not configured for this wallet`;
    }

    return null;
  };

  const handleWithdraw = async () => {
    const error = validateWithdrawal();
    if (error) {
      setErrorMessage(error);
      setWithdrawStatus('error');
      return;
    }

    if (!embeddedWallet) {
      setErrorMessage('Embedded Solana wallet not available in Privy yet.');
      setWithdrawStatus('error');
      return;
    }

    setErrorMessage('');
    setWithdrawStatus('preparing');

    try {
      const amount = Number(withdrawAmount);
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const payerAddress = embeddedWallet.address;
      const transaction = new SolanaTransaction({
        feePayer: new PublicKey(embeddedWallet.address),
        recentBlockhash: blockhash
      });

      if (withdrawCurrency === 'SOL') {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(payerAddress),
            toPubkey: new PublicKey(withdrawAddress),
            lamports: Math.round(amount * 1_000_000_000)
          })
        );
      } else {
        const mint = getTokenMintForCurrency(withdrawCurrency);
        if (!mint) {
          throw new Error(`${withdrawCurrency} mint is not configured`);
        }

        const senderTokenAccount = deriveAssociatedTokenAddress(payerAddress, mint);
        const recipientTokenAccount = deriveAssociatedTokenAddress(withdrawAddress, mint);
        const recipientTokenAccountInfo = await connection.getAccountInfo(recipientTokenAccount, 'confirmed');

        if (!recipientTokenAccountInfo) {
          transaction.add(buildCreateAssociatedTokenAccountInstruction(payerAddress, withdrawAddress, mint));
        }

        transaction.add(buildTransferCheckedInstruction({
          source: senderTokenAccount.toBase58(),
          mint,
          destination: recipientTokenAccount.toBase58(),
          owner: payerAddress,
          amount: BigInt(Math.round(amount * 1_000_000)),
          decimals: 6
        }));
      }

      setWithdrawStatus('signing');
      const result = await signAndSendTransaction({
        transaction: new Uint8Array(transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false
        })),
        wallet: embeddedWallet,
        chain: 'solana:devnet'
      });
      const transactionHash = bs58.encode(result.signature);
      const explorerUrl = `https://explorer.solana.com/tx/${transactionHash}?cluster=devnet`;

      setWithdrawStatus('confirming');
      await connection.confirmTransaction({ signature: transactionHash, blockhash, lastValidBlockHeight }, 'confirmed');
      await onWithdraw(withdrawAddress, amount, withdrawCurrency, {
        transactionHash,
        explorerUrl
      });
      
      setWithdrawStatus('success');
      setWithdrawProof({
        signature: transactionHash,
        recipient: withdrawAddress
      });
      setWithdrawAmount('');
      setWithdrawAddress('');

    } catch (caughtError) {
      setErrorMessage(caughtError instanceof Error ? caughtError.message : 'Transaction failed on-chain. Please try again.');
      setWithdrawStatus('error');
    }
  };

  const handleExportWallet = async () => {
    if (!embeddedWallet) {
      return;
    }

    setExporting(true);
    try {
      await exportWallet({ address: embeddedWallet.address });
    } catch (caughtError) {
      setErrorMessage(caughtError instanceof Error ? caughtError.message : 'Failed to open wallet export.');
      setActiveTab('export');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto mb-12 max-w-5xl space-y-6 px-4 py-5 animate-in fade-in duration-500 sm:px-6 sm:py-6 lg:space-y-8">
      {/* Header & Balance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-[#0a0a0a] p-5 text-white shadow-2xl shadow-black/20 sm:p-6 lg:col-span-2 lg:p-8">
           <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-verent-green/20 to-transparent rounded-bl-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-sm text-gray-400 font-medium uppercase tracking-wider flex items-center space-x-2">
                            <Wallet className="w-4 h-4" />
                            <span>Wallet Snapshot</span>
                            {refreshing && <Loader2 className="w-3 h-3 animate-spin" />}
                        </span>
                        <div className="mt-2 flex items-baseline space-x-2">
                            <span className="text-2xl font-bold font-mono tracking-tight text-white">{wallet.address.slice(0, 6)}...{wallet.address.slice(-6)}</span>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Updated {new Date(wallet.updatedAt).toLocaleString()}</p>
                    </div>
                    <button onClick={() => void handleRefresh()} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors" title="Refresh Balance">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                
                <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 backdrop-blur-sm">
                         <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Liquid USDC</p>
                         <p className="text-lg font-mono font-medium text-white">{wallet.usdcBalance.toLocaleString()} USDC</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 backdrop-blur-sm">
                         <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">VRNT Tokens</p>
                         <p className="text-lg font-mono font-medium text-verent-green">{wallet.vrntBalance.toLocaleString()} VRNT</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1">
                            <Lock className="w-3 h-3 text-gray-600" />
                        </div>
                         <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Staked VRNT</p>
                         <p className="text-lg font-mono font-medium text-blue-400">{wallet.stakedVrntBalance.toLocaleString()} VRNT</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-1">
             <div>
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Gas Tank</h3>
                    <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Solana</span>
                 </div>
                 
                 <div className="text-center py-6">
                    <p className="text-3xl font-mono font-bold text-gray-900">{wallet.solBalance.toFixed(4)} <span className="text-base font-sans font-medium text-gray-500">SOL</span></p>
                    <p className="text-xs text-gray-400 mt-1">Enough for ~{(wallet.solBalance / 0.000005).toFixed(0)} transactions</p>
                 </div>

                 <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500 mb-1">Public Address</p>
                    <div className="flex items-start justify-between gap-3">
                        <code className="min-w-0 flex-1 break-all text-[11px] text-gray-900 font-mono sm:text-xs">{wallet.address}</code>
                        <button onClick={handleCopy} className="flex-shrink-0 text-verent-green hover:text-green-700 transition-colors">
                            {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </div>
                 </div>
             </div>
        </div>
      </div>

      {/* Main Action Area */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="no-scrollbar flex items-center overflow-x-auto border-b border-gray-100 bg-gray-50/50 px-3 pt-2 sm:px-6">
            {[
                { id: 'deposit', label: 'Deposit', icon: ArrowDownLeft },
                { id: 'withdraw', label: 'Withdraw', icon: ArrowUpRight },
                { id: 'history', label: 'History', icon: History },
                { id: 'export', label: 'Security', icon: Key }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === tab.id 
                        ? 'border-verent-green text-gray-900 bg-white rounded-t-lg' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                    }`}
                >
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-verent-green' : 'text-gray-400'}`} />
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>

        <div className="min-h-[400px] p-4 sm:p-6 lg:p-8">
            {/* DEPOSIT VIEW */}
            {activeTab === 'deposit' && (
                <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:space-y-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold text-gray-900">Deposit Assets</h2>
                        <p className="text-sm text-gray-500">Send SOL, USDC, or VRNT to your embedded wallet address.</p>
                    </div>
                    
                    <div className="group relative rounded-2xl border-2 border-dashed border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                        <div className="absolute inset-0 bg-verent-green/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
                        {depositQrCode ? (
                          <img src={depositQrCode} alt="Wallet deposit QR code" className="h-36 w-36 rounded-xl sm:h-48 sm:w-48" />
                        ) : (
                          <div className="flex h-36 w-36 items-center justify-center rounded-xl bg-gray-50 px-6 text-center text-xs font-medium text-gray-500 sm:h-48 sm:w-48">
                            Generating QR code...
                          </div>
                        )}
                    </div>

                    <div className="w-full max-w-md">
                        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Deposit Address</p>
                                <span className="block break-all font-mono text-xs leading-6 text-gray-600 sm:text-sm">
                                  {wallet.address}
                                </span>
                              </div>
                            <button 
                                onClick={handleCopy}
                                className="inline-flex items-center justify-center space-x-2 self-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 transition-colors hover:bg-gray-50 sm:self-center"
                            >
                                {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                <span>Copy</span>
                            </button>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start space-x-3">
                            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-800">
                                <p className="font-bold mb-1">Network Warning</p>
                                <p>Only send Solana (SOL) or SPL tokens (USDC/VRNT) to this address. Sending other assets may result in permanent loss. Deposits require 1 confirmation (~400ms).</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WITHDRAW VIEW */}
            {activeTab === 'withdraw' && (
                <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900">Withdraw Funds</h2>
                        <p className="text-sm text-gray-500 mt-1">Transfer assets to an external Solana wallet.</p>
                    </div>

                    {withdrawStatus === 'success' ? (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-green-900">Transaction Successful</h3>
                            <p className="text-sm text-green-700">Your transfer was confirmed on Solana and detailed proof is available in the on-chain dialog.</p>
                            <button 
                                onClick={() => { setWithdrawStatus('idle'); setWithdrawAmount(''); setWithdrawAddress(''); setWithdrawProof(null); }}
                                className="mt-4 bg-white border border-green-200 text-green-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-50"
                            >
                                Make Another Transfer
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Asset</label>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                                    <button 
                                        onClick={() => setWithdrawCurrency('SOL')}
                                        className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-center space-x-2 transition-all ${withdrawCurrency === 'SOL' ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"></span>
                                        <span>SOL</span>
                                    </button>
                                    <button 
                                        onClick={() => setWithdrawCurrency('USDC')}
                                        className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-center space-x-2 transition-all ${withdrawCurrency === 'USDC' ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        <span>USDC</span>
                                    </button>
                                    <button 
                                        onClick={() => setWithdrawCurrency('VRNT')}
                                        className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-center space-x-2 transition-all ${withdrawCurrency === 'VRNT' ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-verent-green"></span>
                                        <span>VRNT</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Recipient Address</label>
                                <input 
                                    type="text" 
                                    value={withdrawAddress}
                                    onChange={(e) => setWithdrawAddress(e.target.value)}
                                    placeholder="Enter Solana address (e.g. 8xY...)"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</label>
                                    <span className="text-xs text-gray-500">
                                        Available: <span className="font-medium text-gray-900">{
                                            withdrawCurrency === 'SOL' ? wallet.solBalance.toFixed(4) :
                                            withdrawCurrency === 'USDC' ? wallet.usdcBalance.toFixed(2) :
                                            wallet.vrntBalance.toLocaleString()
                                        } {withdrawCurrency}</span>
                                    </span>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-4 pr-20 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none font-mono text-sm"
                                    />
                                    <button 
                                        onClick={() => setWithdrawAmount(
                                            withdrawCurrency === 'SOL' ? (wallet.solBalance - 0.00001).toFixed(4) :
                                            withdrawCurrency === 'USDC' ? wallet.usdcBalance.toString() :
                                            wallet.vrntBalance.toString()
                                        )}
                                        className="absolute right-2 top-2 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-verent-green hover:bg-gray-50 uppercase"
                                    >
                                        Max
                                    </button>
                                </div>
                            </div>

                            {/* Fee Summary */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Network Fee (Est.)</span>
                                    <span>~0.000005 SOL</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
                                    <span>Total Deducted</span>
                                    <span>
                                        {withdrawAmount ? (Number(withdrawAmount) + (withdrawCurrency === 'SOL' ? 0.000005 : 0)).toFixed(6) : '0.00'} {withdrawCurrency}
                                    </span>
                                </div>
                            </div>

                            {errorMessage && (
                                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center space-x-2">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <button 
                                onClick={handleWithdraw}
                                disabled={withdrawStatus !== 'idle'}
                                className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-gray-200"
                            >
                                {withdrawStatus === 'idle' && (
                                    <>
                                        <ArrowUpRight className="w-5 h-5" />
                                        <span>Confirm Withdrawal</span>
                                    </>
                                )}
                                {withdrawStatus === 'preparing' && (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Preparing Transaction...</span>
                                    </>
                                )}
                                {withdrawStatus === 'signing' && (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Waiting for Signature...</span>
                                    </>
                                )}
                                {withdrawStatus === 'confirming' && (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Confirming on Chain...</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* HISTORY VIEW */}
            {activeTab === 'history' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-6 flex items-center justify-between gap-3">
                        <h2 className="text-xl font-bold text-gray-900">History</h2>
                        <button className="text-sm text-gray-500 hover:text-gray-900">Export CSV</button>
                    </div>

                    <div className="space-y-2">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="group rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center space-x-4 min-w-0">
                                        <div className={`p-3 rounded-full ${
                                            tx.type === 'deposit' ? 'bg-green-100 text-green-600' :
                                            tx.type === 'withdraw' ? 'bg-gray-100 text-gray-600' :
                                            tx.type === 'stake' ? 'bg-purple-100 text-purple-600' :
                                            tx.type === 'claim_rewards' || tx.type === 'claim_yield' ? 'bg-yellow-100 text-yellow-600' :
                                            tx.type === 'request_unstake' || tx.type === 'finalize_unstake' || tx.type === 'unstake' ? 'bg-orange-100 text-orange-600' :
                                            'bg-blue-50 text-blue-600'
                                        }`}>
                                            {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : 
                                             tx.type === 'withdraw' ? <ArrowUpRight className="w-5 h-5" /> :
                                             tx.type === 'stake' ? <Lock className="w-5 h-5" /> :
                                             tx.type === 'claim_rewards' || tx.type === 'claim_yield' ? <Sparkles className="w-5 h-5" /> :
                                             <RefreshCw className="w-5 h-5" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 capitalize">{tx.type.replace('_', ' ')}</p>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                                                <span>{tx.date}</span>
                                                <span>•</span>
                                                <span className="font-mono break-all">{tx.hash}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p className={`font-mono font-medium ${tx.type === 'deposit' || tx.type === 'claim_rewards' || tx.type === 'claim_yield' || tx.type === 'finalize_unstake' ? 'text-verent-green' : 'text-gray-900'}`}>
                                            {tx.type === 'deposit' || tx.type === 'claim_rewards' || tx.type === 'claim_yield' || tx.type === 'finalize_unstake' ? '+' : '-'}{tx.amount} {tx.currency}
                                        </p>
                                        <div className="flex items-center justify-end space-x-2 mt-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${
                                                tx.status === 'confirmed' || tx.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                                                tx.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                'bg-red-50 text-red-700 border-red-100'
                                            }`}>
                                                {tx.status}
                                            </span>
                                            {tx.explorerUrl ? (
                                              <a href={tx.explorerUrl} target="_blank" rel="noreferrer" className="text-gray-300 group-hover:text-gray-500">
                                                <ExternalLink className="w-3 h-3 cursor-pointer" />
                                              </a>
                                            ) : (
                                              <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-500 cursor-pointer" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* EXPORT VIEW */}
            {activeTab === 'export' && (
                 <div className="max-w-md mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-orange-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Export Private Key</h2>
                        <p className="text-sm text-gray-500 mt-2">Backup your wallet or import it into Phantom/Solflare. <br/> <span className="text-orange-600 font-medium">Never share this key with anyone.</span></p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-3">
                        <p className="text-sm font-semibold text-gray-900">Managed by Privy Embedded Wallet</p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Privy opens a secure export modal so only you can view your private key. The app never receives the key material.
                        </p>
                        <button
                          onClick={() => void handleExportWallet()}
                          disabled={!embeddedWallet || exporting}
                          className="w-full py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                          <span>{exporting ? 'Opening Secure Export...' : 'Export with Privy'}</span>
                        </button>
                        {!embeddedWallet && (
                          <p className="text-xs text-amber-700">No embedded Solana wallet is available for export yet.</p>
                        )}
                        {activeTab === 'export' && errorMessage && (
                          <p className="text-xs text-red-600">{errorMessage}</p>
                        )}
                    </div>
                 </div>
            )}
        </div>
      </div>

      <TransactionSuccessDialog
        isOpen={Boolean(withdrawProof)}
        title="Withdrawal Confirmed On-Chain"
        description="This transfer has been confirmed on Solana devnet and the signature below is the proof persisted for your wallet activity."
        onClose={() => setWithdrawProof(null)}
        closeLabel="Continue"
        signature={withdrawProof?.signature}
        accountLabel="Recipient Wallet"
        accountValue={withdrawProof?.recipient}
        cluster="devnet"
      />
    </div>
  );
};

export default WalletView;
