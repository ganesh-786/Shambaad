import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { getChatMessages } from "../api/chat";
import { useSocket } from "../hooks/useSocket";
import {
  ArrowLeft,
  Send,
  Mic,
  Square,
  Trash2,
  Loader2
} from "lucide-react";
import Cookies from "js-cookie";

const ChatWindowWithSocket = ({ chat, onBack, onUpdateChats }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [recordingUsers, setRecordingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const currentUserId = getCurrentUserId();
  const otherParticipant = chat.participants.find(
    (p) => p._id !== currentUserId
  );

  const {
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
  } = useSocket();

  useEffect(() => {
    fetchMessages();
    joinChat(chat._id);

    // Set up socket event listeners
    onNewMessage(handleNewMessage);
    onChatUpdated(handleChatUpdated);
    onUserTyping(handleUserTyping);
    onUserStoppedTyping(handleUserStoppedTyping);
    onUserRecordingVoice(handleUserRecordingVoice);
    onUserStoppedRecording(handleUserStoppedRecording);
    onUserStatusChange(handleUserStatusChange);

    return () => {
      offAllListeners();
    };
  }, [chat._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function getCurrentUserId() {
    try {
      const token = Cookies.get("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload._id || payload.id || payload.userId;
      }
    } catch (error) {
      console.error("Error getting user ID:", error);
    }
    return null;
  }

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const messagesData = await getChatMessages(chat._id);
      setMessages(messagesData);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Socket event handlers
  const handleNewMessage = ({ message, chatId }) => {
    if (chatId === chat._id) {
      setMessages(prev => [...prev, message]);
    }
  };

  const handleChatUpdated = ({ chatId }) => {
    if (chatId === chat._id) {
      onUpdateChats();
    }
  };

  const handleUserTyping = ({ userId, userEmail }) => {
    if (userId !== currentUserId) {
      setTypingUsers(prev => [...prev.filter(u => u.userId !== userId), { userId, userEmail }]);
    }
  };

  const handleUserStoppedTyping = ({ userId }) => {
    setTypingUsers(prev => prev.filter(u => u.userId !== userId));
  };

  const handleUserRecordingVoice = ({ userId, userEmail }) => {
    if (userId !== currentUserId) {
      setRecordingUsers(prev => [...prev.filter(u => u.userId !== userId), { userId, userEmail }]);
    }
  };

  const handleUserStoppedRecording = ({ userId }) => {
    setRecordingUsers(prev => prev.filter(u => u.userId !== userId));
  };

  const handleUserStatusChange = ({ userId, status }) => {
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      if (status === 'online') {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  const handleSendTextMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !isConnected) return;

    try {
      setSending(true);
      sendMessage(chat._id, newMessage.trim(), 'text');
      setNewMessage("");
      stopTyping(chat._id);
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (e.target.value.trim()) {
      startTyping(chat._id);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(chat._id);
      }, 2000);
    } else {
      stopTyping(chat._id);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header with connection status */}
      <div className="flex items-center p-4 border-b border-gray-200 bg-white">
        <button
          onClick={onBack}
          className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold mr-3 relative">
          {otherParticipant?.username?.charAt(0).toUpperCase()}
          {/* Online indicator */}
          {onlineUsers.has(otherParticipant?._id) && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center">
            <h2 className="font-semibold text-gray-900 mr-2">
              {otherParticipant?.username}
            </h2>
            {!isConnected && (
              <div className="flex items-center text-red-500 text-xs">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Connecting...
              </div>
            )}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <span>{otherParticipant?.email}</span>
            {onlineUsers.has(otherParticipant?._id) && (
              <span className="ml-2 text-green-500">• Online</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender._id === currentUserId;
            return (
              <div
                key={message._id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwn
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold mb-1 ${
                      isOwn ? "text-blue-100" : "text-gray-700"
                    }`}
                  >
                    {message.sender?.username}
                  </p>

                  {message.messageType === "text" ? (
                    <p>{message.content}</p>
                  ) : (
                    <div className="flex items-center">
                      <audio
                        src={message.voiceUrl}
                        controls
                        className="flex-shrink-0 w-40 md:w-60 lg:w-72"
                        style={{ minWidth: "160px" }}
                      />
                      <span className="ml-2 text-xs opacity-75 whitespace-nowrap">
                        {formatTime(message.duration)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-1">
                    <p
                      className={`text-xs ${
                        isOwn ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-xs ml-2">
                  {typingUsers[0].userEmail.split('@')[0]} is typing...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recording indicators */}
        {recordingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 animate-pulse" />
                <span className="text-xs">
                  {recordingUsers[0].userEmail.split('@')[0]} is recording...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form
          onSubmit={handleSendTextMessage}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending || !isConnected}
          />
          <button
            type="button"
            onClick={() => {
              if (isRecording) {
                stopVoiceRecording(chat._id);
                setIsRecording(false);
              } else {
                startVoiceRecording(chat._id);
                setIsRecording(true);
              }
            }}
            className={`p-2 transition-colors ${
              isRecording 
                ? "text-red-500 hover:text-red-600" 
                : "text-gray-500 hover:text-blue-500"
            }`}
            disabled={!isConnected}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || !isConnected}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindowWithSocket;