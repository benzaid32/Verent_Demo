
import React, { useState } from 'react';
import { ShieldCheck, Bell, Lock, Wallet, Mail, Upload, AlertTriangle, CheckCircle2, ChevronRight, Plus, Smartphone, Award, Coins } from 'lucide-react';
import { MOCK_USER } from '../constants';

const Settings: React.FC = () => {
  const [notifications, setNotifications] = useState({
    rentals: true,
    marketing: false,
    security: true
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSave = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const SectionHeader = ({ title, description }: { title: string, description: string }) => (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );

  const Toggle = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button 
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-verent-green/20 ${checked ? 'bg-verent-green' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-12 animate-in fade-in duration-500 mb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
         <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your profile, security, and preferences.</p>
         </div>
         <button 
            onClick={handleSave}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
         >
            {isLoading ? <span>Saving...</span> : <span>Save Changes</span>}
         </button>
      </div>

      {/* Profile Section */}
      <section>
        <SectionHeader title="Public Profile" description="This information will be displayed on your public listings." />
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
           <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
              <div className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-sm overflow-hidden">
                   <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop" alt="Profile" className="w-full h-full object-cover transition-opacity group-hover:opacity-75" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-6 h-6 text-gray-600" />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-gray-900 text-lg">Verent User</h3>
                <p className="text-gray-500 text-sm">{MOCK_USER.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded border border-gray-200">
                      <span className="w-1.5 h-1.5 bg-verent-green rounded-full"></span>
                      <span>Renter & Lister Account</span>
                  </span>
                   <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded border border-blue-100">
                      <Award className="w-3 h-3" />
                      <span>Tier {MOCK_USER.tier} Verified</span>
                  </span>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Display Name</label>
                <input type="text" defaultValue="Verent User" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all" />
              </div>
               <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Username</label>
                <div className="relative">
                    <span className="absolute left-4 top-2.5 text-gray-400 text-sm">@</span>
                    <input type="text" defaultValue="verent_usr" className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all" />
                </div>
              </div>
               <div className="col-span-full space-y-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Bio</label>
                <textarea rows={3} defaultValue="Professional cinematographer and drone operator based in Seattle." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all resize-none" />
                <p className="text-[10px] text-gray-400 text-right">0/240 characters</p>
              </div>
           </div>
        </div>
      </section>

      {/* Trust & Identity Center */}
      <section>
         <SectionHeader title="Trust & Verification" description="Increase your tier to reduce collateral requirements and access higher value equipment." />
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tier 1 Card */}
             <div className={`rounded-xl border p-6 relative overflow-hidden ${MOCK_USER.tier >= 1 ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-70'}`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                        <Mail className="w-5 h-5 text-gray-600" />
                    </div>
                    {MOCK_USER.tier >= 1 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                </div>
                <h3 className="font-bold text-gray-900">Tier 1: Rookie</h3>
                <p className="text-xs text-gray-500 mt-1">Basic email verification.</p>
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Collateral</span>
                        <span className="font-medium text-gray-900">100%</span>
                    </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Limit</span>
                        <span className="font-medium text-gray-900">$500</span>
                    </div>
                </div>
             </div>

             {/* Tier 2 Card (Current) */}
             <div className="rounded-xl border-2 border-verent-green bg-white p-6 relative overflow-hidden shadow-lg shadow-verent-green/10">
                <div className="absolute top-0 right-0 bg-verent-green text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">CURRENT</div>
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="font-bold text-gray-900">Tier 2: Verified</h3>
                <p className="text-xs text-gray-500 mt-1">Social ID + Staked Assets.</p>
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Collateral</span>
                        <span className="font-bold text-green-600">50%</span>
                    </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Limit</span>
                        <span className="font-medium text-gray-900">$5,000</span>
                    </div>
                </div>
                <div className="mt-4 bg-green-50 rounded-lg p-2 flex items-center space-x-2">
                    <Coins className="w-3 h-3 text-verent-green" />
                    <span className="text-[10px] font-bold text-green-800">5,000 VRNT Staked</span>
                </div>
             </div>

             {/* Tier 3 Card (Locked) */}
             <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 relative overflow-hidden group hover:border-gray-400 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-gray-200 rounded-lg">
                        <Lock className="w-5 h-5 text-gray-500" />
                    </div>
                </div>
                <h3 className="font-bold text-gray-900">Tier 3: Pro</h3>
                <p className="text-xs text-gray-500 mt-1">KYC Identity Verification.</p>
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 opacity-50">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Collateral</span>
                        <span className="font-bold text-green-600">10%</span>
                    </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Limit</span>
                        <span className="font-medium text-gray-900">Unlimited</span>
                    </div>
                </div>
                <div className="absolute bottom-4 right-4 left-4">
                     <button className="w-full bg-black text-white py-2 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        Stake to Upgrade
                    </button>
                </div>
             </div>
         </div>
      </section>

      {/* Wallet Config */}
      <section>
        <SectionHeader title="Wallet Management" description="Manage your embedded and external wallet connections." />
         <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Connected Accounts</h3>
                <button className="text-xs font-medium text-verent-green hover:text-emerald-700 flex items-center space-x-1">
                    <Plus className="w-3 h-3" />
                    <span>Link External Wallet</span>
                </button>
            </div>
            <div className="divide-y divide-gray-100">
                {/* Embedded Wallet */}
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center shadow-sm">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <p className="text-sm font-bold text-gray-900">Embedded Wallet</p>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">Primary</span>
                            </div>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">{MOCK_USER.walletAddress}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">Active</span>
                        <button className="p-2 text-gray-300 hover:text-gray-600 transition-colors">
                             <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                {/* Phantom Wallet (External - Mock) */}
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-[#AB9FF2] flex items-center justify-center shadow-sm">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div>
                             <div className="flex items-center space-x-2">
                                <p className="text-sm font-bold text-gray-900">Phantom</p>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">External</span>
                            </div>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">8Yz...2kP</p>
                        </div>
                    </div>
                     <div className="flex items-center space-x-3">
                        <button className="text-xs text-gray-500 hover:text-red-600 transition-colors underline">Unlink</button>
                         <button className="p-2 text-gray-300 hover:text-gray-600 transition-colors">
                             <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
         </div>
      </section>

      {/* Notifications */}
      <section>
        <SectionHeader title="Notifications" description="Choose what updates you want to receive." />
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100 shadow-sm">
            <div className="p-4 sm:p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                        <p className="text-sm font-medium text-gray-900">Rental Requests</p>
                        <p className="text-xs text-gray-500">Receive emails when someone requests your gear.</p>
                    </div>
                </div>
                <Toggle checked={notifications.rentals} onChange={() => setNotifications(prev => ({...prev, rentals: !prev.rentals}))} />
            </div>

             <div className="p-4 sm:p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <AlertTriangle className="w-5 h-5 text-gray-400" />
                    <div>
                        <p className="text-sm font-medium text-gray-900">Security Alerts</p>
                        <p className="text-xs text-gray-500">Get notified about suspicious logins or wallet activity.</p>
                    </div>
                </div>
                <Toggle checked={notifications.security} onChange={() => setNotifications(prev => ({...prev, security: !prev.security}))} />
            </div>

             <div className="p-4 sm:p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Bell className="w-5 h-5 text-gray-400" />
                    <div>
                        <p className="text-sm font-medium text-gray-900">Marketing & Updates</p>
                        <p className="text-xs text-gray-500">News about protocol features and community events.</p>
                    </div>
                </div>
                <Toggle checked={notifications.marketing} onChange={() => setNotifications(prev => ({...prev, marketing: !prev.marketing}))} />
            </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
