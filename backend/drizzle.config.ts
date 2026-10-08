import { defineConfig } from "drizzle-kit";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL tidak ditemukan di environment variables.");
}

export default defineConfig({
  // Lokasi file schema
  schema: "./src/db/schema.ts",

  // Folder output untuk file migrasi SQL yang di-generate
  out: "./src/db/migrations",

  // Driver database yang digunakan
  dialect: "mysql",

  dbCredentials: {
    url: DATABASE_URL,
  },

  // Aktifkan verbose logging saat generate/migrate
  verbose: true,

  // Mode strict: Drizzle akan error jika ada perubahan destruktif
  // (misal: drop kolom). Lebih aman untuk development.
  strict: true,
});
