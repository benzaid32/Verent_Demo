import React from 'react';
import { Device, DeviceStatus, DeviceType } from '../types';
import { Activity, Cpu, Camera, Plane, Wifi } from 'lucide-react';

interface FleetTableProps {
  devices: Device[];
}

const FleetTable: React.FC<FleetTableProps> = ({ devices }) => {
  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.ACTIVE:
        return 'bg-green-100 text-green-700 border-green-200';
      case DeviceStatus.RENTED:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case DeviceStatus.OFFLINE:
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case DeviceStatus.MAINTENANCE:
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getTypeIcon = (type: DeviceType) => {
    switch (type) {
      case DeviceType.GPU:
        return <Cpu className="w-4 h-4" />;
      case DeviceType.DRONE:
        return <Plane className="w-4 h-4" />;
      case DeviceType.CAMERA:
        return <Camera className="w-4 h-4" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Global Fleet Status</h3>
        <div className="flex space-x-2">
            <span className="flex items-center space-x-1 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>{devices.filter(d => d.status === DeviceStatus.ACTIVE || d.status === DeviceStatus.RENTED).length} Online</span>
            </span>
            <span className="flex items-center space-x-1 text-xs text-gray-500 pl-2 border-l border-gray-200">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>{devices.filter(d => d.status === DeviceStatus.OFFLINE).length} Offline</span>
            </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <th className="px-6 py-3">Device Name</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Daily Rate</th>
              <th className="px-6 py-3 text-right">Total Earnings</th>
              <th className="px-6 py-3 text-right">Uptime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {devices.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50/80 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{device.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{device.id}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2 text-gray-600 text-sm">
                    {getTypeIcon(device.type)}
                    <span>{device.type}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(device.status)}`}>
                    {device.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600 font-mono">
                  ${device.dailyRate.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 font-mono">
                  ${device.totalEarnings.toLocaleString()}
                </td>
                 <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <span className="text-sm text-gray-600 font-mono">{device.uptime}%</span>
                    <Activity className={`w-3 h-3 ${device.uptime > 98 ? 'text-green-500' : 'text-orange-400'}`} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FleetTable;
