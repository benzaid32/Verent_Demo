import React from 'react';
import RevenueChart from './RevenueChart';
import MapWidget from './MapWidget';
import FleetTable from './FleetTable';
import { MOCK_DEVICES } from '../constants';

const ListerDashboard: React.FC = () => {
  return (
    <div className="p-4 sm:p-8 space-y-8 overflow-y-auto animate-in fade-in duration-500">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Chart Section - Spans 2 columns */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Real-time Revenue</h2>
                        <p className="text-xs text-gray-500 mt-1">Network accumulated earnings over 24h</p>
                    </div>
                        <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 tracking-tight font-mono">$1,240.50</p>
                        <p className="text-[10px] text-verent-green font-medium">+12.5% vs yesterday</p>
                    </div>
                </div>
                <RevenueChart />
            </div>

            {/* Map Section - Spans 1 column */}
            <div className="flex flex-col space-y-4">
                    <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                    <MapWidget />
                    </div>
                    {/* Mini Stat Cards beneath map */}
                    <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Active Nodes</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">142</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Utilization</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">87%</p>
                    </div>
                    </div>
            </div>
        </div>

        {/* Fleet Table Section */}
        <div>
                <FleetTable devices={MOCK_DEVICES} />
        </div>
    </div>
  );
};

export default ListerDashboard;