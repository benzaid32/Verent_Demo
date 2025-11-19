
import React, { useState } from 'react';
import { MOCK_LISTINGS } from '../constants';
import { Listing } from '../types';
import { Search, Filter, MapPin } from 'lucide-react';

interface ExploreProps {
  onSelectListing: (listing: Listing) => void;
}

const Explore: React.FC<ExploreProps> = ({ onSelectListing }) => {
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  const categories = ['All', 'Camera', 'Drone', 'Lighting', 'Compute'];

  const filteredListings = MOCK_LISTINGS.filter(item => 
    (category === 'All' || item.category === category) &&
    (item.title.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Explore Infrastructure</h1>
        
        <div className="flex items-center space-x-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search gear..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none w-64"
                />
            </div>
            <button className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                <Filter className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map(cat => (
            <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    category === cat 
                    ? 'bg-black text-white shadow-md' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
            >
                {cat}
            </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredListings.map((listing) => (
            <div 
                key={listing.id} 
                onClick={() => onSelectListing(listing)}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 cursor-pointer hover:-translate-y-1 flex flex-col h-full"
            >
                <div className="aspect-[4/3] overflow-hidden relative bg-gray-100">
                    <img 
                        src={listing.imageUrl} 
                        alt={listing.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-gray-900 shadow-sm">
                        ${listing.dailyRateUsdc}/day
                    </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-verent-green transition-colors">{listing.title}</h3>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                                <MapPin className="w-3 h-3 mr-1" />
                                {listing.location}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {listing.specs.slice(0, 2).map((spec, idx) => (
                            <span key={idx} className="text-[10px] bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-100">
                                {spec}
                            </span>
                        ))}
                    </div>

                    <div className="mt-auto pt-3 border-t border-gray-50 flex items-center space-x-2">
                        <img src={listing.ownerAvatar} alt={listing.ownerName} className="w-6 h-6 rounded-full border border-gray-100" />
                        <span className="text-xs text-gray-500 font-medium">{listing.ownerName}</span>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Explore;
