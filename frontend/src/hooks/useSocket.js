import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Cookies from 'js-cookie';

export const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) return;

    // Initialize socket connection
    socketRef.current = io('http://localhost:8080', {
      auth: {
        token
      }
    });

    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      socketRef.current.emit('user_online');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const joinChat = (chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('join_chat', chatId);
    }
  };

  const sendMessage = (chatId, content, messageType = 'text') => {
    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        chatId,
        content,
        messageType
      });
    }
  };

  const startTyping = (chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('typing_start', chatId);
    }
  };

  const stopTyping = (chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('typing_stop', chatId);
    }
  };

  const startVoiceRecording = (chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('voice_message_start', chatId);
    }
  };

  const stopVoiceRecording = (chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('voice_message_stop', chatId);
    }
  };

  const onNewMessage = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('new_message', callback);
    }
  };

  const onChatUpdated = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('chat_updated', callback);
    }
  };

  const onUserTyping = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user_typing', callback);
    }
  };

  const onUserStoppedTyping = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user_stopped_typing', callback);
    }
  };

  const onUserRecordingVoice = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user_recording_voice', callback);
    }
  };

  const onUserStoppedRecording = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user_stopped_recording', callback);
    }
  };

  const onUserStatusChange = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user_status_change', callback);
    }
  };

  const offAllListeners = () => {
    if (socketRef.current) {
      socketRef.current.off();
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    joinChat,
    sendMessage,
    startTyping,
    stopTyping,
    startVoiceRecording,
    stopVoiceRecording,
    onNewMessage,
    onChatUpdated,
    onUserTyping,
    onUserStoppedTyping,
    onUserRecordingVoice,
    onUserStoppedRecording,
    onUserStatusChange,
    offAllListeners
  };
};