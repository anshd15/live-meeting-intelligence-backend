const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  socket.on("join-room", roomId => {
    socket.join(roomId);

    const room = io.sockets.adapter.rooms.get(roomId);
    const count = room ? room.size : 0;

    console.log(`Room ${roomId} users: ${count}`);

    if (count === 2) {
      io.to(roomId).emit("ready");
    }

    if (count > 2) {
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
    console.log("Disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
