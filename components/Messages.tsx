import React, { useState } from 'react';
import { MOCK_CONVERSATIONS, MOCK_USER } from '../constants';
import { Conversation, Message } from '../types';
import { Search, Send, MoreHorizontal, Paperclip, Smile, Check, CheckCheck, Phone, Video } from 'lucide-react';

const Messages: React.FC = () => {
  const [activeConvId, setActiveConvId] = useState<string>(MOCK_CONVERSATIONS[0].id);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [inputText, setInputText] = useState('');

  const activeConversation = conversations.find(c => c.id === activeConvId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const newMessage: Message = {
      id: `new_${Date.now()}`,
      senderId: MOCK_USER.id,
      text: inputText,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    // Update conversation with new message
    setConversations(prev => prev.map(c => {
      if (c.id === activeConvId) {
        return {
          ...c,
          messages: [...c.messages, newMessage],
          lastMessage: inputText,
          lastMessageDate: 'Just now'
        };
      }
      return c;
    }));

    setInputText('');
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white overflow-hidden animate-in fade-in duration-500">
      
      {/* LEFT SIDEBAR - Conversation List */}
      <div className="w-full md:w-80 border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search messages..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-verent-green/20 focus:border-verent-green outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
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
                   {conv.messages[conv.messages.length - 1]?.senderId === MOCK_USER.id && 'You: '}{conv.lastMessage}
                </p>
                {conv.relatedItemTitle && (
                   <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-500 font-medium">
                      {conv.relatedItemTitle}
                   </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col h-full bg-[#FAFAFA]">
          {/* Chat Header */}
          <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center space-x-3">
              <img src={activeConversation.participantAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
              <div>
                <h2 className="text-sm font-bold text-gray-900">{activeConversation.participantName}</h2>
                <div className="flex items-center space-x-2">
                   <span className="text-xs text-gray-500">{activeConversation.participantRole}</span>
                   <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                   <span className="text-xs text-verent-green font-medium">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-gray-400">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Phone className="w-4 h-4" /></button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><Video className="w-4 h-4" /></button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
             {activeConversation.messages.map((msg) => {
               const isMe = msg.senderId === MOCK_USER.id;
               return (
                 <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isMe ? 'order-1' : 'order-2'}`}>
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
            <form onSubmit={handleSend} className="flex items-center space-x-3 bg-gray-50 rounded-xl p-2 border border-gray-200 focus-within:ring-2 focus-within:ring-verent-green/20 focus-within:border-verent-green transition-all">
               <button type="button" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Paperclip className="w-5 h-5" />
               </button>
               <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
               />
               <button type="button" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Smile className="w-5 h-5" />
               </button>
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
        <div className="flex-1 flex items-center justify-center bg-gray-50">
           <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                 <MoreHorizontal className="w-8 h-8 text-gray-300" />
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