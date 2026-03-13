
import React, { useState } from 'react';
import { ShieldCheck, Bell, Lock, Wallet, Mail, Upload, AlertTriangle, CheckCircle2, Award } from 'lucide-react';
import type { Notification, User } from '../types';
import type { SettingsUpdateRequest } from '../shared/contracts';

interface SettingsProps {
  profile: User;
  notifications: Notification[];
  onSave: (payload: SettingsUpdateRequest) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ profile, notifications: notificationItems, onSave }) => {
  const [notifications, setNotifications] = useState({
    rentals: profile.notificationPreferences?.rentals ?? notificationItems.some((item) => item.type === 'rental'),
    marketing: profile.notificationPreferences?.marketing ?? notificationItems.some((item) => item.type === 'system'),
    security: profile.notificationPreferences?.security ?? notificationItems.some((item) => item.type === 'security')
  });

  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio ?? '');
  const tierCollateral = profile.tier === 3 ? '10%' : profile.tier === 2 ? '50%' : '100%';

  const handleSave = () => {
    setIsLoading(true);
    void onSave({
      username: displayName,
      bio,
      notifications
    }).finally(() => setIsLoading(false));
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
                   <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover transition-opacity group-hover:opacity-75" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-6 h-6 text-gray-600" />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-gray-900 text-lg">{profile.username}</h3>
                <p className="text-gray-500 text-sm">{profile.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded border border-gray-200">
                      <span className="w-1.5 h-1.5 bg-verent-green rounded-full"></span>
                      <span>Renter & Lister Account</span>
                  </span>
                   <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded border border-blue-100">
                      <Award className="w-3 h-3" />
                      <span>Tier {profile.tier}</span>
                  </span>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Display Name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all" />
              </div>
               <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Username</label>
                <div className="relative">
                    <span className="absolute left-4 top-2.5 text-gray-400 text-sm">@</span>
                    <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} type="text" className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all" />
                </div>
              </div>
               <div className="col-span-full space-y-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Bio</label>
                <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none transition-all resize-none" />
                <p className="text-[10px] text-gray-400 text-right">0/240 characters</p>
              </div>
           </div>
        </div>
      </section>

      {/* Trust & Identity Center */}
      <section>
         <SectionHeader title="Trust & Verification" description="This screen only shows live profile state currently persisted by the platform." />
         <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-50 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-green-600" />
              </div>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Tier {profile.tier} account</h3>
                  <p className="text-sm text-gray-500">Collateral requirement is derived from your current verification tier.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Collateral</p>
                    <p className="mt-2 text-lg font-bold text-gray-900">{tierCollateral}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Wallet</p>
                    <p className="mt-2 text-sm font-mono text-gray-900 break-all">{profile.walletAddress}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Status</p>
                    <p className="mt-2 text-sm font-medium text-green-700">Active profile record</p>
                  </div>
                </div>
              </div>
            </div>
         </div>
      </section>

      {/* Wallet Config */}
      <section>
        <SectionHeader title="Wallet Management" description="Only the live embedded wallet is exposed here right now." />
         <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Connected Accounts</h3>
                <span className="text-xs text-gray-500">External wallet linking is not live in this release.</span>
            </div>
            <div className="divide-y divide-gray-100">
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
                            <p className="text-xs text-gray-500 font-mono mt-0.5">{profile.walletAddress}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">Active</span>
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
