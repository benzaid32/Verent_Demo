
import React from 'react';
import { User, Settings, LogOut, ShieldCheck } from 'lucide-react';
import type { User as AppUser } from '../types';

interface UserMenuProps {
  profile: AppUser;
  onClose: () => void;
  onLogout: () => void;
  onSettings: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ profile, onClose, onLogout, onSettings }) => {
  return (
    <div className="absolute top-12 right-0 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-bold text-gray-900">{profile.username}</p>
            <p className="text-xs text-gray-500 truncate">{profile.email}</p>
            <div className="flex items-center space-x-1 mt-2 text-[10px] text-verent-green font-medium bg-white px-2 py-1 rounded border border-gray-200 w-fit">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Account</span>
            </div>
        </div>
        <div className="p-2">
            <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left">
                <User className="w-4 h-4 text-gray-400" />
                <span>Profile</span>
            </button>
            <button 
                onClick={() => { onSettings(); onClose(); }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
                <Settings className="w-4 h-4 text-gray-400" />
                <span>Settings</span>
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
