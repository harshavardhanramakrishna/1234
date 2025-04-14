
import React, { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { UserForm } from './chat/UserForm';
import { ChatMessageList } from './chat/ChatMessageList';
import { ChatInputForm } from './chat/ChatInputForm';
import { HumanRequestForm } from './chat/HumanRequestForm';
import { useGPT2 } from '@/hooks/use-gpt2';
import { useChatWebSocket } from '@/hooks/use-chat-websocket';

interface Message {
  message: string;
  sender: 'user' | 'bot' | 'human' | 'system';
  timestamp: string;
  agentName?: string;
}

const ChatInterface = () => {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUserForm, setShowUserForm] = useState(true);
  const [showHumanRequestForm, setShowHumanRequestForm] = useState(false);
  const [issue, setIssue] = useState('');
  
  const { 
    messages, 
    setMessages, 
    isTyping, 
    isThinking,
    roomId, 
    socket, 
    sendMessage, 
    joinRoom, 
    requestHuman 
  } = useChatWebSocket();

  const handleUserFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name to start chatting.',
        variant: 'destructive'
      });
      return;
    }
    
    setShowUserForm(false);
    
    // Join chat room
    joinRoom(userName, userEmail);
    
    // Add welcome message
    setMessages([
      {
        message: `Hello ${userName}! How can I assist you today?`,
        sender: 'bot',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const handleSendMessage = async (inputMessage: string) => {
    if (!inputMessage.trim()) return;
    
    const userMessage = {
      message: inputMessage,
      sender: 'user' as const,
      timestamp: new Date().toISOString()
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      // Always send message to backend server
      sendMessage(inputMessage.trim(), 'user');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message to server.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestHuman = () => {
    setShowHumanRequestForm(true);
  };

  const handleSubmitHumanRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim() || !userEmail.trim() || !issue.trim()) {
      toast({
        title: 'All Fields Required',
        description: 'Please fill in all required fields to request a human agent.',
        variant: 'destructive'
      });
      return;
    }
    
    requestHuman(userName, userEmail, issue);
    setShowHumanRequestForm(false);
    
    // Add system message about human request
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        message: 'Your request for a human agent has been submitted. An agent will join the chat shortly.',
        sender: 'system',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="p-4 bg-white border-b shadow-sm">
        <h1 className="text-xl font-bold text-center">Company Chat Assistant</h1>
      </header>
      
      {showUserForm ? (
        <UserForm
          userName={userName}
          setUserName={setUserName}
          userEmail={userEmail}
          setUserEmail={setUserEmail}
          onSubmit={handleUserFormSubmit}
        />
      ) : (
        <>
          <ChatMessageList 
            messages={messages} 
            isTyping={isTyping} 
            isThinking={isThinking}
          />
          
          {showHumanRequestForm ? (
            <HumanRequestForm
              userName={userName}
              setUserName={setUserName}
              userEmail={userEmail}
              setUserEmail={setUserEmail}
              issue={issue}
              setIssue={setIssue}
              onSubmit={handleSubmitHumanRequest}
              onCancel={() => setShowHumanRequestForm(false)}
            />
          ) : (
            <ChatInputForm
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onRequestHuman={handleRequestHuman}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ChatInterface;
