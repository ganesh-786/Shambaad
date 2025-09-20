import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { Chat } from "../models/Chat.js";
import { Message } from "../models/Message.js";

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // Your frontend URL
      methods: ["GET", "POST"]
    }
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User ${socket.userEmail} connected with socket ID: ${socket.id}`);

    // Join user to their personal room for notifications
    socket.join(`user_${socket.userId}`);

    // Join chat rooms
    socket.on("join_chat", async (chatId) => {
      try {
        // Verify user is part of this chat
        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.includes(socket.userId)) {
          socket.join(`chat_${chatId}`);
          console.log(`User ${socket.userEmail} joined chat ${chatId}`);
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const { chatId, content, messageType = "text" } = data;

        // Verify user is part of this chat
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(socket.userId)) {
          socket.emit("error", { message: "Unauthorized" });
          return;
        }

        // Create message in database
        const message = new Message({
          chat: chatId,
          sender: socket.userId,
          messageType,
          content
        });

        await message.save();
        await message.populate("sender", "username email profilePic");

        // Update chat's last message
        chat.lastMessage = message._id;
        chat.lastActivity = new Date();
        await chat.save();

        // Emit to all users in the chat room
        io.to(`chat_${chatId}`).emit("new_message", {
          message,
          chatId
        });

        // Emit to participants for chat list updates
        chat.participants.forEach(participantId => {
          io.to(`user_${participantId}`).emit("chat_updated", {
            chatId,
            lastMessage: message,
            lastActivity: chat.lastActivity
          });
        });

      } catch (error) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing indicators
    socket.on("typing_start", (chatId) => {
      socket.to(`chat_${chatId}`).emit("user_typing", {
        userId: socket.userId,
        userEmail: socket.userEmail
      });
    });

    socket.on("typing_stop", (chatId) => {
      socket.to(`chat_${chatId}`).emit("user_stopped_typing", {
        userId: socket.userId
      });
    });

    // Handle voice message status
    socket.on("voice_message_start", (chatId) => {
      socket.to(`chat_${chatId}`).emit("user_recording_voice", {
        userId: socket.userId,
        userEmail: socket.userEmail
      });
    });

    socket.on("voice_message_stop", (chatId) => {
      socket.to(`chat_${chatId}`).emit("user_stopped_recording", {
        userId: socket.userId
      });
    });

    // Handle user going online/offline
    socket.on("user_online", () => {
      socket.broadcast.emit("user_status_change", {
        userId: socket.userId,
        status: "online"
      });
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.userEmail} disconnected`);
      socket.broadcast.emit("user_status_change", {
        userId: socket.userId,
        status: "offline"
      });
    });
  });

  return io;
};