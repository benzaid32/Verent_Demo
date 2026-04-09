
import React, { useState } from 'react';
import { Listing } from '../types';
import { Search, Filter, MapPin } from 'lucide-react';

interface ExploreProps {
  listings: Listing[];
  onSelectListing: (listing: Listing) => void;
}

const Explore: React.FC<ExploreProps> = ({ listings, onSelectListing }) => {
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  const categories = ['All', 'Camera', 'Drone', 'Lighting', 'Compute', 'Audio', 'Event', 'Other'];

  const filteredListings = listings.filter(item => 
    (category === 'All' || item.category === category) &&
    (
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.productType?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-5 px-4 py-5 animate-in fade-in duration-500 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Explore Infrastructure</h1>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search gear..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-verent-green focus:ring-2 focus:ring-verent-green/20 sm:w-64"
                />
            </div>
            <button className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 sm:self-auto">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
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
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-semibold text-white shadow-sm">
                        {listing.productType || listing.category}
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
                            <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                {listing.category}{listing.productType ? ` • ${listing.productType}` : ''}
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
