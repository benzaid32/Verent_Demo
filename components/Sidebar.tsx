
import React from 'react';
import { Compass, LayoutDashboard, List, Wallet, Settings, LogOut, MessageSquare, X, Shield } from 'lucide-react';
import { ViewMode } from '../types';

const logo = new URL('../assets/favicon-32x32.png', import.meta.url).href;

interface SidebarProps {
  currentMode: ViewMode;
  onSwitchMode: (mode: ViewMode) => void;
  onLogout: () => void;
  walletBalance?: number;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, onSwitchMode, onLogout, walletBalance = 0, isOpen, onClose }) => {
  const navItems = [
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'messages', icon: MessageSquare, label: 'Inbox' },
    { id: 'listings', icon: List, label: 'My Listings' },
    { id: 'staking', icon: Shield, label: 'Safety Module' }, // New Staking Page
    { id: 'wallet', icon: Wallet, label: 'Wallet' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  // Classes for Mobile Drawer vs Desktop Sidebar
  const mobileClasses = `fixed inset-y-0 left-0 z-40 w-64 bg-[#FAFAFA] shadow-2xl transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
    isOpen ? 'translate-x-0' : '-translate-x-full'
  }`;
  
  const desktopClasses = `md:flex md:flex-col md:sticky md:top-0 md:h-screen md:w-64 md:border-r md:border-gray-200 md:bg-[#FAFAFA] md:shadow-none`;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={onClose}
        ></div>
      )}

      <div className={`${mobileClasses} ${desktopClasses}`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shadow-lg shadow-verent-green/20 overflow-hidden">
              <img
                src={logo}
                alt="Verent logo"
                className="w-6 h-6 object-contain"
              />
            </div>
            <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight leading-none text-gray-900">Verent.</span>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Protocol</span>
            </div>
          </div>
          {/* Close Button - Mobile Only */}
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-2">
              Menu
          </p>
          {navItems.map((item) => {
              const isActive = currentMode === item.id || (currentMode === 'details' && item.id === 'explore');
              return (
              <button
                  key={item.id}
                  onClick={() => {
                    onSwitchMode(item.id as ViewMode);
                    onClose(); // Close drawer on mobile when clicked
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
              >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-verent-green' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                  {item.id === 'messages' && (
                    <span className="ml-auto bg-verent-green/10 text-verent-green text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      1
                    </span>
                  )}
              </button>
              );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
           <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-400 font-medium uppercase">Wallet Balance</span>
                  <span className="w-2 h-2 rounded-full bg-verent-green animate-pulse"></span>
              </div>
              <div className="text-lg font-bold text-gray-900 font-mono tracking-tight">
                  ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-400 font-sans font-normal">USDC</span>
              </div>
           </div>

          <button 
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
