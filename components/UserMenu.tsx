
import React from 'react';
import { Settings, LogOut, ShieldCheck, ChevronRight } from 'lucide-react';
import type { User as AppUser } from '../types';

interface UserMenuProps {
  profile: AppUser;
  onClose: () => void;
  onLogout: () => void;
  onSettings: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ profile, onClose, onLogout, onSettings }) => {
  return (
    <div className="absolute right-0 top-12 z-50 w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 sm:w-64">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-bold text-gray-900">{profile.username}</p>
            <p className="text-xs text-gray-500 truncate">{profile.email}</p>
            <div className="flex items-center space-x-1 mt-2 text-[10px] text-verent-green font-medium bg-white px-2 py-1 rounded border border-gray-200 w-fit">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Account</span>
            </div>
        </div>
        <div className="p-2">
            <button
                onClick={() => { onSettings(); onClose(); }}
                className="w-full rounded-lg px-3 py-3 text-left transition-colors hover:bg-gray-50"
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-lg bg-gray-100 p-2">
                            <Settings className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Account & Settings</p>
                            <p className="text-xs text-gray-500">Profile, notifications, wallet info</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
            </button>
        </div>
        <div className="border-t border-gray-100 p-2">
            <button 
                onClick={onLogout}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
            >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
            </button>
        </div>
    </div>
  );
};

export default UserMenu;
