import React, { useState } from 'react';
import { MARKETPLACE_ITEMS } from '../constants';
import { DeviceType } from '../types';
import { Search, Filter, Cpu, Camera, Plane, Star, CheckCircle2, AlertCircle } from 'lucide-react';

const Marketplace: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<DeviceType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filters = [
    { label: 'All Equipment', value: 'All' },
    { label: 'Compute', value: DeviceType.GPU, icon: Cpu },
    { label: 'Drones', value: DeviceType.DRONE, icon: Plane },
    { label: 'Cameras', value: DeviceType.CAMERA, icon: Camera },
  ];

  const filteredItems = MARKETPLACE_ITEMS.filter(item => {
    const matchesFilter = activeFilter === 'All' || item.type === activeFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getGradient = (type: DeviceType) => {
    switch (type) {
      case DeviceType.GPU: return 'from-gray-100 to-gray-200';
      case DeviceType.DRONE: return 'from-gray-100 to-slate-200';
      case DeviceType.CAMERA: return 'from-gray-100 to-stone-200';
      default: return 'from-gray-50 to-gray-100';
    }
  };

  const getTypeIcon = (type: DeviceType) => {
    switch (type) {
      case DeviceType.GPU: return <Cpu className="w-12 h-12 text-gray-400" />;
      case DeviceType.DRONE: return <Plane className="w-12 h-12 text-gray-400" />;
      case DeviceType.CAMERA: return <Camera className="w-12 h-12 text-gray-400" />;
      default: return null;
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Hero / Search Section */}
      <div className="relative bg-white rounded-2xl p-8 border border-gray-200 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-verent-green/10 to-transparent rounded-bl-full -mr-16 -mt-16"></div>
        
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Rent Decentralized Infrastructure</h2>
          <p className="text-gray-500 mb-6">Access high-performance GPUs, cinema drones, and professional cameras on demand.</p>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search for H100s, Red Komodo, DJI..." 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent focus:bg-white border focus:border-verent-green/50 focus:ring-4 focus:ring-verent-green/10 rounded-xl text-gray-900 placeholder-gray-400 transition-all outline-none shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
               <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors">
                 <Filter className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 no-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter.label}
            onClick={() => setActiveFilter(filter.value as DeviceType | 'All')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeFilter === filter.value
                ? 'bg-black text-white shadow-lg shadow-black/20 transform scale-105'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {filter.icon && <filter.icon className="w-3.5 h-3.5" />}
            <span>{filter.label}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 flex flex-col">
            
            {/* Card Image/Header */}
            <div className={`h-48 bg-gradient-to-br ${getGradient(item.type)} relative flex items-center justify-center overflow-hidden`}>
               <div className="absolute inset-0 opacity-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>
               <div className="transform group-hover:scale-110 transition-transform duration-500">
                 {getTypeIcon(item.type)}
               </div>
               <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md border border-white/20 shadow-sm">
                 <span className="text-xs font-bold text-gray-900 font-mono">${item.price.toFixed(2)}</span>
                 <span className="text-[10px] text-gray-500">/{item.unit}</span>
               </div>
               {item.availability !== 'Available' && (
                 <div className="absolute top-4 left-4 bg-black/80 text-white text-[10px] font-medium px-2 py-1 rounded backdrop-blur-sm">
                    {item.availability}
                 </div>
               )}
            </div>

            {/* Card Content */}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-verent-green transition-colors">{item.title}</h3>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                        {item.location}
                    </p>
                </div>
              </div>

              {/* Specs Tags */}
              <div className="flex flex-wrap gap-2 mb-4 mt-2">
                {item.specs.map((spec, i) => (
                    <span key={i} className="text-[10px] font-medium bg-gray-50 text-gray-600 px-2 py-1 rounded border border-gray-100">
                        {spec}
                    </span>
                ))}
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                 <div className="flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                    <span className="text-xs font-bold text-gray-900">{item.rating}</span>
                    <span className="text-[10px] text-gray-400">({item.reviews})</span>
                 </div>
                 
                 <button className="bg-verent-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors shadow-lg shadow-verent-green/30 flex items-center space-x-2">
                    <span>Rent Now</span>
                 </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No equipment found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
};

export default Marketplace;