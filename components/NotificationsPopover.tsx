
import React from 'react';
import type { Notification } from '../types';
import { Bell, Check, ShieldAlert, Wallet, Info, CheckCircle2 } from 'lucide-react';

interface NotificationsPopoverProps {
  notifications: Notification[];
  onMarkAllRead: () => Promise<void>;
  onClose: () => void;
}

const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ notifications, onMarkAllRead, onClose }) => {
  return (
    <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
            <button onClick={() => void onMarkAllRead()} className="text-xs text-verent-green hover:text-emerald-700 font-medium">Mark all read</button>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
            {notifications.length > 0 ? (
                <div className="divide-y divide-gray-50">
                    {notifications.map(notif => (
                        <div key={notif.id} className={`p-4 hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-blue-50/30' : ''}`}>
                            <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-full flex-shrink-0 ${
                                    notif.type === 'security' ? 'bg-red-100 text-red-600' :
                                    notif.type === 'wallet' ? 'bg-green-100 text-green-600' :
                                    'bg-blue-100 text-blue-600'
                                }`}>
                                    {notif.type === 'security' ? <ShieldAlert className="w-4 h-4" /> :
                                     notif.type === 'wallet' ? <Wallet className="w-4 h-4" /> :
                                     <Info className="w-4 h-4" />}
                                </div>
                                <div>
                                    <p className={`text-sm text-gray-900 leading-snug ${!notif.isRead ? 'font-semibold' : 'font-medium'}`}>
                                        {notif.title}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                                        {notif.message}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1">{notif.timestamp}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                    No new notifications
                </div>
            )}
        </div>
        <button onClick={onClose} className="w-full py-3 text-xs font-medium text-gray-500 border-t border-gray-100 hover:bg-gray-50 transition-colors">
            Close
        </button>
    </div>
  );
};

export default NotificationsPopover;
