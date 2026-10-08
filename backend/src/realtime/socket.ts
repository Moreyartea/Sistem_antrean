import { Server as Engine } from "@socket.io/bun-engine";
import { Server as SocketIOServer } from "socket.io";
import { queueEventBus, QueueEventPayload } from "../utils/eventBus";

export const io = new SocketIOServer({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

export const engine = new Engine({
  path: "/socket.io/",
});

io.bind(engine);

io.on("connection", (socket) => {
  console.log(`⚡ [Socket.io] Client connected: ${socket.id}`);

  // Kirim konfirmasi handshake
  socket.emit("connected", {
    message: "Terhubung ke Socket.io Sistem Antrean Kampus",
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  });

  socket.on("disconnect", (reason) => {
    console.log(`🔌 [Socket.io] Client disconnected: ${socket.id} (${reason})`);
  });
});

// Bridge EventEmitter internal backend ke Socket.io broadcaster
queueEventBus.on("queue:updated", (payload: QueueEventPayload) => {
  console.log(`📡 [Socket.io Broadcast] Event "${payload.type}" untuk tiket ${payload.nomorDisplay || payload.bookingCode}`);

  // Broadcast event generik ke semua client (TV Publik, Dashboard Petugas, Mahasiswa)
  io.emit("queue:updated", payload);

  // Broadcast event spesifik untuk kemudahan listener
  if (payload.type === "BARU") {
    io.emit("antrean:baru", payload);
  } else if (payload.type === "DIPANGGIL" || payload.type === "DIPANGGIL_ULANG") {
    io.emit("antrean:dipanggil", payload);
  } else if (payload.type === "DILAYANI") {
    io.emit("antrean:dilayani", payload);
  } else if (payload.type === "SELESAI") {
    io.emit("antrean:selesai", payload);
  } else if (payload.type === "DILEWATI") {
    io.emit("antrean:dilewati", payload);
  } else if (payload.type === "DIBATALKAN") {
    io.emit("antrean:dibatalkan", payload);
  }
});
