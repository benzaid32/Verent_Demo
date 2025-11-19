
import React, { useState } from 'react';
import { ShieldCheck, Coins, Lock, Unlock, CheckCircle2, AlertCircle, Loader2, ArrowRight, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { STAKING_HISTORY_DATA, INITIAL_WALLET } from '../constants';
import { WalletState } from '../types';

const Staking: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'approving' | 'confirming' | 'success'>('idle');
  
  // Local state simulating wallet updates
  const [wallet, setWallet] = useState<WalletState>(INITIAL_WALLET);

  const handleAction = () => {
    setStatus('approving');
    setTimeout(() => {
      setStatus('confirming');
      setTimeout(() => {
        setStatus('success');
        // Update local balance simulation
        if (activeTab === 'stake') {
          setWallet(prev => ({
            ...prev,
            stakedVrntBalance: prev.stakedVrntBalance + parseFloat(amount),
            vrntBalance: prev.vrntBalance - parseFloat(amount)
          }));
        } else {
          setWallet(prev => ({
            ...prev,
            stakedVrntBalance: prev.stakedVrntBalance - parseFloat(amount),
            vrntBalance: prev.vrntBalance + parseFloat(amount)
          }));
        }
        setTimeout(() => {
          setStatus('idle');
          setAmount('');
        }, 3000);
      }, 2000);
    }, 1500);
  };

  const getTierProgress = () => {
    const staked = wallet.stakedVrntBalance;
    if (staked >= 10000) return 100; // Tier 3 maxed
    if (staked >= 5000) return ((staked - 5000) / 5000) * 100; // Progress to Tier 3
    return (staked / 5000) * 100; // Progress to Tier 2
  };

  const nextTierTarget = wallet.stakedVrntBalance >= 5000 ? 10000 : 5000;
  const nextTierName = wallet.stakedVrntBalance >= 5000 ? 'Tier 3 (Pro)' : 'Tier 2 (Verified)';

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500 mb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <div className="flex items-center space-x-2 mb-1">
               <ShieldCheck className="w-6 h-6 text-verent-green" />
               <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Safety Module</h1>
            </div>
            <p className="text-gray-500 text-sm">Stake $VRNT to secure the protocol and earn real yield from rental fees.</p>
         </div>
         <div className="flex items-center space-x-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
             <div className="px-4 py-2 border-r border-gray-100">
                 <p className="text-[10px] text-gray-400 uppercase font-bold">VRNT Price</p>
                 <p className="text-sm font-mono font-bold text-gray-900">$0.45 USDC</p>
             </div>
             <div className="px-4 py-2">
                 <p className="text-[10px] text-gray-400 uppercase font-bold">Epoch 42</p>
                 <p className="text-sm font-mono font-bold text-verent-green">Active</p>
             </div>
         </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* TVL Card */}
          <div className="bg-black text-white p-6 rounded-2xl relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-verent-green/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="relative z-10">
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Total Value Locked</p>
                  <h3 className="text-3xl font-mono font-bold text-white mb-4">$4.32M</h3>
                  
                  <div className="h-16 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={STAKING_HISTORY_DATA}>
                        <defs>
                          <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2ecc71" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="tvl" stroke="#2ecc71" strokeWidth={2} fill="url(#colorTvl)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </div>
          </div>

          {/* APY Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                   <div className="flex justify-between items-start">
                       <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Staking APY</p>
                       <span className="bg-green-50 text-verent-green text-[10px] font-bold px-2 py-1 rounded-full">Real Yield</span>
                   </div>
                   <h3 className="text-4xl font-mono font-bold text-gray-900 mt-2">12.4%</h3>
                   <p className="text-xs text-gray-400 mt-1">Paid in USDC</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Protocol Revenue (24h)</span>
                      <span className="font-mono font-medium">$1,240.50</span>
                  </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Daily Emissions</span>
                      <span className="font-mono font-medium">1,500 VRNT</span>
                  </div>
              </div>
          </div>

          {/* Rewards Card */}
          <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3 opacity-5">
                   <Coins className="w-24 h-24 text-gray-900" />
               </div>
               <div>
                   <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Claimable Rewards</p>
                   <h3 className="text-3xl font-mono font-bold text-gray-900 mt-2">${wallet.pendingYieldUsdc.toFixed(2)}</h3>
                   <p className="text-xs text-gray-400 mt-1">USDC</p>
               </div>
               <button className="mt-4 w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-black transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-gray-200">
                   <Coins className="w-4 h-4" />
                   <span>Claim Yield</span>
               </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Action Column */}
          <div className="lg:col-span-2 space-y-6">
              {/* Staking Interface */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex border-b border-gray-100">
                      <button 
                        onClick={() => setActiveTab('stake')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center space-x-2 transition-colors ${activeTab === 'stake' ? 'bg-white text-gray-900 border-b-2 border-verent-green' : 'bg-gray-50 text-gray-500 hover:text-gray-700'}`}
                      >
                          <Lock className="w-4 h-4" />
                          <span>Stake</span>
                      </button>
                      <button 
                        onClick={() => setActiveTab('unstake')}
                         className={`flex-1 py-4 text-sm font-bold flex items-center justify-center space-x-2 transition-colors ${activeTab === 'unstake' ? 'bg-white text-gray-900 border-b-2 border-verent-green' : 'bg-gray-50 text-gray-500 hover:text-gray-700'}`}
                      >
                          <Unlock className="w-4 h-4" />
                          <span>Unstake</span>
                      </button>
                  </div>

                  <div className="p-6 sm:p-8">
                      <div className="mb-6">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                              {activeTab === 'stake' ? 'Amount to Stake' : 'Amount to Unstake'}
                          </label>
                          <div className="relative">
                              <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-4 pr-24 py-4 bg-gray-50 border border-gray-200 rounded-xl text-2xl font-mono font-bold outline-none focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green transition-all"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                                  <span className="text-sm font-bold text-gray-400">VRNT</span>
                                  <button 
                                    onClick={() => setAmount(activeTab === 'stake' ? wallet.vrntBalance.toString() : wallet.stakedVrntBalance.toString())}
                                    className="text-[10px] font-bold bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 text-verent-green"
                                  >
                                      MAX
                                  </button>
                              </div>
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-gray-500">
                              <span>Balance: {activeTab === 'stake' ? wallet.vrntBalance.toLocaleString() : wallet.stakedVrntBalance.toLocaleString()} VRNT</span>
                              {activeTab === 'unstake' && <span className="text-orange-500 font-medium">Cooldown: 14 Days</span>}
                          </div>
                      </div>

                      {status === 'success' ? (
                           <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center animate-in zoom-in duration-300">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                </div>
                                <h3 className="text-lg font-bold text-green-900">Transaction Successful</h3>
                                <p className="text-sm text-green-700">Your balance has been updated on-chain.</p>
                           </div>
                      ) : (
                          <button 
                            onClick={handleAction}
                            disabled={!amount || parseFloat(amount) <= 0 || status !== 'idle'}
                            className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-gray-200"
                          >
                                {status !== 'idle' ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>{status === 'approving' ? 'Approving Token...' : 'Confirming...'}</span>
                                    </>
                                ) : (
                                    <>
                                        {activeTab === 'stake' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                        <span>{activeTab === 'stake' ? 'Stake VRNT' : 'Unstake VRNT'}</span>
                                    </>
                                )}
                          </button>
                      )}
                  </div>
              </div>

              {/* Info Section */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 flex items-start space-x-4">
                  <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div>
                      <h4 className="font-bold text-blue-900 text-sm">Slashing Risk</h4>
                      <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                          Funds in the Safety Module can be slashed up to 30% to cover shortfall events in the protocol (e.g. smart contract failure or debt defaults). Stakers earn high yield in exchange for assuming this risk.
                      </p>
                  </div>
              </div>
          </div>

          {/* Sidebar Column - Tier Info */}
          <div className="space-y-6">
               <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                   <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Trust Tier Progress</h3>
                   
                   <div className="relative pt-4 mb-8">
                       <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                           <span>Current</span>
                           <span>Target</span>
                       </div>
                       <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                           <div 
                                className="h-full bg-verent-green transition-all duration-1000 ease-out"
                                style={{ width: `${getTierProgress()}%` }}
                           ></div>
                       </div>
                       <div className="flex justify-between mt-2">
                           <span className="text-sm font-bold text-gray-900">{wallet.stakedVrntBalance.toLocaleString()}</span>
                           <span className="text-sm font-bold text-gray-900">{nextTierTarget.toLocaleString()}</span>
                       </div>
                   </div>

                   <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4">
                       <div className="flex items-center justify-between mb-2">
                           <span className="text-xs text-gray-500 font-medium">Next Level</span>
                           <span className="text-xs font-bold text-verent-green bg-green-50 px-2 py-1 rounded">{nextTierName}</span>
                       </div>
                       <p className="text-xs text-gray-600">
                           Unlock lower collateral requirements (down to 10%) and higher rental limits by staking more VRNT.
                       </p>
                   </div>

                   <div className="flex items-center space-x-2 text-xs text-gray-400">
                       <Info className="w-3 h-3" />
                       <span>Tiers update automatically after staking confirmation.</span>
                   </div>
               </div>

               <div className="bg-gray-900 text-white p-6 rounded-2xl border border-gray-800 relative overflow-hidden">
                   <div className="relative z-10">
                       <h3 className="font-bold text-lg mb-2">Buy $VRNT</h3>
                       <p className="text-sm text-gray-400 mb-4">Need more tokens to reach the next tier?</p>
                       <button className="w-full bg-white text-black py-3 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2">
                           <span>Swap on Jupiter</span>
                           <ArrowRight className="w-4 h-4" />
                       </button>
                   </div>
                   {/* Jupiter logo bg effect */}
                   <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl"></div>
               </div>
          </div>
      </div>
    </div>
  );
};

export default Staking;
