
import React, { useState } from 'react';
import { ShieldCheck, Coins, Lock, Unlock, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { User, WalletState } from '../types';

interface StakingProps {
  wallet: WalletState;
  profile: User;
  onStake: (amount: number | undefined, action: 'stake' | 'request_unstake' | 'finalize_unstake' | 'claim_rewards') => Promise<{ transactionHash: string; explorerUrl: string }>;
}

const Staking: React.FC<StakingProps> = ({ wallet, profile, onStake }) => {
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'approving' | 'confirming' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAction = async (action: 'stake' | 'request_unstake') => {
    setStatus('approving');
    setErrorMessage('');
    try {
      setStatus('confirming');
      await onStake(parseFloat(amount), action);
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setAmount('');
      }, 3000);
    } catch (caughtError) {
      setErrorMessage(caughtError instanceof Error ? caughtError.message : 'Staking action failed');
      setStatus('idle');
    }
  };

  const handleSecondaryAction = async (action: 'finalize_unstake' | 'claim_rewards') => {
    setStatus('approving');
    setErrorMessage('');
    try {
      setStatus('confirming');
      await onStake(undefined, action);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (caughtError) {
      setErrorMessage(caughtError instanceof Error ? caughtError.message : 'Staking action failed');
      setStatus('idle');
    }
  };

  const getTierProgress = () => {
    const staked = wallet.stakedVrntBalance;
    if (staked >= 10000) return 100;
    if (staked >= 5000) return ((staked - 5000) / 5000) * 100;
    return (staked / 5000) * 100;
  };

  const nextTierTarget = wallet.stakedVrntBalance >= 5000 ? 10000 : 5000;
  const nextTierName = wallet.stakedVrntBalance >= 5000 ? 'Tier 3 (Pro)' : 'Tier 2 (Verified)';

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500 mb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <div className="flex items-center space-x-2 mb-1">
               <ShieldCheck className="w-6 h-6 text-verent-green" />
               <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Safety Module</h1>
            </div>
            <p className="text-gray-500 text-sm">Stake live `VRNT`, request cooldown-based unstake, finalize exits, and claim emitted VRNT rewards.</p>
         </div>
         <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
           <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Current Tier</p>
           <p className="text-sm font-bold text-gray-900">Tier {profile.tier}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-black text-white p-6 rounded-2xl relative overflow-hidden shadow-xl">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Wallet VRNT</p>
              <h3 className="text-3xl font-mono font-bold text-white">{wallet.vrntBalance.toLocaleString()}</h3>
              <p className="mt-3 text-xs text-gray-400">Available to stake right now.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                   <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Staked VRNT</p>
                   <h3 className="text-4xl font-mono font-bold text-gray-900 mt-2">{wallet.stakedVrntBalance.toLocaleString()}</h3>
                   <p className="text-xs text-gray-400 mt-1">Currently locked in the protocol.</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Collateral tier impact</span>
                      <span className="font-mono font-medium">{profile.tier === 3 ? '10%' : profile.tier === 2 ? '50%' : '100%'}</span>
                  </div>
              </div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
               <div>
                   <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Claimable Rewards</p>
                   <h3 className="text-3xl font-mono font-bold text-gray-900 mt-2">{(wallet.claimableVrnt ?? 0).toLocaleString()} VRNT</h3>
                   <p className="text-xs text-gray-400 mt-1">Ready to claim from reward vault</p>
               </div>
               <button
                 onClick={() => void handleSecondaryAction('claim_rewards')}
                 disabled={(wallet.claimableVrnt ?? 0) <= 0 || status !== 'idle'}
                 className="mt-4 w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-black transition-colors disabled:opacity-60"
               >
                 Claim VRNT Rewards
               </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Action Column */}
          <div className="lg:col-span-2 space-y-6">
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
                              {activeTab === 'unstake' && <span className="text-orange-500 font-medium">Cooldown must finish before finalizing unstake.</span>}
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
                            onClick={() => void handleAction(activeTab === 'stake' ? 'stake' : 'request_unstake')}
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
                                        <span>{activeTab === 'stake' ? 'Stake VRNT' : 'Request Unstake'}</span>
                                    </>
                                )}
                          </button>
                      )}
                      {errorMessage && (
                        <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
                      )}
                      {activeTab === 'unstake' && (
                        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Pending unstake</span>
                            <span className="font-mono font-medium text-gray-900">{(wallet.pendingUnstakeVrnt ?? 0).toLocaleString()} VRNT</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Available after</span>
                            <span className="font-medium text-gray-900">
                              {wallet.unstakeAvailableAt ? new Date(wallet.unstakeAvailableAt).toLocaleString() : 'No pending cooldown'}
                            </span>
                          </div>
                          <button
                            onClick={() => void handleSecondaryAction('finalize_unstake')}
                            disabled={(wallet.pendingUnstakeVrnt ?? 0) <= 0 || status !== 'idle'}
                            className="w-full bg-white border border-gray-200 py-3 rounded-xl text-sm font-bold text-gray-900 hover:bg-gray-100 disabled:opacity-60"
                          >
                            Finalize Unstake
                          </button>
                        </div>
                      )}
                  </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 flex items-start space-x-4">
                  <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div>
                      <h4 className="font-bold text-blue-900 text-sm">Live Surface Notes</h4>
                      <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                          Stake custody, reward claiming, and cooldown exits are on-chain. Tier changes are derived from your real staked VRNT balance.
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
                       <span>Tiers update from the live staking position returned by the protocol.</span>
                   </div>
               </div>

               <div className="bg-gray-900 text-white p-6 rounded-2xl border border-gray-800">
                   <h3 className="font-bold text-lg mb-2">What changes your tier</h3>
                   <p className="text-sm text-gray-400">
                     Tier progress updates from your persisted staking balance. Reach {nextTierTarget.toLocaleString()} staked VRNT for {nextTierName}.
                   </p>
               </div>
          </div>
      </div>
    </div>
  );
};

export default Staking;
