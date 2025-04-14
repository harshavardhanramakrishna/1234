import React, { useRef, useEffect } from 'react';
import { Message } from '../../hooks/use-chat-websocket';

interface ChatMessageListProps {
  messages: Message[];
  isTyping: boolean;
  isThinking: boolean;
}

const MessageRenderer = ({ message }: { message: Message }) => {
  return (
    <div className={`flex mb-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
        message.sender === 'user' 
          ? 'bg-blue-500 text-white' 
          : message.sender === 'bot' 
            ? 'bg-gray-200 text-gray-800' 
            : 'bg-green-100 text-green-800'
      }`}>
        {message.message}
      </div>
    </div>
  );
};

export const ChatMessageList = ({ messages, isTyping, isThinking }: ChatMessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-4" id="chat-messages">
      {messages.map((msg, index) => (
        <MessageRenderer key={index} message={msg} />
      ))}

      {isThinking && (
        <div className="flex justify-center my-2">
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm flex items-center">
            <span className="mr-2">Bot is thinking</span>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}
      {isTyping && !isThinking && (
        <div className="flex justify-center my-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};
