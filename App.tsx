
import React, { useEffect, useMemo, useState } from 'react';
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
import { ViewMode, Listing } from './types';
import { Bell, Menu } from 'lucide-react';
import { useAppContext } from './context/AppContext';

const App: React.FC = () => {
  const {
    profile,
    wallet,
    listings,
    myListings,
    rentingRentals,
    lendingRentals,
    conversations,
    notifications,
    transactions,
    devices,
    loading,
    error,
    loginWithPrivy,
    logout,
    refresh,
    markNotificationsRead,
    createRental: createRentalForListing,
    acceptRentalById,
    createListing,
    updateListing,
    requestQuote,
    sendMessage,
    markConversationRead,
    markConversationUnread,
    updateProfileSettings,
    withdraw,
    stake,
    confirmPickupById,
    completeRentalById,
    openConversationForListing
  } = useAppContext();
  const [currentView, setCurrentView] = useState<ViewMode>('explore');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  
  // Mobile & Menu States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);
  const unreadMessagesCount = useMemo(
    () => conversations.reduce(
      (sum, conversation) => sum + conversation.messages.filter((message) => message.senderId !== profile?.id && !message.isRead).length,
      0
    ),
    [conversations, profile?.id]
  );
  const isAuthenticated = Boolean(profile);
  const userRole = profile?.role === 'both' ? 'owner' : profile?.role ?? 'renter';
  const defaultAuthenticatedView: ViewMode = userRole === 'owner' ? 'dashboard' : 'explore';
  const allowedViews = useMemo<ViewMode[]>(
    () => (userRole === 'owner'
      ? ['dashboard', 'listings', 'messages', 'wallet', 'staking', 'settings', 'details']
      : ['explore', 'dashboard', 'messages', 'wallet', 'staking', 'settings', 'details']),
    [userRole]
  );

  const handleLogout = () => {
    logout();
    setCurrentView('explore');
    setShowUserMenu(false);
  };

  useEffect(() => {
    if (!profile) {
      return;
    }

    setCurrentView(defaultAuthenticatedView);
    setSelectedListing(null);
  }, [defaultAuthenticatedView, profile?.id]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    if (currentView === 'details' && !selectedListing) {
      setCurrentView(defaultAuthenticatedView);
      return;
    }

    if (!allowedViews.includes(currentView)) {
      setCurrentView(defaultAuthenticatedView);
    }
  }, [allowedViews, currentView, defaultAuthenticatedView, profile, selectedListing]);

  // Handle Navigation
  const handleSwitchMode = (mode: ViewMode) => {
    const nextMode = allowedViews.includes(mode) ? mode : defaultAuthenticatedView;
    setCurrentView(nextMode);
    if (mode !== 'details') {
      setSelectedListing(null);
    }
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  const handleNotificationNavigate = async (link?: string) => {
    await markNotificationsRead();
    setShowNotifications(false);

    if (link === '/messages') {
      setCurrentView('messages');
      return;
    }

    if (link === '/wallet') {
      setCurrentView('wallet');
      return;
    }

    if (link === '/staking') {
      setCurrentView('staking');
      return;
    }

    if (link === '/listings') {
      setCurrentView('listings');
      return;
    }

    setCurrentView('dashboard');
  };

  // Handle Listing Selection
  const handleSelectListing = (listing: Listing) => {
    setSelectedListing(listing);
    setCurrentView('details');
  };

  // Handle Message Owner Action
  const handleContactOwner = async () => {
    if (!selectedListing) {
      return;
    }
    const conversation = await openConversationForListing(selectedListing.id);
    setSelectedConversationId(conversation.id);
    setCurrentView('messages');
  };

  const handleMessageOwnerForListing = async (listingId: string) => {
    const conversation = await openConversationForListing(listingId);
    setSelectedConversationId(conversation.id);
    setCurrentView('messages');
  };

  // Handle Rental Transaction (Triggered by BookingModal)
  const handleRent = async (days: number) => {
    if (!selectedListing) {
      throw new Error('No listing selected');
    }
    return createRentalForListing(selectedListing.id, days);
  };

  const handleBookingFinished = () => {
    setCurrentView('dashboard');
  };

  const handleUpdateListing = async (listingId: string, payload: Parameters<typeof updateListing>[1]) => {
    const updatedListing = await updateListing(listingId, payload);
    setSelectedListing((current) => (current?.id === updatedListing.id ? updatedListing : current));
    return updatedListing;
  };

  if (loading && !profile) {
    return <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-gray-500">Loading Verent...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Onboarding
        error={error}
        onComplete={async (email, role, privyToken, walletAddress) => {
          await loginWithPrivy(email, role, privyToken, walletAddress);
        }}
      />
    );
  }

  if (!wallet) {
    return <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-gray-500">Loading wallet...</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Mobile Responsive Sidebar */}
      <Sidebar 
        currentMode={currentView} 
        onSwitchMode={handleSwitchMode} 
        onLogout={handleLogout}
        walletBalance={wallet?.usdcBalance}
        unreadMessagesCount={unreadMessagesCount}
        userRole={userRole}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main className="flex-1 flex min-h-screen flex-col max-w-full overflow-hidden relative">
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 flex-shrink-0 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex h-full items-center justify-between gap-3">
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
                        if (showNotifications) {
                          void markNotificationsRead();
                        }
                    }}
                    className={`relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50 ${showNotifications ? 'bg-gray-100 text-gray-900' : ''}`}
                >
                    <Bell className="w-4 h-4" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
                    )}
                </button>
                {showNotifications && (
                    <NotificationsPopover
                      notifications={notifications}
                      onMarkAllRead={markNotificationsRead}
                      onNavigate={(link) => { void handleNotificationNavigate(link); }}
                      onClose={() => setShowNotifications(false)}
                    />
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
                        {profile.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-gray-700 hidden sm:inline">{profile.username}</span>
                </div>
                {showUserMenu && (
                    <UserMenu 
                        profile={profile}
                        onClose={() => setShowUserMenu(false)} 
                        onLogout={handleLogout}
                        onSettings={() => handleSwitchMode('settings')}
                    />
                )}
            </div>
          </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="relative flex-1 overflow-y-auto scroll-smooth pb-24 sm:pb-28">
            {userRole !== 'owner' && currentView === 'explore' && (
                <Explore listings={listings} onSelectListing={handleSelectListing} />
            )}
            
            {currentView === 'details' && selectedListing && (
                <ListingDetails 
                    listing={selectedListing} 
                    profile={profile}
                    wallet={wallet}
                    onBack={() => handleSwitchMode('explore')}
                    onRent={handleRent}
                    onBookingFinished={handleBookingFinished}
                    onContactOwner={handleContactOwner}
                    onUpdateListing={handleUpdateListing}
                    requestQuote={requestQuote}
                />
            )}

            {currentView === 'wallet' && (
                <WalletView wallet={wallet} transactions={transactions} onWithdraw={withdraw} onRefresh={refresh} />
            )}

            {currentView === 'staking' && (
                <Staking wallet={wallet} profile={profile} onStake={stake} />
            )}

            {currentView === 'messages' && (
                <Messages
                  currentUserId={profile.id}
                  conversations={conversations}
                  activeConversationId={selectedConversationId}
                  onSendMessage={sendMessage}
                  onMarkConversationRead={markConversationRead}
                  onMarkConversationUnread={markConversationUnread}
                />
            )}

            {currentView === 'dashboard' && (
                <UnifiedDashboard
                  initialTab={userRole === 'owner' ? 'lending' : 'renting'}
                  primaryRole={userRole}
                  myListingsCount={myListings.length}
                  rentingRentals={rentingRentals}
                  lendingRentals={lendingRentals}
                  onAcceptRental={acceptRentalById}
                  onConfirmPickup={confirmPickupById}
                  onCompleteRental={completeRentalById}
                  onCreateListing={createListing}
                  onMessageOwner={handleMessageOwnerForListing}
                />
            )}

            {userRole === 'owner' && currentView === 'listings' && (
                <MyListings listings={myListings} rentals={lendingRentals} onCreateListing={createListing} onSelectListing={handleSelectListing} />
            )}

            {currentView === 'settings' && (
                <Settings profile={profile} notifications={notifications} onSave={updateProfileSettings} />
            )}
        </div>

        {/* Global AI Assistant - Always Available */}
        <AIAssistant devices={devices} />
      </main>
    </div>
  );
};

export default App;
