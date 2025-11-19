
import React, { useState } from 'react';
import { MOCK_RENTALS, MOCK_LENDING } from '../constants';
import { QrCode, Scan, ArrowRight, Clock, CheckCircle2, Plus, PackageCheck } from 'lucide-react';
import AddListingModal from './AddListingModal';

interface UnifiedDashboardProps {
  initialTab?: 'renting' | 'lending';
}

const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({ initialTab = 'renting' }) => {
  const [activeTab, setActiveTab] = useState<'renting' | 'lending'>(initialTab);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const rentals = activeTab === 'renting' ? MOCK_RENTALS : MOCK_LENDING;

  const handleListingAdded = () => {
    setIsAddModalOpen(false);
    setShowSuccessToast(true);
    // Auto hide toast after 3 seconds
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500 relative">
        
        {/* Success Toast */}
        {showSuccessToast && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top-4 duration-300">
                <PackageCheck className="w-5 h-5 text-verent-green" />
                <span className="text-sm font-medium">Item added to inventory successfully</span>
            </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Command Center</h1>
                <p className="text-gray-500 text-sm mt-1">Manage your infrastructure rentals and fleet status.</p>
            </div>
            
            <div className="flex items-center space-x-4">
                <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                    <button 
                        onClick={() => setActiveTab('renting')}
                        className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'renting' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Renting
                    </button>
                    <button 
                        onClick={() => setActiveTab('lending')}
                        className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'lending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Lending
                    </button>
                </div>
                
                {/* ADD NEW ITEM CTA - Only visible in Lending Mode */}
                {activeTab === 'lending' && (
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="hidden md:flex items-center space-x-2 bg-black text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-all shadow-md hover:shadow-lg shadow-gray-200"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Add Item</span>
                    </button>
                )}
            </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">2</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Active Rentals</p>
                <p className="text-xs text-gray-500">Requires attention</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                     <div className="p-2 bg-green-50 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">12</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Completed</p>
                <p className="text-xs text-gray-500">Lifetime total</p>
            </div>
             <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                     <div className="p-2 bg-orange-50 rounded-lg">
                        <Scan className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">1</span>
                </div>
                <p className="text-sm font-medium text-gray-900">Pending Handshake</p>
                <p className="text-xs text-gray-500">Action needed</p>
            </div>
        </div>

        {/* List Section */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">{activeTab === 'renting' ? 'My Active Rentals' : 'Fleet Requests'}</h3>
                
                {/* Mobile Add Button */}
                {activeTab === 'lending' && (
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="md:hidden flex items-center space-x-1 text-xs font-medium text-black bg-white border border-gray-200 px-3 py-1.5 rounded-lg"
                    >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                    </button>
                )}
            </div>
            
            <div className="divide-y divide-gray-50">
                {rentals.map((rental) => (
                    <div key={rental.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                            <img src={rental.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-200" />
                            <div>
                                <h4 className="font-bold text-gray-900">{rental.itemTitle}</h4>
                                <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                                    <span>{rental.startDate}</span>
                                    <ArrowRight className="w-3 h-3" />
                                    <span>{rental.endDate}</span>
                                </div>
                                <div className="mt-2 flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                                        rental.status === 'active' ? 'bg-green-100 text-green-700' :
                                        rental.status === 'pending_pickup' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {rental.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">${rental.totalCost}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="flex-shrink-0">
                            {activeTab === 'renting' && rental.status === 'pending_pickup' && (
                                <button 
                                    onClick={() => setShowQR(rental.id)}
                                    className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                >
                                    <QrCode className="w-4 h-4" />
                                    <span>Show Pickup QR</span>
                                </button>
                            )}
                             {activeTab === 'lending' && rental.status === 'return_pending' && (
                                <button className="flex items-center space-x-2 bg-verent-green text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium">
                                    <Scan className="w-4 h-4" />
                                    <span>Scan Return QR</span>
                                </button>
                            )}
                             {rental.status === 'active' && (
                                <div className="text-sm text-gray-500 flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span>On-Chain Active</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* QR Modal Overlay */}
        {showQR && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQR(null)}>
                <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Digital Handshake</h3>
                    <p className="text-sm text-gray-500 mb-6">Show this to the owner to unlock the smart contract escrow.</p>
                    <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 inline-block mb-6">
                        <QrCode className="w-48 h-48 text-gray-900" />
                    </div>
                    <button 
                        onClick={() => setShowQR(null)}
                        className="w-full py-3 bg-gray-100 text-gray-900 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        )}

        {isAddModalOpen && (
            <AddListingModal 
                onClose={() => setIsAddModalOpen(false)} 
                onAdd={handleListingAdded}
            />
        )}
    </div>
  );
};

export default UnifiedDashboard;
