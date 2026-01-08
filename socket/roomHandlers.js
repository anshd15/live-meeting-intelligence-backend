const rooms = new Map();

export default function roomHandlers(io) {
  io.on("connection", (socket) => {
    console.log("✅ Connected:", socket.id);

    /**
     * join-room
     * Payload: { roomId, user }
     */
    socket.on("join-room", ({ roomId, user }) => {
      // 🆕 First user becomes host
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          host: socket.id,
          participants: new Set([socket.id]),
          waiting: [],
        });

        socket.join(roomId);
        socket.emit("host");

        console.log(`👑 Host created room ${roomId}:`, socket.id);
        return;
      }

      const room = rooms.get(roomId);

      // Host rejoining (refresh case)
      if (socket.id === room.host) {
        socket.join(roomId);
        return;
      }

      // Guest → waiting room
      room.waiting.push({
        socketId: socket.id,
        user,
      });

      io.to(room.host).emit("join-request", {
        socketId: socket.id,
        user,
      });

      console.log(`⏳ Join request from ${socket.id} for room ${roomId}`);
    });

    /**
     * Host admits a user
     */
    socket.on("admit-user", ({ roomId, socketId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      room.participants.add(socketId);
      room.waiting = room.waiting.filter(
        (u) => u.socketId !== socketId
      );

      io.sockets.sockets.get(socketId)?.join(roomId);
      io.to(socketId).emit("admitted");

      // When 2 participants are present → start WebRTC
      if (room.participants.size === 2) {
        io.to(roomId).emit("ready", { callerId: room.host });

        console.log("☎️ Call ready in room", roomId);
      }
    });

    /* ---------------- SIGNALING ---------------- */

    socket.on("offer", ({ offer, roomId }) => {
      socket.to(roomId).emit("offer", { offer });
    });

    socket.on("answer", ({ answer, roomId }) => {
      socket.to(roomId).emit("answer", { answer });
    });

    socket.on("ice-candidate", ({ candidate, roomId }) => {
      socket.to(roomId).emit("ice-candidate", { candidate });
    });

    /* ---------------- CLEANUP ---------------- */

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);

      rooms.forEach((room, roomId) => {
        room.participants.delete(socket.id);
        room.waiting = room.waiting.filter(
          (u) => u.socketId !== socket.id
        );

        // If host leaves → destroy room
        if (room.host === socket.id) {
          rooms.delete(roomId);
          console.log("🧹 Room closed:", roomId);
        }
      });
    });
  });
}
