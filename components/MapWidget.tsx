
import React, { useState } from 'react';
import { MapPin, Plus, Minus } from 'lucide-react';

const MapWidget: React.FC = () => {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  return (
    <div className="relative w-full h-[300px] bg-[#1a1a1a] rounded-xl overflow-hidden flex items-center justify-center group border border-gray-800">
      {/* Grid Background Effect */}
      <div className="absolute inset-0 opacity-20 transition-transform duration-500"
           style={{ 
             backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
             backgroundSize: '40px 40px',
             transform: `scale(${zoom})`
           }}>
      </div>

      {/* Abstract Map Shapes */}
      <div className="absolute inset-0 w-full h-full transition-transform duration-500" style={{ transform: `scale(${zoom})` }}>
        <svg className="w-full h-full opacity-30" viewBox="0 0 400 300" preserveAspectRatio="none">
            <path d="M50,150 Q100,100 150,150 T250,150 T350,200" fill="none" stroke="#4b5563" strokeWidth="2" />
            <path d="M20,250 Q80,200 120,250 T200,280" fill="none" stroke="#4b5563" strokeWidth="1.5" />
            <path d="M200,50 Q250,100 300,50 T380,80" fill="none" stroke="#4b5563" strokeWidth="1.5" />
        </svg>
        
        {/* Device Nodes - Scaled with zoom */}
        <div className="absolute top-1/4 left-1/4 flex flex-col items-center group/pin cursor-pointer">
            <div className="relative">
            <div className="w-3 h-3 bg-verent-green rounded-full shadow-[0_0_10px_#2ecc71] animate-pulse"></div>
            <div className="absolute -inset-1 bg-verent-green opacity-20 rounded-full animate-ping"></div>
            </div>
            <div className="opacity-0 group-hover/pin:opacity-100 transition-opacity absolute top-4 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm border border-gray-700 z-10">
            Seattle Hub (Active)
            </div>
        </div>

        <div className="absolute bottom-1/3 right-1/3 flex flex-col items-center group/pin cursor-pointer">
            <div className="w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_10px_orange]"></div>
            <div className="opacity-0 group-hover/pin:opacity-100 transition-opacity absolute top-4 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm border border-gray-700 z-10">
            Austin Node (Maint.)
            </div>
        </div>

        <div className="absolute top-1/3 right-10 flex flex-col items-center group/pin cursor-pointer">
            <div className="relative">
            <div className="w-3 h-3 bg-verent-green rounded-full shadow-[0_0_10px_#2ecc71]"></div>
            </div>
            <div className="opacity-0 group-hover/pin:opacity-100 transition-opacity absolute top-4 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm border border-gray-700 z-10">
            NY Node (Active)
            </div>
        </div>
      </div>

      {/* Controls UI - Fixed */}
       <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-lg flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-verent-green" />
            <span className="text-xs text-gray-300 font-mono">LIVE TRACKING</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex flex-col space-y-2">
         <button onClick={handleZoomIn} className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg backdrop-blur-md border border-white/10">
             <Plus className="w-4 h-4" />
         </button>
         <button onClick={handleZoomOut} className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg backdrop-blur-md border border-white/10">
             <Minus className="w-4 h-4" />
         </button>
      </div>
    </div>
  );
};

export default MapWidget;
