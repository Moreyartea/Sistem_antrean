import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { layananRoutes } from "./routes/layanan";
import { antreanRoutes } from "./routes/antrean";
import { petugasRoutes } from "./routes/petugas";
import { displayRoutes } from "./routes/display";

const PORT = Number(Bun.env.PORT) || 3000;

const app = new Elysia()
  // Global CORS setup untuk akses dari Vite React frontend
  .use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )

  // Dokumentasi Interaktif Swagger UI / OpenAPI
  .use(
    swagger({
      documentation: {
        info: {
          title: "Sistem Antrean Kampus API",
          version: "1.0.0",
          description:
            "REST API untuk Sistem Antrean Layanan Administrasi Kampus. " +
            "Dibangun dengan Bun, ElysiaJS, Drizzle ORM, dan MySQL.",
        },
        tags: [
          { name: "Layanan", description: "Manajemen jenis layanan & loket antrean" },
          { name: "Antrean", description: "Operasi nomor antrean mahasiswa (Atomic & Real-time)" },
          { name: "Petugas", description: "Autentikasi JWT & aksi operasional loket" },
          { name: "Display", description: "Data tampilan Digital TV & Server-Sent Events (SSE)" },
          { name: "System", description: "Pemeriksaan status server" },
        ],
      },
    })
  )

  // Global Error Handler
  .onError(({ code, error, set }) => {
    console.error(`[API Error - ${code}]:`, error);

    if (code === "VALIDATION") {
      set.status = 400;
      return {
        success: false,
        message: "Data input tidak valid.",
        errors: error.all,
      };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        success: false,
        message: "Endpoint tidak ditemukan.",
      };
    }

    return {
      success: false,
      message: (error as any)?.message || "Terjadi kesalahan internal server.",
    };
  })

  // System Health Check
  .get(
    "/health",
    () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "sistem-antrean-kampus-api",
      runtime: "bun",
      framework: "elysia",
    }),
    {
      detail: {
        summary: "Health Check",
        description: "Mengecek apakah server backend berjalan normal.",
        tags: ["System"],
      },
    }
  )

  // Daftarkan Module Routes
  .use(layananRoutes)
  .use(antreanRoutes)
  .use(petugasRoutes)
  .use(displayRoutes)

  .listen(PORT);

console.log(
  `\n🚀 Sistem Antrean Kampus Backend berjalan di http://localhost:${PORT}\n` +
  `📚 Swagger API Documentation tersedia di http://localhost:${PORT}/swagger\n`
);

export type App = typeof app;
