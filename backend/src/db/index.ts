import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const DATABASE_URL = Bun.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL tidak ditemukan di environment variables. " +
    "Pastikan file .env sudah dibuat dan diisi dengan benar."
  );
}

/**
 * MySQL connection pool.
 * Pool digunakan agar koneksi tidak dibuka/tutup berulang kali
 * untuk setiap request, meningkatkan performa secara signifikan.
 */
const pool = mysql.createPool({
  uri: DATABASE_URL,

  // Timezone Asia/Jakarta agar semua TIMESTAMP tersimpan & terbaca dalam WIB
  timezone: "+07:00",

  // Jumlah maksimum koneksi simultan dalam pool
  connectionLimit: 10,

  // Aktifkan named placeholders untuk keamanan query
  namedPlaceholders: true,
});

/**
 * Instance Drizzle ORM yang siap dipakai di seluruh aplikasi.
 *
 * Contoh penggunaan:
 * ```ts
 * import { db } from "./db";
 * import { layanan } from "./schema";
 *
 * const semuaLayanan = await db.select().from(layanan);
 * ```
 *
 * Untuk transaksi atomik:
 * ```ts
 * await db.transaction(async (tx) => {
 *   const [baris] = await tx.select().from(layanan).where(...).for("update");
 *   await tx.update(layanan).set({ nomorTerakhir: baris.nomorTerakhir + 1 })...;
 * });
 * ```
 */
export const db = drizzle(pool, { schema, mode: "default" });

export { pool };
