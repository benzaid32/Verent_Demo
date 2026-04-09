import React, { useEffect, useState } from 'react';
import { Conversation } from '../types';
import { Send, Check, CheckCheck, Package2, ChevronLeft } from 'lucide-react';

interface MessagesProps {
  currentUserId: string;
  conversations: Conversation[];
  activeConversationId?: string | null;
  onSendMessage: (conversationId: string, text: string) => Promise<void>;
  onMarkConversationRead: (conversationId: string) => Promise<void>;
}

const Messages: React.FC<MessagesProps> = ({ currentUserId, conversations, activeConversationId, onSendMessage, onMarkConversationRead }) => {
  const [activeConvId, setActiveConvId] = useState<string>(activeConversationId ?? conversations[0]?.id ?? '');
  const [inputText, setInputText] = useState('');
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(Boolean(activeConversationId));
  const activeConversation = conversations.find(c => c.id === activeConvId) ?? conversations[0];

  const formatRentalStatus = (status?: Conversation['contextRentalStatus']) => {
    if (!status) {
      return null;
    }
    return status.replace(/_/g, ' ');
  };

  useEffect(() => {
    if (!activeConvId && conversations[0]?.id) {
      setActiveConvId(conversations[0].id);
    }
  }, [activeConvId, conversations]);

  useEffect(() => {
    if (activeConversationId) {
      setActiveConvId(activeConversationId);
      setIsMobileThreadOpen(true);
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversation) {
      setIsMobileThreadOpen(false);
    }
  }, [activeConversation]);

  useEffect(() => {
    if (!activeConversation?.id || activeConversation.unreadCount <= 0) {
      return;
    }
    void onMarkConversationRead(activeConversation.id);
  }, [activeConversation?.id, activeConversation?.unreadCount, onMarkConversationRead]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;
    void onSendMessage(activeConversation.id, inputText);
    setInputText('');
  };

  return (
    <div className="flex h-full min-h-0 bg-white overflow-hidden animate-in fade-in duration-500">
      
      {/* LEFT SIDEBAR - Conversation List */}
      <div className={`${isMobileThreadOpen ? 'hidden md:flex' : 'flex'} h-full w-full flex-col border-r border-gray-200 md:w-80`}>
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Inbox</h1>
          <p className="text-sm text-gray-500">Each owner appears once, while booking context updates inside the thread.</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {
                setActiveConvId(conv.id);
                setIsMobileThreadOpen(true);
              }}
              className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-start space-x-3 ${activeConvId === conv.id ? 'bg-gray-50 border-l-4 border-l-verent-green' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="relative">
                <img src={conv.participantAvatar} alt={conv.participantName} className="w-10 h-10 rounded-full object-cover" />
                {conv.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-verent-green rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {conv.participantName}
                  </span>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{conv.lastMessageDate}</span>
                </div>
                <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                   {conv.messages[conv.messages.length - 1]?.senderId === currentUserId && 'You: '}{conv.lastMessage}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {conv.contextListingTitle && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-500 font-medium">
                      {conv.contextListingTitle}
                    </span>
                  )}
                  {conv.contextRentalStatus && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-[10px] text-blue-700 font-medium capitalize">
                      {formatRentalStatus(conv.contextRentalStatus)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      {activeConversation ? (
        <div className={`${isMobileThreadOpen ? 'flex' : 'hidden md:flex'} min-h-0 flex-1 flex-col bg-[#FAFAFA]`}>
          {/* Chat Header */}
          <div className="px-4 py-4 sm:px-6 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
            <div className="flex min-w-0 items-center space-x-3">
              <button
                type="button"
                onClick={() => setIsMobileThreadOpen(false)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 md:hidden"
                aria-label="Back to conversations"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <img src={activeConversation.participantAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900">{activeConversation.participantName}</h2>
                <div className="flex items-center space-x-2 min-w-0">
                   <span className="text-xs text-gray-500">{activeConversation.participantRole}</span>
                   {activeConversation.contextListingTitle && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="truncate text-xs text-gray-500">{activeConversation.contextListingTitle}</span>
                    </>
                   )}
                </div>
              </div>
            </div>
          </div>

          {(activeConversation.contextListingTitle || activeConversation.contextRentalStatus) && (
            <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:gap-4">
                {activeConversation.contextListingThumbnail ? (
                  <img
                    src={activeConversation.contextListingThumbnail}
                    alt={activeConversation.contextListingTitle || 'Listing'}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white border border-gray-200">
                    <Package2 className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Active Context</p>
                  <p className="truncate text-sm font-bold text-gray-900">{activeConversation.contextListingTitle || activeConversation.relatedItemTitle}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {activeConversation.contextRentalStatus && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-blue-700">
                        {formatRentalStatus(activeConversation.contextRentalStatus)}
                      </span>
                    )}
                    {activeConversation.contextRentalId && (
                      <span className="text-[10px] font-medium text-gray-500">Rental {activeConversation.contextRentalId}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 sm:p-6 sm:space-y-6">
             {activeConversation.messages.map((msg) => {
               const isMe = msg.senderId === currentUserId;
               return (
                 <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[70%] ${isMe ? 'order-1' : 'order-2'}`}>
                       <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                         isMe 
                         ? 'bg-black text-white rounded-br-sm' 
                         : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                       }`}>
                          {msg.text}
                       </div>
                       <div className={`flex items-center mt-1 space-x-1 text-[10px] text-gray-400 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          {isMe && (msg.isRead ? <CheckCheck className="w-3 h-3 text-verent-green" /> : <Check className="w-3 h-3" />)}
                       </div>
                    </div>
                 </div>
               );
             })}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            <form onSubmit={handleSend} className="flex items-center space-x-2 sm:space-x-3 bg-gray-50 rounded-xl p-2 border border-gray-200 focus-within:ring-2 focus-within:ring-verent-green/20 focus-within:border-verent-green transition-all">
               <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
               />
               <button 
                  type="submit" 
                  disabled={!inputText.trim()}
                  className="p-2 bg-verent-green text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
               >
                  <Send className="w-4 h-4" />
               </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden flex-1 items-center justify-center bg-gray-50 md:flex">
           <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                 <Send className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-gray-900 font-medium">Select a conversation</h3>
              <p className="text-gray-500 text-sm mt-1">Choose a chat from the list to start messaging.</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default Messages;