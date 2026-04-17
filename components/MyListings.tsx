
import React, { useState } from 'react';
import { Plus, Search, Filter, Eye, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Listing, Rental } from '../types';
import AddListingModal from './AddListingModal';
import type { CreateListingRequest } from '../shared/contracts';
import { buildSolanaExplorerTxUrl } from '../shared/protocol';
import { formatOnChainShortId } from './OnChainProofCard';

interface MyListingsProps {
  listings: Listing[];
  rentals: Rental[];
  onCreateListing: (payload: CreateListingRequest) => Promise<Listing>;
  onSelectListing: (listing: Listing) => void;
}

const MyListings: React.FC<MyListingsProps> = ({ listings, rentals, onCreateListing, onSelectListing }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddListing = async (payload: CreateListingRequest) => {
    return onCreateListing(payload);
  };

  const filteredListings = listings.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAssetValue = listings.reduce((sum, item) => sum + item.collateralValueUsdc, 0);
  const rentedCount = listings.filter((item) => item.availability === 'rented').length;
  const utilization = listings.length > 0 ? Math.round((rentedCount / listings.length) * 100) : 0;
  const monthlyRevenue = rentals
    .filter((rental) => {
      const endDate = new Date(rental.endDate);
      const now = new Date();
      const monthAgo = new Date();
      monthAgo.setDate(now.getDate() - 30);
      return endDate >= monthAgo && (rental.status === 'active' || rental.status === 'completed' || rental.status === 'return_pending');
    })
    .reduce((sum, rental) => sum + rental.totalCost, 0);
  const performanceByListing = rentals.reduce((acc: Record<string, { revenue: number; bookings: number }>, rental) => {
    acc[rental.itemId] = acc[rental.itemId] || { revenue: 0, bookings: 0 };
    acc[rental.itemId].revenue += rental.totalCost;
    acc[rental.itemId].bookings += 1;
    return acc;
  }, {});

  const StatsCard = ({ label, value, subtext, positive }: { label: string, value: string, subtext: string, positive?: boolean }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
      <div className="mt-2 flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-gray-900 tracking-tight font-mono">{value}</span>
      </div>
      <p className={`text-xs mt-1 ${positive ? 'text-verent-green' : 'text-gray-400'}`}>{subtext}</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Fleet</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your hardware inventory and availability.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-2 bg-verent-yellow text-verent-black px-4 py-2.5 rounded-lg hover:bg-verent-yellow-dark transition-all shadow-lg shadow-verent-yellow/20 hover:shadow-verent-yellow/30 hover:-translate-y-0.5 font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add New Item</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard label="Total Asset Value" value={`$${totalAssetValue.toLocaleString()}`} subtext={`${listings.length} tracked listings`} positive />
        <StatsCard label="Active Utilization" value={`${utilization}%`} subtext={`${rentedCount} items currently rented`} positive={utilization > 0} />
        <StatsCard label="30-Day Revenue" value={`$${monthlyRevenue.toLocaleString()}`} subtext="From active and completed rentals" positive={monthlyRevenue > 0} />
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-3 bg-white p-1.5 rounded-xl border border-gray-200 w-full md:w-fit">
        <div className="relative flex-1 md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search inventory..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent text-sm outline-none placeholder-gray-400"
          />
        </div>
        <div className="w-px h-6 bg-gray-200"></div>
        <button className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm min-h-[300px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Asset Details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Daily Rate</th>
                <th className="px-6 py-4 text-right">Bookings</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredListings.map((item) => (
                <tr key={item.id} className="group hover:bg-gray-50/80 transition-colors animate-in slide-in-from-bottom-2 duration-300">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200 relative">
                         {/* Use a placeholder if image fails or isn't set */}
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-verent-green transition-colors line-clamp-1">{item.title}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[10px] font-mono text-gray-400">{item.id.slice(0, 8)}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span className="text-[10px] text-gray-500">{item.productType || item.category}</span>
                        </div>
                        {(item.confirmedSignature || item.listingPda) && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {item.confirmedSignature && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-verent-peach px-2 py-0.5 text-[10px] font-semibold text-verent-yellow-dark">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Confirmed</span>
                              </span>
                            )}
                            {item.confirmedSignature && (
                              <a
                                href={buildSolanaExplorerTxUrl(item.confirmedSignature, item.chainCluster || 'devnet')}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-gray-900"
                              >
                                <span>Explorer</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {item.listingPda && (
                              <span className="text-[10px] font-mono text-gray-400">
                                PDA {formatOnChainShortId(item.listingPda)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      item.availability === 'active' ? 'bg-verent-peach text-verent-yellow-dark border-verent-yellow/30' : 
                      item.availability === 'rented' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                         item.availability === 'active' ? 'bg-verent-yellow-dark' : 
                         item.availability === 'rented' ? 'bg-blue-500' :
                         'bg-gray-400'
                      }`}></span>
                      <span className="capitalize">{item.availability}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-mono font-medium text-gray-900">${item.dailyRateUsdc.toFixed(2)}</span>
                    <span className="text-xs text-gray-400 ml-1">USDC</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-gray-900">
                        {performanceByListing[item.id]?.bookings ?? 0} bookings
                      </span>
                      <span className="text-[10px] text-gray-400">
                        ${((performanceByListing[item.id]?.revenue ?? 0)).toLocaleString()} earned
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onSelectListing(item)}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Public Listing"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredListings.length === 0 && (
          <div className="p-12 text-center flex flex-col items-center justify-center h-64">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
             </div>
             <h3 className="text-lg font-medium text-gray-900">No listings found</h3>
             <p className="text-gray-500 mt-1 max-w-sm">You haven't listed any equipment yet. Add your first item to start earning.</p>
             <button 
               onClick={() => setIsAddModalOpen(true)}
               className="mt-6 bg-verent-yellow text-verent-black px-6 py-2.5 rounded-lg hover:bg-verent-yellow-dark transition-colors text-sm font-semibold"
             >
                Create First Listing
             </button>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <AddListingModal 
            onClose={() => setIsAddModalOpen(false)} 
            onAdd={handleAddListing}
        />
      )}
    </div>
  );
};

export default MyListings;
