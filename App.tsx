
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Explore from './components/Explore';
import ListingDetails from './components/ListingDetails';
import WalletView from './components/WalletView';
import UnifiedDashboard from './components/UnifiedDashboard';
import Onboarding from './components/Onboarding';
import MyListings from './components/MyListings';
import Settings from './components/Settings';
import Messages from './components/Messages';
import Staking from './components/Staking';
import AIAssistant from './components/AIAssistant';
import NotificationsPopover from './components/NotificationsPopover';
import UserMenu from './components/UserMenu';
import { INITIAL_WALLET, MOCK_DEVICES } from './constants';
import { ViewMode, Listing, WalletState, UserRole } from './types';
import { Bell, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('explore');
  const [wallet, setWallet] = useState<WalletState>(INITIAL_WALLET);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('renter');
  
  // Mobile & Menu States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Handle Onboarding Complete
  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
    
    // Route based on selected role
    if (role === 'owner') {
        setCurrentView('dashboard');
    } else {
        setCurrentView('explore');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('explore');
    setShowUserMenu(false);
  };

  // Handle Navigation
  const handleSwitchMode = (mode: ViewMode) => {
    setCurrentView(mode);
    if (mode !== 'details') {
      setSelectedListing(null);
    }
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  // Handle Listing Selection
  const handleSelectListing = (listing: Listing) => {
    setSelectedListing(listing);
    setCurrentView('details');
  };

  // Handle Message Owner Action
  const handleContactOwner = () => {
    setCurrentView('messages');
  };

  // Handle Rental Transaction (Triggered by BookingModal)
  const handleRent = async (amount: number) => {
    // In a real app, this would await the blockchain tx confirmation
    return new Promise<void>((resolve) => {
        setWallet(prev => ({
          ...prev,
          usdcBalance: prev.usdcBalance - amount
        }));
        resolve();
        setTimeout(() => {
             setCurrentView('dashboard');
        }, 500);
    });
  };

  if (!isAuthenticated) {
    return <Onboarding onComplete={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Mobile Responsive Sidebar */}
      <Sidebar 
        currentMode={currentView} 
        onSwitchMode={handleSwitchMode} 
        onLogout={handleLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main className="flex-1 flex flex-col max-w-full h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between flex-shrink-0 z-30 sticky top-0">
          <div className="flex items-center space-x-4">
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
                <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col md:hidden">
                <h1 className="text-sm font-semibold text-gray-900">Verent.</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative">
                <button 
                    onClick={() => {
                        setShowNotifications(!showNotifications);
                        setShowUserMenu(false);
                    }}
                    className={`relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50 ${showNotifications ? 'bg-gray-100 text-gray-900' : ''}`}
                >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
                </button>
                {showNotifications && (
                    <NotificationsPopover onClose={() => setShowNotifications(false)} />
                )}
            </div>

            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            
            {/* User Avatar Menu */}
            <div className="relative">
                <div 
                    onClick={() => {
                        setShowUserMenu(!showUserMenu);
                        setShowNotifications(false);
                    }}
                    className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer shadow-sm"
                >
                    <div className="w-6 h-6 bg-gradient-to-br from-verent-green to-black rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                        JD
                    </div>
                    <span className="text-xs font-medium text-gray-700 hidden sm:inline">John Doe</span>
                </div>
                {showUserMenu && (
                    <UserMenu 
                        onClose={() => setShowUserMenu(false)} 
                        onLogout={handleLogout}
                        onSettings={() => handleSwitchMode('settings')}
                    />
                )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth relative">
            {currentView === 'explore' && (
                <Explore onSelectListing={handleSelectListing} />
            )}
            
            {currentView === 'details' && selectedListing && (
                <ListingDetails 
                    listing={selectedListing} 
                    wallet={wallet}
                    onBack={() => handleSwitchMode('explore')}
                    onRent={handleRent}
                    onContactOwner={handleContactOwner}
                />
            )}

            {currentView === 'wallet' && (
                <WalletView wallet={wallet} />
            )}

            {currentView === 'staking' && (
                <Staking />
            )}

            {currentView === 'messages' && (
                <Messages />
            )}

            {currentView === 'dashboard' && (
                <UnifiedDashboard initialTab={userRole === 'owner' ? 'lending' : 'renting'} />
            )}

            {currentView === 'listings' && (
                <MyListings />
            )}

            {currentView === 'settings' && (
                <Settings />
            )}
        </div>

        {/* Global AI Assistant - Always Available */}
        <AIAssistant devices={MOCK_DEVICES} />
      </main>
    </div>
  );
};

export default App;
