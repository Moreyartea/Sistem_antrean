import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";

const PORT = Number(Bun.env.PORT) || 3000;

const app = new Elysia()
  .use(
    cors({
      origin: ["http://localhost:5173", "http://localhost:4173"],
      credentials: true,
    })
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: "Sistem Antrean Kampus API",
          version: "1.0.0",
          description:
            "REST API untuk Sistem Antrean Layanan Kampus. " +
            "Dibangun dengan Bun + ElysiaJS + Drizzle ORM + MySQL.",
        },
        tags: [
          { name: "Layanan", description: "Manajemen jenis layanan / loket" },
          { name: "Antrean", description: "Operasi pengambilan & manajemen antrean" },
          { name: "Petugas", description: "Autentikasi & aksi petugas loket" },
          { name: "Display", description: "Data publik untuk layar TV display" },
        ],
      },
    })
  )
  .get(
    "/health",
    () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "sistem-antrean-kampus-api",
    }),
    {
      detail: {
        summary: "Health check",
        description: "Cek apakah server berjalan dengan baik.",
        tags: ["System"],
      },
    }
  )
  .listen(PORT);

console.log(
  `🚀 Server berjalan di http://localhost:${PORT}\n` +
  `📚 Swagger UI tersedia di http://localhost:${PORT}/swagger`
);

export type App = typeof app;
