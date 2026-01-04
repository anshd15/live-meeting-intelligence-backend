const rooms = new Map();

export default function roomHandlers(io) {
  io.on("connection", (socket) => {

    socket.on("join-room", (roomId) => {
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, socket.id);
        socket.emit("host");
      } else {
        socket.to(roomId).emit("request-join", {
          socketId: socket.id,
          user: socket.handshake.auth?.user,
        });
      }

      const clients = Array.from(
        io.sockets.adapter.rooms.get(roomId) || []
      );

      if (clients.length === 2) {
        io.to(roomId).emit("ready", {
          callerId: clients[0],
        });
      }
    });

    socket.on("approve-join", ({ socketId }) => {
      io.to(socketId).emit("join-approved");
    });

    socket.on("reject-join", ({ socketId }) => {
      io.to(socketId).emit("join-rejected");
    });

    socket.on("disconnect", () => {
      for (const [roomId, hostId] of rooms.entries()) {
        if (hostId === socket.id) {
          rooms.delete(roomId);
        }
      }
    });

  });
}
