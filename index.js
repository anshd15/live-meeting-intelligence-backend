require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors());
app.use(express.json());

/* -------------------- ICE CONFIG API -------------------- */
/**
 * Frontend fetches ICE servers from here
 * TURN credentials NEVER go to frontend codebase
 */
app.get("/api/ice", (req, res) => {
  res.json({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: process.env.TURN_URL,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD,
      },
    ],
  });
});

/* -------------------- SOCKET.IO -------------------- */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ Connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    const clients = Array.from(
      io.sockets.adapter.rooms.get(roomId) || []
    );

    console.log("📦 Room:", roomId, "Clients:", clients);

    // Only 2 users per room
    if (clients.length === 2) {
      io.to(roomId).emit("ready", { callerId: clients[0] });
      console.log("☎️ Caller:", clients[0]);
    }

    if (clients.length > 2) {
      socket.emit("room-full");
      socket.leave(roomId);
    }
  });

  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer });
  });

  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
  });
});

/* -------------------- START SERVER -------------------- */
server.listen(PORT, () => {
  console.log(`🚀 Signaling + ICE server running on port ${PORT}`);
});
