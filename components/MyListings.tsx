
import React, { useState } from 'react';
import { Plus, Search, Filter, Edit3, Eye, Trash2, AlertCircle, BarChart3 } from 'lucide-react';
import { Listing } from '../types';
import { MOCK_LISTINGS } from '../constants';
import AddListingModal from './AddListingModal';

const MyListings: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Initialize state with mock data filtered for the current user
  // Using state allows us to visually add new items during the demo
  const [myListings, setMyListings] = useState<Listing[]>(
    MOCK_LISTINGS.filter(l => l.ownerId === 'usr_123')
  );

  const handleAddListing = (newListing: Listing) => {
    setMyListings(prev => [newListing, ...prev]);
    setIsAddModalOpen(false);
  };

  const filteredListings = myListings.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          className="flex items-center space-x-2 bg-black text-white px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 hover:shadow-gray-300 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add New Item</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard label="Total Asset Value" value={`$${(42500 + (myListings.length - 3) * 2000).toLocaleString()}`} subtext={`+${myListings.length - 3} new items`} positive />
        <StatsCard label="Active Utilization" value="68%" subtext="2 items currently rented" positive />
        <StatsCard label="Est. Monthly Revenue" value="$2,850" subtext="Based on current bookings" positive />
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
                <th className="px-6 py-4 text-right">Performance</th>
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
                            <span className="text-[10px] text-gray-500">{item.category}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      item.availability === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 
                      item.availability === 'rented' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                         item.availability === 'active' ? 'bg-green-500' : 
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
                    <div className="flex items-center justify-end space-x-2">
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-gray-900">$0</span>
                            <span className="text-[10px] text-gray-400">New Listing</span>
                        </div>
                        <BarChart3 className="w-8 h-8 text-gray-200" />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="View Public Listing">
                            <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-verent-green hover:bg-green-50 rounded-lg transition-colors" title="Edit Details">
                            <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove Listing">
                            <Trash2 className="w-4 h-4" />
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
               className="mt-6 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
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
