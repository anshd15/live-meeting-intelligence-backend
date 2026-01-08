const rooms = new Map();

export default function roomHandlers(io) {
  io.on("connection", (socket) => {
    console.log("✅ Connected:", socket.id);

    /* ---------------- JOIN ROOM ---------------- */
    /**
     * Payload: { roomId, user }
     */
    socket.on("join-room", ({ roomId, user }) => {
      // 🆕 First user becomes host
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          host: socket.id,
          participants: new Set([socket.id]),
          waiting: [],
          ready: new Set(), // 🔑 readiness sync
        });

        socket.join(roomId);
        socket.emit("host");

        console.log(`👑 Host created room ${roomId}:`, socket.id);
        return;
      }

      const room = rooms.get(roomId);

      // 🔁 Host refresh / rejoin
      if (socket.id === room.host) {
        socket.join(roomId);
        room.participants.add(socket.id);
        room.ready.delete(socket.id);

        console.log("🔁 Host rejoined:", socket.id);
        return;
      }

      // 👤 Guest → waiting room
      room.waiting.push({
        socketId: socket.id,
        user,
      });

      io.to(room.host).emit("join-request", {
        socketId: socket.id,
        user,
      });

      console.log(
        `⏳ Join request from ${socket.id} for room ${roomId}`
      );
    });

    /* ---------------- ADMIT USER ---------------- */
    /**
     * Payload: { roomId, socketId }
     */
    socket.on("admit-user", ({ roomId, socketId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      room.participants.add(socketId);
      room.ready.delete(socketId);

      const guestSocket = io.sockets.sockets.get(socketId);
      if (guestSocket) {
        guestSocket.join(roomId);
        guestSocket.emit("admitted");
      }

      console.log("✅ User admitted:", socketId);
    });

    /* ---------------- CLIENT READY ---------------- */
    /**
     * Fired AFTER WebRTC + media is initialized on frontend
     * Payload: { roomId }
     */
    socket.on("client-ready", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      room.ready.add(socket.id);
      console.log("🟢 Client ready:", socket.id);

      // When BOTH host & guest are ready → start WebRTC
      if (room.ready.size === 2) {
        io.to(roomId).emit("ready", {
          callerId: room.host,
        });

        console.log("☎️ WebRTC ready in room:", roomId);
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

    /* ---------------- DISCONNECT ---------------- */

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);

      rooms.forEach((room, roomId) => {
        room.participants.delete(socket.id);
        room.ready.delete(socket.id);
        room.waiting = room.waiting.filter(
          (u) => u.socketId !== socket.id
        );

        // 🧹 If host leaves → destroy room
        if (room.host === socket.id) {
          rooms.delete(roomId);
          console.log("🧹 Room closed:", roomId);
        }
      });
    });
  });
}
