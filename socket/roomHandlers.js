export default function roomHandlers(io) {
  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);

      const clients = Array.from(
        io.sockets.adapter.rooms.get(roomId) || []
      );

      console.log("Room:", roomId, "Clients:", clients);

      // When second user joins, start WebRTC
      if (clients.length === 2) {
        io.to(roomId).emit("ready", {
          callerId: clients[0],
        });
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
}
