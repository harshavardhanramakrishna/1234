import { useState, useEffect } from 'react';
import { toast } from '../hooks/use-toast';
import { websocketConfig } from '../config/websocket';

export interface Message {
  message: string;
  sender: 'user' | 'bot' | 'human' | 'system';
  timestamp: string;
  agentName?: string;
  type?: 'text' | 'code' | 'error'; 
}

interface ChatWebSocketReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isTyping: boolean;
  isThinking: boolean;
  roomId: string | null;
  socket: WebSocket | null;
  sendMessage: (message: string, sender: 'user') => void;
  joinRoom: (userName: string, userEmail: string) => void;
  requestHuman: (userName: string, userEmail: string, issue: string) => void;
}

export const useChatWebSocket = (): ChatWebSocketReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (roomId) {
      const wsUrl = websocketConfig.url;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Connected to WebSocket server');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'message') {
          const messageType = data.message.startsWith('```') ? 'code' 
            : data.message.includes('Error:') ? 'error' 
            : 'text';

          setMessages((prevMessages) => [
            ...prevMessages,
            {
              message: data.message,
              sender: data.sender,
              timestamp: data.timestamp,
              agentName: data.agentName,
              type: messageType
            }
          ]);
        } else if (data.type === 'typing') {
          setIsTyping(data.isTyping);
        } else if (data.type === 'thinking') {
          setIsThinking(data.isThinking);
        } else if (data.type === 'room_created') {
          setRoomId(data.roomId);
        } else if (data.type === 'human_requested') {
          toast({
            title: 'Human Agent Requested',
            description: 'An agent will join the chat shortly.',
            variant: 'default'
          });
        } else if (data.type === 'human_joined') {
          toast({
            title: 'Human Agent Connected',
            description: `${data.agentName} has joined the chat.`,
            variant: 'default'
          });
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: 'WebSocket Error',
          description: 'Could not connect to the server.',
          variant: 'destructive'
        });
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };

      setSocket(ws);

      return () => {
        ws.close();
      };
    }
  }, [roomId]);

  const sendMessage = (message: string, sender: 'user') => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'message',
        message,
        sender,
        timestamp: new Date().toISOString()
      }));
    } else {
      toast({
        title: 'Connection Error',
        description: 'Unable to send message. Please check your connection.',
        variant: 'destructive'
      });
    }
  };

  const joinRoom = (userName: string, userEmail: string) => {
    const newRoomId = `room_${userName}_${Date.now()}`;
    setRoomId(newRoomId);
  };

  const requestHuman = (userName: string, userEmail: string, issue: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'request_human',
        userName,
        userEmail,
        issue,
        timestamp: new Date().toISOString()
      }));
    }
  };

  return {
    messages,
    setMessages,
    isTyping,
    isThinking,
    roomId,
    socket,
    sendMessage,
    joinRoom,
    requestHuman
  };
};
