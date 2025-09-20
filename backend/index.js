import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import router from "./routes/route.js";
import voiceNoteRoutes from "./routes/voiceNoteRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { login, register } from "./controllers/authController.js";
import { Database } from "./config/db.js";
import { initializeSocket } from "./socket/socketHandler.js";
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

app.use(cors());
app.use(express.json());

app.post("/register", register);
app.post("/login", login);

app.use("/api/users", router);
app.use("/api/voice-notes", voiceNoteRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/chats", chatRoutes);

Database()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`app running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });
