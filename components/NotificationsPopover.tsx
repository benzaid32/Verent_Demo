
import React from 'react';
import type { Notification } from '../types';
import { ShieldAlert, Wallet, Info } from 'lucide-react';

interface NotificationsPopoverProps {
  notifications: Notification[];
  onMarkAllRead: () => Promise<void>;
  onNavigate: (link?: string) => void;
  onClose: () => void;
}

const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ notifications, onMarkAllRead, onNavigate, onClose }) => {
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const handleMarkAllRead = async () => {
    if (!unreadCount) {
      return;
    }
    await onMarkAllRead();
  };

  return (
    <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 sm:w-80">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div>
                <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                <p className="mt-1 text-[11px] text-gray-500">{unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'All caught up'}</p>
            </div>
            <button onClick={() => void handleMarkAllRead()} disabled={!unreadCount} className="text-xs text-verent-yellow-dark hover:text-verent-black font-medium disabled:text-gray-300 disabled:hover:text-gray-300">Mark all read</button>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
            {notifications.length > 0 ? (
                <div className="divide-y divide-gray-50">
                    {notifications.map(notif => (
                        <button
                            key={notif.id}
                            type="button"
                            onClick={() => onNavigate(notif.link)}
                            className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                        >
                            <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-full flex-shrink-0 ${
                                    notif.type === 'security' ? 'bg-red-100 text-red-600' :
                                    notif.type === 'wallet' ? 'bg-verent-yellow/25 text-verent-yellow-dark' :
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
                        </button>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                    You are all caught up.
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
