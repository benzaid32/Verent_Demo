
import React, { useState, useEffect } from 'react';
import { WalletState, Transaction } from '../types';
import { Copy, ArrowUpRight, ArrowDownLeft, QrCode, RefreshCw, History, Shield, AlertCircle, Loader2, ExternalLink, CheckCircle2, Key, Eye, EyeOff, Lock, Coins, TrendingUp, Sparkles, Wallet } from 'lucide-react';
import { MOCK_TRANSACTIONS } from '../constants';

interface WalletViewProps {
  wallet: WalletState;
}

const WalletView: React.FC<WalletViewProps> = ({ wallet }) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history' | 'export'>('deposit');
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSolBalance, setCurrentSolBalance] = useState(wallet.solBalance);
  const [currentVrntBalance, setCurrentVrntBalance] = useState(wallet.vrntBalance);
  const [currentStakedBalance, setCurrentStakedBalance] = useState(wallet.stakedVrntBalance);
  const [currentTransactions, setCurrentTransactions] = useState(MOCK_TRANSACTIONS);

  // Withdraw State
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawCurrency, setWithdrawCurrency] = useState<'SOL' | 'USDC' | 'VRNT'>('SOL');
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'preparing' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Export Key State
  const [showKey, setShowKey] = useState(false);
  const [keyRevealed, setKeyRevealed] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setCurrentSolBalance(prev => prev + 0.0001); // Simulate tiny staking reward
      setRefreshing(false);
    }, 1500);
  };

  const validateWithdrawal = () => {
    if (!withdrawAddress) return "Recipient address is required";
    if (!withdrawAmount) return "Amount is required";
    if (isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) return "Invalid amount";
    
    // Simple simulated address check (Solana addresses are base58, usually 32-44 chars)
    if (withdrawAddress.length < 32 || withdrawAddress.length > 44) return "Invalid Solana address format";

    // Balance check
    const amount = Number(withdrawAmount);
    const fee = 0.000005;
    if (withdrawCurrency === 'SOL' && amount + fee > currentSolBalance) {
      return `Insufficient balance. You need ${amount + fee} SOL`;
    }
    
    if (withdrawCurrency === 'USDC' && amount > wallet.usdcBalance) {
      return `Insufficient USDC balance`;
    }

    if (withdrawCurrency === 'VRNT' && amount > currentVrntBalance) {
        return `Insufficient VRNT balance`;
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

    // Start simulated Transaction Lifecycle matching "old file"
    setErrorMessage('');
    setWithdrawStatus('preparing');

    try {
      // Step 1: Prepare (Simulating blockhash fetch)
      await new Promise(resolve => setTimeout(resolve, 800));
      setWithdrawStatus('signing');

      // Step 2: Sign (Simulating Privy popup interaction)
      await new Promise(resolve => setTimeout(resolve, 2000));
      setWithdrawStatus('confirming');

      // Step 3: Confirm (Simulating Blockchain confirmation)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Success
      setWithdrawStatus('success');
      if (withdrawCurrency === 'SOL') setCurrentSolBalance(prev => prev - Number(withdrawAmount));
      if (withdrawCurrency === 'VRNT') setCurrentVrntBalance(prev => prev - Number(withdrawAmount));
      
      // Add to mock history
      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        type: 'withdraw',
        amount: Number(withdrawAmount),
        currency: withdrawCurrency,
        date: new Date().toISOString().split('T')[0],
        status: 'confirmed',
        hash: Array.from({length: 8}, () => Math.floor(Math.random() * 16).toString(16)).join('') + '...'
      };
      setCurrentTransactions(prev => [newTx, ...prev]);
      setWithdrawAmount('');
      setWithdrawAddress('');

    } catch (e) {
      setErrorMessage('Transaction failed on-chain. Please try again.');
      setWithdrawStatus('error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500 mb-12">
      {/* Header & Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0a0a0a] text-white p-8 rounded-2xl shadow-2xl shadow-black/20 relative overflow-hidden border border-gray-800">
           <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-verent-green/20 to-transparent rounded-bl-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-sm text-gray-400 font-medium uppercase tracking-wider flex items-center space-x-2">
                            <Wallet className="w-4 h-4" />
                            <span>Total Equity</span>
                            {refreshing && <Loader2 className="w-3 h-3 animate-spin" />}
                        </span>
                        <div className="mt-2 flex items-baseline space-x-2">
                            <span className="text-5xl font-bold font-mono tracking-tighter text-white">${(wallet.usdcBalance + (currentVrntBalance * 0.45) + (currentStakedBalance * 0.45)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            <span className="text-lg text-gray-500 font-medium">USD</span>
                        </div>
                    </div>
                    <button onClick={handleRefresh} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors" title="Refresh Balance">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                
                <div className="mt-8 grid grid-cols-3 gap-4">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 backdrop-blur-sm">
                         <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Liquid USDC</p>
                         <p className="text-lg font-mono font-medium text-white">${wallet.usdcBalance.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 backdrop-blur-sm">
                         <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">VRNT Tokens</p>
                         <p className="text-lg font-mono font-medium text-verent-green">{currentVrntBalance.toLocaleString()}</p>
                         <p className="text-[10px] text-gray-500">≈ ${(currentVrntBalance * 0.45).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1">
                            <Lock className="w-3 h-3 text-gray-600" />
                        </div>
                         <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Staked VRNT</p>
                         <p className="text-lg font-mono font-medium text-blue-400">{currentStakedBalance.toLocaleString()}</p>
                         <p className="text-[10px] text-gray-500">APY 12.4%</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="lg:col-span-1 bg-white border border-gray-200 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
             <div>
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Gas Tank</h3>
                    <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Solana</span>
                 </div>
                 
                 <div className="text-center py-6">
                    <p className="text-3xl font-mono font-bold text-gray-900">{currentSolBalance.toFixed(4)} <span className="text-base font-sans font-medium text-gray-500">SOL</span></p>
                    <p className="text-xs text-gray-400 mt-1">Enough for ~{(currentSolBalance / 0.000005).toFixed(0)} transactions</p>
                 </div>

                 <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mt-2">
                    <p className="text-xs text-gray-500 mb-1">Public Address</p>
                    <div className="flex items-center justify-between">
                        <code className="text-xs text-gray-900 font-mono">{wallet.address.substring(0, 16)}...</code>
                        <button onClick={handleCopy} className="text-verent-green hover:text-green-700 transition-colors">
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
        <div className="border-b border-gray-100 flex items-center px-6 pt-2 bg-gray-50/50 overflow-x-auto no-scrollbar">
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

        <div className="p-8 min-h-[400px]">
            {/* DEPOSIT VIEW */}
            {activeTab === 'deposit' && (
                <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold text-gray-900">Deposit Assets</h2>
                        <p className="text-sm text-gray-500">Send SOL, USDC, or VRNT to your embedded wallet address.</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-200 shadow-sm relative group">
                        <div className="absolute inset-0 bg-verent-green/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
                        <QrCode className="w-48 h-48 text-gray-900" />
                    </div>

                    <div className="w-full max-w-md">
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                            <span className="font-mono text-sm text-gray-600">{wallet.address}</span>
                            <button 
                                onClick={handleCopy}
                                className="flex items-center space-x-2 text-xs font-medium text-gray-900 bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                <span>Copy</span>
                            </button>
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
                            <p className="text-sm text-green-700">Your funds are on the way. Check your history for the transaction hash.</p>
                            <button 
                                onClick={() => { setWithdrawStatus('idle'); setWithdrawAmount(''); setWithdrawAddress(''); }}
                                className="mt-4 bg-white border border-green-200 text-green-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-50"
                            >
                                Make Another Transfer
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Asset</label>
                                <div className="grid grid-cols-3 gap-4">
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
                                            withdrawCurrency === 'SOL' ? currentSolBalance.toFixed(4) :
                                            withdrawCurrency === 'USDC' ? wallet.usdcBalance.toFixed(2) :
                                            currentVrntBalance.toLocaleString()
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
                                            withdrawCurrency === 'SOL' ? (currentSolBalance - 0.00001).toFixed(4) :
                                            withdrawCurrency === 'USDC' ? wallet.usdcBalance.toString() :
                                            currentVrntBalance.toString()
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
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">History</h2>
                        <button className="text-sm text-gray-500 hover:text-gray-900">Export CSV</button>
                    </div>

                    <div className="space-y-2">
                        {currentTransactions.map((tx) => (
                            <div key={tx.id} className="bg-white border border-gray-200 p-4 rounded-xl hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className={`p-3 rounded-full ${
                                            tx.type === 'deposit' ? 'bg-green-100 text-green-600' :
                                            tx.type === 'withdraw' ? 'bg-gray-100 text-gray-600' :
                                            tx.type === 'stake' ? 'bg-purple-100 text-purple-600' :
                                            tx.type === 'claim_yield' ? 'bg-yellow-100 text-yellow-600' :
                                            'bg-blue-50 text-blue-600'
                                        }`}>
                                            {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : 
                                             tx.type === 'withdraw' ? <ArrowUpRight className="w-5 h-5" /> :
                                             tx.type === 'stake' ? <Lock className="w-5 h-5" /> :
                                             tx.type === 'claim_yield' ? <Sparkles className="w-5 h-5" /> :
                                             <RefreshCw className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 capitalize">{tx.type.replace('_', ' ')}</p>
                                            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
                                                <span>{tx.date}</span>
                                                <span>•</span>
                                                <span className="font-mono">{tx.hash}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-mono font-medium ${tx.type === 'deposit' || tx.type === 'claim_yield' ? 'text-verent-green' : 'text-gray-900'}`}>
                                            {tx.type === 'deposit' || tx.type === 'claim_yield' ? '+' : '-'}{tx.amount} {tx.currency}
                                        </p>
                                        <div className="flex items-center justify-end space-x-2 mt-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${
                                                tx.status === 'confirmed' || tx.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' :
                                                tx.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                'bg-red-50 text-red-700 border-red-100'
                                            }`}>
                                                {tx.status}
                                            </span>
                                            <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-500 cursor-pointer" />
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

                    {!showKey ? (
                        <button 
                            onClick={() => setShowKey(true)}
                            className="w-full py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Reveal Private Key
                        </button>
                    ) : (
                         <div className="bg-gray-900 rounded-xl p-6 text-left relative group cursor-pointer" onClick={() => setKeyRevealed(!keyRevealed)}>
                             <p className="text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Private Key</p>
                             <div className="font-mono text-sm text-white break-all leading-relaxed">
                                {keyRevealed 
                                    ? "4k3...92x (Simulated Private Key for Security)" 
                                    : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                             </div>
                             <div className="absolute top-4 right-4 text-gray-500">
                                 {keyRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                             </div>
                             {!keyRevealed && (
                                 <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm rounded-xl">
                                     <span className="text-xs text-white font-medium bg-black/50 px-3 py-1 rounded-full border border-white/10">Click to Reveal</span>
                                 </div>
                             )}
                         </div>
                    )}
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default WalletView;
