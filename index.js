require("dotenv").config();
const authRoutes = require("./routes/auth");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const roomHandlers = require("./socket/roomHandlers").default;

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

/* -------------------- ICE CONFIG API -------------------- */
app.get("/api/ice", (req, res) => {
  res.json({
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302"] },
      {
        urls: [
          `turn:${process.env.TURN_IP}:3478?transport=udp`,
          `turn:${process.env.TURN_IP}:3478?transport=tcp`,
        ],
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD,
      },
    ],
  });
});

/* -------------------- SOCKET.IO -------------------- */
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://live-meeting-intelligence.netlify.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 🔥 SINGLE SOURCE OF TRUTH
roomHandlers(io);

/* -------------------- START SERVER -------------------- */
server.listen(PORT, () => {
  console.log(`🚀 Signaling + ICE server running on port ${PORT}`);
});
